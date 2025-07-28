/*
 * utils.js
 * Routines that are common to all interaction types
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

function remToPx(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
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

// randomise the order of the nodes
function shuffleChildren(container) {
  [...container.children]
    .sort(() => Math.random() - 0.5)
    .forEach(child => container.appendChild(child));
}

// string formatter for scorm latency
function formatLatency(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `PT${h}H${m}M${s}S`;
}

// renders the distractors. the format will be interaction specific
function renderDistractors(options = {}) {
  const container = document.querySelector('section');
  const source = container.querySelector('label');
  const template = source.cloneNode(true);
  source.remove();
  options.items?.forEach(obj => {
    const [key, content] = Object.entries(obj)[0];
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
    container.appendChild(instance);
  });
  if (options.order==="random") {
    shuffleChildren(container);
  }
  if (options.label && document.querySelector('legend')) {
    document.querySelector('legend').innerHTML = options.label;
  }
}

// feedback can be feedback:"" or feedback:{correct:"",incorrect:"",neutral:""}
function formatFeedback(element, obj, status) {
  let value = "";
  if (obj.neutral && status === "neutral") {
    value = obj.neutral;
  } else if (obj.correct && status === "correct") {
    value = obj.correct;
  } else if (obj.incorrect && status === "incorrect") {
    value = obj.incorrect;
  }
  if (value === "" && typeof obj === 'string') {
    value = obj;
  }
  element.innerHTML = value;
  element.classList.add(status);
}

function wrapperPosition(lineWrapper) {
  // lineWrapper.style.transform = 'none';
  const rect = lineWrapper.getBoundingClientRect();
  lineWrapper.style.transform = `translate(
      ${-rect.left}px, ${-rect.top}px)`;
}

function enough(option, value) {
  if (!option) return true;
  const count = Math.abs(~~option);
  if (count===0) return true;
  const str = option.toString();
  const type = str.indexOf('w') !== -1 ? 'words' : str.indexOf('l') !== -1 ? 'lines' : 'characters';
  let instances = value.length;
  switch (type) {
    case 'words':
    instances = value.split(/\s/).length;
    break;
    case 'lines':
    instances = value.split(/\n/).length;
    break;
  }
  return (len>=instances);
}

function textareaStats(el) { // using same split logic as 'enough()'
  const single = el.value.trim();
  const count = single.length;
  const words = single.split(/\s/).length;
  const lines = single.split(/\n/).length;
  return `${lines} lines, ${words} words, ${count} characters.`
  .replace(/(\b1)\s(\w+)s\b/g, '$1 $2');
}

function htmlToFragment(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

export default {
  formatMedia,
  formatFeedback,
  shuffleChildren,
  formatLatency,
  renderDistractors,
  remToPx,
  wrapperPosition,
  enough,
  textareaStats,
  htmlToFragment
};