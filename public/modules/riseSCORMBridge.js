/*
 * riseSCORMBridge.js
 * routines for persisting values 
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

import scormAPI from 'https://rise.frumbert.test/modules/scormFallbackAPI.js';

let token = null;
let SERVER_BASE = "https://rise.frumbert.org";
let DATA_ENDPOINT = `${SERVER_BASE}/generate`;
let VIEW_ENDPOINT = `${SERVER_BASE}/view`;
let questionText = "";
let correctResponses = [];
let riseWindow = null;
let lastResult = "neutral";

// find where Rise keeps itself
function findRise(win = window) {
    let frameElement = win;
    let attempts = 0;
    while (!riseWindow && attempts < 15) {
        attempts++;
        if (frameElement.hasOwnProperty("__courseDataReady")) {
            riseWindow = frameElement;
            return true;
        } else if (frameElement.parent === frameElement) {
            break;
        }
        frameElement = frameElement.parent;
    }
    return false;
}
 
function applyGlobalConfig() {
  const globalCfg = window.riseSCORMBridgeConfig || {};
  if (globalCfg.token) token = globalCfg.token;
  if (globalCfg.serverBase) {
    updateServerBase(globalCfg.serverBase);
  }
  if (globalCfg.question) {
    questionText = globalCfg.question;
  }
}

// sets the bearer token used to authorize scorm 1.2 data persistence
function setBearerToken(t) {
  token = t;
}

// globalConfig can specify a different server
function updateServerBase(url) {
  SERVER_BASE = url;
  DATA_ENDPOINT = `${SERVER_BASE}/generate`;
  VIEW_ENDPOINT = `${SERVER_BASE}/view`;
}

function getLocationId() {
  return decodeURIComponent(location.href.toLowerCase()).replace(/[^\w]/g, "");
}

// make up an id based on the url (one unique per page)
// todo: figure out the rise block id and use that
function getBlockScopedInteractionId(baseId = "notes") {
  let locationId = getLocationId();
  const suffix = locationId.slice(0,240 - baseId.length);
  return `${baseId}-${suffix}`;
}

// denote an array of the correct responses for this interaction
function setCorrectValues(values = '') {
  if (values.indexOf(',')!==-1) { // if a,b,c instead of ['a','b','c']
    values = values.split(',');
  }
  correctResponses = [...values];
}
function setCorrectResponse(strValue) {
  correctResponses = strValue;
}

// The quick brown fox -> TheQuickBrownFox
function toPascalCase(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // remove punctuation
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// interactionId might be explicitly set. Or calculated from the question text. Or looked up
function resolveInteractionId() {
  const cfg = window.riseSCORMBridgeConfig || {};
  if (cfg.interactionId) {
    return cfg.interactionId;
  }
  if (questionText.length) {
    const span = document.createElement('span');
    span.innerHTML = questionText; 
    const text = toPascalCase(span.textContent).slice(0, 255);
    return text;
  }
  return getBlockScopedInteractionId("notes");
}

// compare two arrays to ensure all values match
function arraysEqualUnordered(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}

// compare two arrays to ensure all values and order matches
function arraysEqualOrdered(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// find where rise is running and grab the courseData json, and get the course.id
async function getCourseId() {
  findRise(); // sets riseWindow variable
  const ready = riseWindow?.__courseDataReady?.(); // from Rise's index.html, promise returns the decoded course data
  if (ready && typeof ready.then === "function") {
    const data = await ready;
    return data?.course?.id || data?.__zone_symbol__value?.course?.id || getLocationId();
  }
  return getLocationId();
}

// saves the content and returns its public url
function getInteractionUrl(courseId, learnerId, interactionId, key = "", value_to_save) {
  key = key ?? ""; // coalesce undefined/null to empty
  return fetch(DATA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      course: courseId,
      learner: learnerId,
      interaction: interactionId,
      key,
      content: value_to_save,
      question: questionText
    })
  })
    .then(res => res.json())
    .then(data => data.url || null);
}

function getLastResult() {
  return lastResult;
}

/* ----------------------- main async functions -------------------------*/

async function calculateResult(type, result = "neutral", value, courseId, learnerId, interactionId, key) {
  let valueToSave = "";
  console.info(type,result,value,courseId,learnerId,interactionId,key);
  switch (type) {
    case "true-false": // binary
      valueToSave = (['t','f','0','1'].indexOf(value[0])!==-1) ? value[0] : 'f';
      result = (valueToSave === correctResponses[0]) ? "correct" : "incorrect";
      break;
    case "choice": // single/multiple choice
      valueToSave = value;
      result = arraysEqualUnordered(value, correctResponses) ? "correct" : "incorrect";
      // console.log('choice', value, correctResponses, result);
      break;
    case "likert":
    case "fill-in":
      valueToSave = value[0];
      result = "neutral";
      break;
    case "matching":
      valueToSave = value;
      result = arraysEqualOrdered(value, correctResponses) ? "correct" : "incorrect";
      break;
    case "performance": // 250 bytes max in a specific format
    case "sequencing":
      valueToSave = value;
      result = arraysEqualUnordered(value, correctResponses) ? "correct" : "incorrect";
      break; 
    case "numeric": // numbers, but the value arrays will be equal anyway
      result = arraysEqualUnordered(value, correctResponses) ? "correct" : "incorrect";
      break; 

    // virtual types that proxy an internal type whose answers need a little more coaxing
    case "sorting": // reorder-list - a matching type with an ordered list
      type = "matching";
      valueToSave = value;
      result = arraysEqualOrdered(value, correctResponses) ? "correct" : "incorrect";
      break;
    case "sort-lists":
      type = "performance";
      let allOk = true;
      const userArray = [];
      for (let i=0;i<value.length;i++) {
        allOk &= arraysEqualUnordered(value[i], correctResponses[i]);
        userArray.push('['+value[i].join()+']');
      }
      valueToSave = userArray.join();
      result = allOk ? "correct": "incorrect";
      break;
    case "connect":
      type = "sequencing";
      valueToSave = value.join(',').replace(/[\'\"]/g,'');
      result = arraysEqualUnordered(value, correctResponses) ? "correct" : "incorrect";
      break;

    // 2004-only types
    case "long-fill-in":
      if (scormAPI.getVersion() === "2004") {
        valueToSave = value.join('');
      } else {
        type = "fill-in";
        valueToSave = await getInteractionUrl(courseId, learnerId, interactionId, key, value.join(''));
      }
      break;

    case "other":
  }
  lastResult = result; // public status - incorrect | neutral | correct
  return {
    valueToSave,
    result,
    scormtype: type
  }
}

// gets the content without knowing its public url
async function getInteractionData(courseId, learnerId, interactionId, key = "") {
  key = key ?? "";
  const res = await fetch(VIEW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      course: courseId,
      learner: learnerId,
      interaction: interactionId,
      key
    })
  });
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    return data;
  } else if (contentType.includes('text/html')) {
    const html = await res.text();
    return mainContent(html, true);
  } else {
    return await res.text(); // default to text
  }
}

// the main routine for saving all types of scorm interactions
async function saveInteraction(type, value, key = "", latency = "PT0H0M0S") {
  key = key ?? "";
  value = [...value]; // always an array, even if only one item
  applyGlobalConfig();

  scormAPI.initialize();
  const courseId = await getCourseId();
  const learnerId = scormAPI.getLearnerId();

  if (!courseId || !learnerId) {
    console.warn('saveInteraction bailed early', courseId, learnerId);
    return false;
  }

  const interactionId = resolveInteractionId();
  const idx = scormAPI.findInteractionIndexById(interactionId);
  const prefix = `cmi.interactions.${idx}`;

  // 2004 “correct”, “incorrect”, “unanticipated”, “neutral”
  // 1.2  “correct”, “wrong”,     “unanticipated”, “neutral”, “x.x [CMIDecimal]”
  // definitions: https://lms.technology/for/scorm/2004/4th_edition/standards/SCORM_2004_4ED_v1_1_RTE_20090814_files/part112.htm
  let {valueToSave, result, scormtype} = await calculateResult(type, "neutral", value, courseId, learnerId, interactionId, key);
  if (scormAPI.getVersion() !== "2004" && result === "incorrect") result = "wrong";

  scormAPI.set(`${prefix}.id`, interactionId);
  scormAPI.set(`${prefix}.type`, scormtype);
  scormAPI.set(`${prefix}.result`, result);
  if (scormAPI.getVersion() === "2004") {
    scormAPI.set(`${prefix}.timestamp`, new Date().toISOString());
    scormAPI.set(`${prefix}.learner_response`, valueToSave);
    scormAPI.set(`${prefix}.description`, questionText.slice(0, 250));
  } else {
    scormAPI.set(`${prefix}.student_response`, valueToSave);
    scormAPI.set(`${prefix}.time`, new Date().toISOString());
    scormAPI.set(`${prefix}.latency`, latency);
  }
  return scormAPI.commit();

}

async function loadInteraction(key = "") {
  key = key ?? "";
  applyGlobalConfig();

  scormAPI.initialize();
  const courseId = await getCourseId();
  const learnerId = scormAPI.getLearnerId();
  if (!courseId || !learnerId) return false;

  const interactionId = resolveInteractionId();
  const idx = scormAPI.findInteractionIndexById(interactionId);
  const prefix = `cmi.interactions.${idx}`;

  if (scormAPI.getVersion() === "2004") {
    return scormAPI.get(`${prefix}.learner_response`);
  } else if (scormAPI.getVersion() === "storage") {
    let result = scormAPI.get(`${prefix}.student_response`);
    if (result.indexOf(SERVER_BASE)!==-1&&result.endsWith('.html')) { // might still be a remote entry
      const html = await fetch(result);
      result = await html.text();
      return mainContent(result, true);
    }
    return result;
  } else { // scorm 1.2
    const json = await getInteractionData(courseId, learnerId, interactionId, key);
    if (isJsonString(json) && json.hasOwnProperty('value')) {
      return JSON.parse(json.value);
    } else {
      return mainContent(json, true);
    }
  }
}

/* private functions */
function mainContent(value, asPlainText = false) {
  const match = value.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const str = match && match[1] ? match[1].trim() : null;
  return asPlainText ? htmlToPlaintext(str) : str;
}

function htmlToPlaintext(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  div.querySelectorAll('p').forEach(p => {
    if (p.nextSibling) p.insertAdjacentText('afterend', '\n');
  });
  return div.textContent.replace(/\n{3,}/g, `\n`).trim();
}

function isJsonString(str) {
  if (typeof str !== "string") return false;
  try {
    const result = JSON.parse(str);
    // Optionally ensure it's an object or array, not a primitive
    return typeof result === "object" && result !== null;
  } catch (e) {
    return false;
  }
}

/* public methods */
export default {
  setBearerToken,
  updateServerBase,
  setCorrectValues,
  setCorrectResponse,
  getLastResult,

  /* async functions */
  calculateResult,
  saveInteraction,
  loadInteraction,
};
