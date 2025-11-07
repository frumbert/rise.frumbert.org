/*
 * app.js
 * Drag & Drop onto Image for Scorm
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

// store latency (time learner takes inside interaction)
let interactionStartTime = null;

// wait for global config to be ready
async function waitForConfig() {
  while (typeof window.riseSCORMBridgeConfig === "undefined") {
    await new Promise(res => setTimeout(res, 10));
  }
}

// helper to reduce two numbers to their greatest common divisor 
function getReducedRatio(a, b) {
  function gcd(x, y) {
    return y === 0 ? x : gcd(y, x % y);
  }
  const divisor = gcd(a, b);
  return `${a / divisor} / ${b / divisor}`;
}
// Helper to convert px to % relative to container
function pxToPercent(val, total) {
  if (typeof val === 'number' || (/^\d+$/.test(val))) {
    return (parseFloat(val) / total * 100) + '%';
  }
  if (/^\d+px$/.test(val)) {
    return (parseFloat(val) / total * 100) + '%';
  }
  return val; // already a percentage or other CSS value
}

async function init() {
  await waitForConfig();
  const { token, serverBase, question, image, mediaAbove, mediaBelow, key, feedback, distractors } = window.riseSCORMBridgeConfig;

  const questionNode = document.getElementById('question');
  const feedbackNode = document.getElementById('feedback');
  const targetContainer = document.querySelector('article');
  const sourceContainer = document.querySelector('aside');

  const correct = [];
  if (!distractors) return alert('error in data, cannot continue');

  if (token) riseSCORMBridge.setBearerToken(token);
  if (serverBase) riseSCORMBridge.updateServerBase(serverBase);
  if (question) questionNode.innerHTML = question;
  if (mediaAbove) questionNode.insertAdjacentHTML('beforebegin', utils.formatMedia(mediaAbove));
  if (mediaBelow) questionNode.insertAdjacentHTML('afterend', utils.formatMedia(mediaBelow));
  if (image) {
    const img = new Image();
    img.onload = () => {
      targetContainer.style.setProperty('--image', `url(${img.src})`);
      targetContainer.style.setProperty('--ratio', getReducedRatio(img.naturalWidth, img.naturalHeight));
      renderDistractors({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = image;
  } else {
    renderDistractors(targetContainer.getBoundingClientRect());
  }

  const btn = document.getElementById("save");
  btn.dataset.value = btn.textContent;

  // note when user starts interacting
  sourceContainer.addEventListener("focusin", (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) { // focus came from outside the container, https://danburzo.ro/focus-within/
      if (!interactionStartTime) {
        interactionStartTime = new Date();
      }
    }
  });

  // store current value
  btn.addEventListener("click", async () => {

    if (targetContainer.querySelectorAll(`.drop[data-answer]`).length === 0) {
      btn.textContent = `⚠️ Please drag an answer`;
      setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
      return;
    }
    const latency = interactionStartTime
      ? utils.formatLatency(new Date() - interactionStartTime)
      : "PT0H0M0S";
    const answers = [...targetContainer.querySelectorAll(`.drop`)].map((node)=>node.dataset.answer===node.dataset.question?node.dataset.answer:'');

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

  function renderDistractors(dimensions) {
    const dropTargetSrc = document.querySelector('.drop');
    const dragTargetSrc = document.querySelector('.drag');
    const promises = [];
    distractors.items.forEach((v, i) => {
      const drop = dropTargetSrc.cloneNode(false);
      if (v.target.css) drop.classList.add(v.target.css);
      drop.style.top = pxToPercent(v.target.y, dimensions.height);
      drop.style.left = pxToPercent(v.target.x, dimensions.width);
      drop.style.width = pxToPercent(v.target.w, dimensions.width);
      drop.style.height = pxToPercent(v.target.h, dimensions.height);
      targetContainer.appendChild(drop);
      const drag = dragTargetSrc.cloneNode(true);
      const value = String.fromCharCode(97 + i); // [a,b,c, etc]
      drag.querySelector('input').value = value;
      drop.dataset.question = value;
      const content = v[value];
      let html = "";
      if (content.mediaAbove) html += utils.formatMedia(content.mediaAbove);
      if (typeof content === "object" && "text" in content && content.text) {
        html += content.text.toString();
      } else if (typeof content === "string") {
        html += content;
      }
      if (content.mediaBelow) html += utils.formatMedia(content.mediaBelow);
      drag.querySelector('span:not(.control)').innerHTML = html;
      sourceContainer.appendChild(drag);
      correct.push(value);
      drag.querySelector('span:not(.control)').querySelectorAll('img').forEach(img => {
        if (!img.complete) {
          promises.push(new Promise(resolve => {
            img.onload = function() {
              img.height = img.naturalHeight;
              img.width = img.naturalWidth;
              resolve();
            }
            img.onerror = resolve;
          }));
        }
      });

    });
    dropTargetSrc.remove();
    dragTargetSrc.remove();
    if (distractors.order==="random") utils.shuffleChildren(sourceContainer);
    riseSCORMBridge.setCorrectValues(correct);
    if (promises.length > 0) {
      Promise.all(promises).then(() => makeDraggable());
    } else {
      makeDraggable();
    }

  }

  function makeDraggable() {
    const drops = targetContainer.querySelectorAll('.drop');
    let h = 0; let w = 0;
    sourceContainer.querySelectorAll('.drag').forEach(label => {
      label.style.top = `${h}px`;
      const bb = label.getBoundingClientRect();
      h+= bb.height + 1;
      w = Math.max(w,bb.width);
      const pd = new PlainDraggable(label, {
        containment: sourceContainer.parentNode,
        snap: { targets: [...drops], center: true },
        autoScroll: true,
        leftTop: true
      });
      pd.onDragStart = () => { label.style.position = 'absolute'; }
      pd.onDrag = () => { targetContainer.classList.add('dropzones'); }
      pd.onDragEnd = function() {
        targetContainer.classList.remove('dropzones');
        drops.forEach(drop => {
          const labelRect = label.getBoundingClientRect();
          const dropRect = drop.getBoundingClientRect();
          if ( /* collision detection */
            labelRect.left < dropRect.right &&
            labelRect.right > dropRect.left &&
            labelRect.top < dropRect.bottom &&
            labelRect.bottom > dropRect.top
          ) {
            drop.dataset.answer = label.querySelector('input').value; // last dropped only
          }
        });
      };
    });
    sourceContainer.style.width = `${w}px`;
  }

}

// set up
init();