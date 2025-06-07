/*
 * app.js
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
import riseSCORMBridge from './riseSCORMBridge.js';

// store latency (time learner takes inside interaction)
let interactionStartTime = null;

// wait for global config to be ready
async function waitForConfig() {
  while (typeof window.riseSCORMBridgeConfig === "undefined") {
    await new Promise(res => setTimeout(res, 10));
  }
}

// tests to see if a string contains html
function isHTML(str) {
  var doc = new DOMParser().parseFromString(str, "text/html");
  return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
}

// string formatter for optional media
function formatMedia(url) {
  const lc = url.toLowerCase().trim();
  if (!lc.length) return false;
  if (lc.endsWith('.jpg') || lc.endsWith('.jpeg') || lc.endsWith('.gif') || lc.endsWith('.png') || lc.endsWith('.webp')) { // images
    return `<img alt="" src="${url}" />`;
  } else if (lc.endsWith('.mp3') || lc.endsWith('.wav')) { // audio
    return `<audio src="${url}" controls preload="none"></audio>`;
  } else if (lc.endsWith('.mp4') || lc.endsWith('.ogg') || lc.endsWith('.mov') || lc.endsWith('.webm')) { // video
    return `<video src="${url}" controls preload="none"></video>`;
  } else if (isHTML(url)) { // embeds or raw html
    return url;
  } else { // not sure
    return `<iframe allowfullscreen="true" src="${url}"></iframe>`;
  }
}


// string formatter for scorm latency
function formatLatency(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `PT${h}H${m}M${s}S`;
}

async function init() {
  await waitForConfig();
  const { token, serverBase, question, mediaAbove, mediaBelow, key, feedback, required } = window.riseSCORMBridgeConfig;

  const questionNode = document.getElementById('question');
  const feedbackNode = document.getElementById('feedback');
  const textArea = document.getElementById("notes");  

  if (token) riseSCORMBridge.setBearerToken(token);
  if (serverBase) riseSCORMBridge.updateServerBase(serverBase);
  if (question) questionNode.innerHTML = question;
  if (mediaAbove) questionNode.insertAdjacentHTML('beforebegin', formatMedia(mediaAbove));
  if (mediaBelow) questionNode.insertAdjacentHTML('afterend', formatMedia(mediaBelow));

  // const interactionId = riseSCORMBridge.resolveInteractionId();

  const btn = document.getElementById("save");
  btn.dataset.value = btn.textContent;

  // note when user starts interacting
  textArea.addEventListener("focus", () => {
    if (!interactionStartTime) {
      interactionStartTime = new Date();
    }
  });

  // store current value
  btn.addEventListener("click", async () => {
    const val = textArea.value;
    if (!val.length) return;
    const r = ~~required;
    if (val.length > 0 && val.length <= r) {
      btn.textContent = '⚠️ Needs more text';
      setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
      return;
    }
    const latency = interactionStartTime
      ? formatLatency(new Date() - interactionStartTime)
      : "PT0H0M0S";

    const saved = await riseSCORMBridge.saveTextContent(val, key, latency);
    btn.textContent = (saved) ? '👍 Saved' : '❌ Not saved';
    setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
    if (saved && feedback) feedbackNode.innerHTML = feedback;
    if (saved) window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});

  });

  // restore previously saved value
  const html = await riseSCORMBridge.loadTextContent(key);
  if (html) {
    const text = html.replace(/<p>(.*?)<\/p>/g, "$1\n").trim();
    textArea.value = text;
    if (feedback) feedbackNode.innerHTML = feedback;
    window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});
  }
}

// set up
init();