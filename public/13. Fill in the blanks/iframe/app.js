/*
 * app.js
 * Long Text Entry for Scorm 1.2 (and 2004, which can do it anyway)
 *
 * Copyright (c) 2025 frumbert
 * Licensed under the MIT license.
 *
 * The MIT License (MIT)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// load routines
import {default as riseSCORMBridge} from 'https://esm.sh/gh/frumbert/rise-esm@v1.1.3';
import utils from 'https://esm.sh/gh/frumbert/rise-esm@v1.1.3/utils.js';
import Sortable from 'https://esm.sh/sortablejs';

// store latency (time learner takes inside interaction)
let interactionStartTime = null;

// wait for global config to be ready
async function waitForConfig() {
  while (typeof window.riseSCORMBridgeConfig === "undefined") {
    await new Promise(res => setTimeout(res, 10));
  }
}

// someone will find an exception to the rule; line breaks, punctuation, anything else after -- or __ may break this
function formatFillIn(text) {
  return text.replace(/(^|\s)([-_]{2,})(?=\s|$|[.,!?;:])/g, ` <span class='drop'></span> `).replace(/\n/g,'<br/>');
}

async function init() {
  await waitForConfig();
  const { token, serverBase, question, mediaAbove, mediaBelow, key, feedback, distractors, correct } = window.riseSCORMBridgeConfig;

  const questionNode = document.getElementById('question');
  const feedbackNode = document.getElementById('feedback');
  const containerElement = document.querySelector("section");  

  if (token) riseSCORMBridge.setBearerToken(token);
  if (serverBase) riseSCORMBridge.updateServerBase(serverBase);
  if (question) questionNode.innerHTML = formatFillIn(question);
  if (mediaAbove) questionNode.insertAdjacentHTML('beforebegin', utils.formatMedia(mediaAbove));
  if (mediaBelow) questionNode.insertAdjacentHTML('afterend', utils.formatMedia(mediaBelow));
  if (distractors) utils.renderDistractors(distractors);
  if (correct) riseSCORMBridge.setCorrectValues(correct);

  const btn = document.getElementById("save");
  btn.dataset.value = btn.textContent;

  // note when user starts interacting
  containerElement.addEventListener("focusin", (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) { // focus came from outside the container, https://danburzo.ro/focus-within/
      if (!interactionStartTime) {
        interactionStartTime = new Date();
      }
    }
  });

  // sortablejs handles the drag and drop - one for the question, one for the source
  Array.from(questionNode.querySelectorAll('.drop')).forEach(el => {
    new Sortable(el, {
      group: 'words',
      animation: 150,
      swap: true
    });
  });
  new Sortable(containerElement, {
    animation: 150,
    group: { name: 'words', put: true },
  });

  // store current value
  btn.addEventListener("click", async () => {

    if (questionNode.querySelectorAll(`input[name='answer']`).length === 0) {
      btn.textContent = `⚠️ Please drag an answer`;
      setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
      return;
    }
    const latency = interactionStartTime
      ? utils.formatLatency(new Date() - interactionStartTime)
      : "PT0H0M0S";
    const answers = [...questionNode.querySelectorAll(`input[name='answer']`)].map((input)=>input.value);

    const saved = await riseSCORMBridge.saveInteraction('sequencing', answers, key, latency);
    btn.textContent = (saved) ? '👍 Saved' : '❌ Not saved';
    setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
    const status = riseSCORMBridge.getLastResult();
    if (saved && feedback) utils.formatFeedback(feedbackNode, feedback, status);
    if (saved) window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});

  });

  // restore previously saved value - move dragged fields back to where they were
  const savedValue = await riseSCORMBridge.loadInteraction(key);
  if (savedValue) {
    const questionFields = questionNode.querySelectorAll('.drop');
    [...savedValue.split(',')].forEach((val,index) => {
      const field = document.querySelector(`input[name='answer'][value='${val}']`).closest('label'); 
      if (field) questionFields[index].appendChild(field);
    });
    window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});
  }
}

// set up
init();