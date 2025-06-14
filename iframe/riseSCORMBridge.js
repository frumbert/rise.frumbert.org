/*
 * riseSCORMBridge.js
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

import scormAPI from './scormAPI.js';

let token = null;
let SERVER_BASE = "https://rise.frumbert.org";
let DATA_ENDPOINT = `${SERVER_BASE}/generate`;
let VIEW_ENDPOINT = `${SERVER_BASE}/view`;
let questionText = "";

function applyGlobalConfig() {
  const globalCfg = window.riseSCORMBridgeConfig || {};
  if (globalCfg.token) token = globalCfg.token;
  if (globalCfg.serverBase) {
    SERVER_BASE = globalCfg.serverBase;
    DATA_ENDPOINT = `${SERVER_BASE}/generate`;
    VIEW_ENDPOINT = `${SERVER_BASE}/view`;
  }
  if (globalCfg.question) {
    questionText = globalCfg.question;
  }
}

function setBearerToken(t) {
  token = t;
}

function updateServerBase(url) {
  SERVER_BASE = url;
  DATA_ENDPOINT = `${SERVER_BASE}/generate`;
}

function getBlockScopedInteractionId(baseId = "notes") {
  const hash = location.href.split("#")[1] || "";
  const suffix = hash.replace(/[^\w]/g, "-").substring(0, 50);
  // in Rise this will look like -lessons-gJtPxWyYT-IY7c7uKRitatRbMsKrYCBZ
  return `${baseId}-${suffix}`;
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

function resolveInteractionId() {
  const cfg = window.riseSCORMBridgeConfig || {};
  if (cfg.interactionId) return cfg.interactionId;
  if (cfg.questionText) {
    const span = document.createElement('span');
    span.innerHTML = cfg.questionText; 
    const text = toPascalCase(span.textContent).slice(0, 255);
    return text;
  }
  return getBlockScopedInteractionId("notes");
}

async function getCourseId() {
  const ready = window.__courseDataReady?.();
  if (ready && typeof ready.then === "function") {
    const data = await ready;
    return data?.course?.id || data?.__zone_symbol__value?.course?.id || null;
  }
  return null;
}

// saves the content and returns its public url
function getInteractionUrl(courseId, learnerId, interactionId, key = "") {
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
      content: __latestTextToSave,
      question: questionText
    })
  })
    .then(res => res.json())
    .then(data => data.url || null);
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
  const html = await res.text();
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match && match[1] ? match[1].trim() : null;
}

let __latestTextToSave = "";

async function saveTextContent(textContent, key = "", latency = "PT0H0M0S") {
  key = key ?? "";
  applyGlobalConfig();
  if (!scormAPI.isReady()) return true; // no api? can't save anything. Assume ok to move on.

  const courseId = await getCourseId();
  const learnerId = scormAPI.getLearnerId();

  if (!courseId || !learnerId) return false;

  const interactionId = resolveInteractionId();
  const idx = scormAPI.findInteractionIndexById(interactionId);
  const prefix = `cmi.interactions.${idx}`;

  __latestTextToSave = textContent;

  // scorm 2004 has the capability to store the data already
  if (scormAPI.getVersion() === "2004") {

    scormAPI.set(`${prefix}.id`, interactionId);
    scormAPI.set(`${prefix}.type`, "long-fill-in");
    scormAPI.set(`${prefix}.description`, questionText.slice(0, 250));
    scormAPI.set(`${prefix}.result`, "neutral");
    scormAPI.set(`${prefix}.time`, new Date().toISOString());
    scormAPI.set(`${prefix}.latency`, latency);
    scormAPI.set(`${prefix}.learner_response`, __latestTextToSave);
    return scormAPI.commit();

  }

  // scorm 1.2 has write-only properties, we will store the data offsite and log the url

  const url = await getInteractionUrl(courseId, learnerId, interactionId, key);
  if (!url) return false;

  scormAPI.set(`${prefix}.id`, interactionId);
  scormAPI.set(`${prefix}.type`, "fill-in");
  scormAPI.set(`${prefix}.result`, "neutral");
  scormAPI.set(`${prefix}.time`, new Date().toISOString());
  scormAPI.set(`${prefix}.latency`, latency);
  scormAPI.set(`${prefix}.student_response`, url);
  return scormAPI.commit();
}

async function loadTextContent(key = "") {
  key = key ?? "";
  applyGlobalConfig();
  if (!scormAPI.isReady()) return false;

  const courseId = await getCourseId();
  const learnerId = scormAPI.getLearnerId();

  if (!courseId || !learnerId) return false;

  const interactionId = resolveInteractionId();

  // scorm 2004 has the capability to read stored data back
  if (scormAPI.getVersion() === "2004") {

    const idx = scormAPI.findInteractionIndexById(interactionId);
    const prefix = `cmi.interactions.${idx}`;
    return scormAPI.get(`${prefix}.learner_response`);

  }

  // scorm 1.2's properties are write-only so we have to look it up using what we know
  return getInteractionData(courseId, learnerId, interactionId, key = "");
}

export default {
  setBearerToken,
  updateServerBase,
  saveTextContent,
  loadTextContent,
  resolveInteractionId // exposed in case your iframe wants to read it
};
