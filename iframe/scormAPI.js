/*
 * scormAPI.js
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

let api = null;
let version = null;

function findAPI(win) {
  let tries = 0;
  while (win && tries < 10) {
    try {
      if (win.API_1484_11) {
        version = "2004";
        return win.API_1484_11;
      } else if (win.API) {
        version = "1.2";
        return win.API;
      }
    } catch (e) {}
    if (win === win.parent) break;
    win = win.parent;
    tries++;
  }
  return null;
}

function initialize() {
  if (api) return;
  api = findAPI(window);
  if (!api) return;

  try {
    if (version === "2004") {
      api.Initialize?.("") ?? api.Initialize("");
    } else {
      api.LMSInitialize?.("") ?? api.LMSInitialize("");
    }
  } catch (e) {
    console.warn("SCORM API initialization failed", e);
    api = null;
  }
}

function getValue(prop) {
  if (!api) return null;
  try {
    return version === "2004"
      ? api.GetValue?.(prop) ?? api.GetValue(prop)
      : api.LMSGetValue?.(prop) ?? api.LMSGetValue(prop);
  } catch (e) {
    console.warn("SCORM GetValue failed:", prop, e);
    return null;
  }
}

function setValue(prop, value) {
  if (!api) return false;
  try {
    return version === "2004"
      ? api.SetValue?.(prop, value) ?? api.SetValue(prop, value)
      : api.LMSSetValue?.(prop, value) ?? api.LMSSetValue(prop, value);
  } catch (e) {
    console.warn("SCORM SetValue failed:", prop, value, e);
    return false;
  }
}

function commit() {
  if (!api) return false;
  try {
    return version === "2004"
      ? api.Commit?.("") ?? api.Commit("")
      : api.LMSCommit?.("") ?? api.LMSCommit("");
  } catch (e) {
    console.warn("SCORM Commit failed", e);
    return false;
  }
}

function getLearnerId() {
  return (
    getValue("cmi.learner_id") ||
    getValue("cmi.core.student_id") ||
    null
  );
}

function getInteractionCount() {
  const raw = getValue("cmi.interactions._count");
  const count = parseInt(raw, 10);
  return isNaN(count) ? 0 : count;
}

function findInteractionIndexById(id) {
  if (getVersion() === "2004") { // cmi.interactions.n.id is RW
    const count = getInteractionCount();
    for (let i = 0; i < count; i++) {
      if (getValue(`cmi.interactions.${i}.id`) === id) return i;
    }
    return count;
  }

   // cmi.interactions.n.id is WO, store it in cmi.comments (compressed)
  let map = {}; // {"id-string-a" : number, "id-string-b" : number2 }
  try {
    const stored = getValue("cmi.comments");
    if (stored) {
      const unpacked = lzwCompress.unpack(JSON.parse(stored));
      map = JSON.parse(unpacked);
    }
  } catch (e) {
    console.warn("Failed to unpack or parse cmi.comments:", e);
  }

  if (id in map) {
    return map[id];
  }

  const newIndex = getInteractionCount();
  map[id] = newIndex;

  try {
    const json = JSON.stringify(map);
    const compressed = lzwCompress.pack(json);
    const compressedString = JSON.stringify(compressed);
    setValue("cmi.comments", compressedString);
    commit();
  } catch (e) {
    console.warn("Failed to store compressed comment map:", e);
  }

  return newIndex;
}

function getVersion() {
  return version;
}

function isReady() {
  return !!api;
}

initialize();

export default {
  isReady,
  getVersion,
  get: getValue,
  set: setValue,
  commit,
  getLearnerId,
  findInteractionIndexById,
  getInteractionCount,
};