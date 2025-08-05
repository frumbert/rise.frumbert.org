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
let changed = false;

// wait for global config to be ready
async function waitForConfig() {
  while (typeof window.riseSCORMBridgeConfig === "undefined") {
    await new Promise(res => setTimeout(res, 10));
  }
}

function renderLists(values = []) {
  const container = document.querySelector('section');
  const source = container.querySelector('label');
  const template = source.cloneNode(true);
  source.remove();
  const tempContainer = new DocumentFragment();
  values.forEach(obj => {
    const fieldset = document.createElement('fieldset'); fieldset.classList.add('boxes');
    const legend = document.createElement('legend');
    legend.innerHTML = obj.label;
    fieldset.appendChild(legend);
    obj.items.forEach(item => {
      const [key, content] = Object.entries(item)[0];
      const instance = template.cloneNode(true);
      const span = instance.querySelector("span:last-child");
      instance.querySelector("input").value = key;
      let html = "";
      if (content.mediaAbove) html += formatMedia(content.mediaAbove);
      if (typeof content === "object" && "text" in content && content.text) {
        html += content.text.toString();
      } else if (typeof content === "string") {
        html += content;
      }
      if (content.mediaBelow) html += formatMedia(content.mediaBelow);
      span.innerHTML = html;
      tempContainer.appendChild(instance);
    });    
    container.appendChild(fieldset);
  });
  utils.shuffleChildren(tempContainer);
  const fieldsets = Array.from(container.querySelectorAll('fieldset'));
  const nodes = Array.from(tempContainer.childNodes);

  nodes.forEach((node, i) => {
    const targetFieldset = fieldsets[i % fieldsets.length];
    targetFieldset.appendChild(node);
  });
}

// the correct answer is effectively the keys in order, grouped by set, as a string
function calculateCorrectValue(values = []) {
  const answer = [];
  values.forEach(obj=>{
    answer.push(obj.items.map(item=>Object.keys(item)[0]));
  });
  return answer;
}

function calculateUserAnswer(container) {
  const answer = [];
  Array.from(container.querySelectorAll('fieldset')).forEach(fieldset=>{
    answer.push(Array.from(fieldset.querySelectorAll(`input[name='answer']`)).map(input=>input.value));
  });
  return answer;
}

async function init() {
  await waitForConfig();
  const { token, serverBase, question, mediaAbove, mediaBelow, key, feedback, lists, correct } = window.riseSCORMBridgeConfig;

  const questionNode = document.getElementById('question');
  const feedbackNode = document.getElementById('feedback');
  const containerElement = document.querySelector("section");  

  if (token) riseSCORMBridge.setBearerToken(token);
  if (serverBase) riseSCORMBridge.updateServerBase(serverBase);
  if (question) questionNode.innerHTML = question;
  if (mediaAbove) questionNode.insertAdjacentHTML('beforebegin', utils.formatMedia(mediaAbove));
  if (mediaBelow) questionNode.insertAdjacentHTML('afterend', utils.formatMedia(mediaBelow));
  if (lists) renderLists(lists);
  if (correct) {
    riseSCORMBridge.setCorrectValues(correct);
  } else {
    riseSCORMBridge.setCorrectValues(calculateCorrectValue(lists));
  } 

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
  Array.from(containerElement.querySelectorAll('fieldset')).forEach(list => {
    new Sortable(list, {
      animation: 150,
      group: 'shared',
      draggable: 'label',
      onEnd: (evt) => { changed = true; }
    });
  })

  // store current value
  btn.addEventListener("click", async () => {

    if (!changed) {
      btn.textContent = `⚠️ Please drag an answer`;
      setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
      return;
    }
    const latency = interactionStartTime
      ? utils.formatLatency(new Date() - interactionStartTime)
      : "PT0H0M0S";
    const answers = calculateUserAnswer(containerElement);

    const saved = await riseSCORMBridge.saveInteraction('sort-lists', answers, key, latency);
    btn.textContent = (saved) ? '👍 Saved' : '❌ Not saved';
    setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
    const status = riseSCORMBridge.getLastResult();
    if (saved && feedback) utils.formatFeedback(feedbackNode, feedback, status);
    if (saved) window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});

  });

  // restore previously saved value - move dragged fields back to where they were
  const savedValue = await riseSCORMBridge.loadInteraction(key);
  if (savedValue) {
    const fieldsets = containerElement.querySelectorAll('fieldset');
    [...savedValue.replace(/^\[|\]$/g,'').split('],[')].forEach((val,index) => {
      // console.log('restore', val, index);
      for (let key of val.split(',')) {
        const field = document.querySelector(`input[name='answer'][value='${key}']`).closest('label');
        if (field) fieldsets[index].appendChild(field); // append moves the node in the order specified
      }
    });
    window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});
  }
}

// set up
init();