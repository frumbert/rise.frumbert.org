/*
 * scormAPI.js
 * Methods for talking to both Scorm 1.2 and 2004
 * Also contains sessionStorage fallback for when no SCORM API is found
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

// string packer, better compression than lz-string, lzw, https://github.com/KilledByAPixel/JSONCrush
import * as JSONCrush from "https://esm.sh/jsoncrush";

let api = null;
let version = null;
let initialized = false;
const maxDepth = 8;

// Try to find SCORM API
function findScorm2004API(win = window) {
    let frameElement = win;
    let attempts = 0;
    try {
    while (!api && attempts < maxDepth) {
        attempts++;
        if (frameElement.API_1484_11) {
            api = frameElement.API_1484_11;
            return true;
        } else if (frameElement.parent === frameElement) {
            break;
        }
        frameElement = frameElement.parent;
    }
    } catch (err) {
      console.warn('Failed to find Scorm 2004 window', err);
    }
    return false;
}

function findScorm12API(win = window) {
    let frameElement = win;
    let attempts = 0;
    try {
    while (!api && attempts < maxDepth) {
        attempts++;
        if (frameElement.API) {
            api = frameElement.API;
            return true;
        } else if (frameElement.parent === frameElement) {
            break;
        }
        frameElement = frameElement.parent;
    }
    } catch (err) {
      console.warn('Failed to find Scorm 1.2 window', err);
    }
    return false;
}

// Initialize and detect API version
function initialize() {
    if (initialized) return true;

    if (findScorm2004API()) {
        version = '2004';
    } else if (findScorm12API()) {
        version = '1.2';
    } else {
        version = 'storage';
        // console.info('No SCORM API found, using sessionStorage fallback');
    }

    if (version === 'storage') {
        initialized = true;
        return true;
    }

    try {
        const result = version === '2004' ? 
            api.Initialize('') :
            api.LMSInitialize('');
        initialized = true;
        return result;
    } catch (e) {
        console.error('Failed to initialize SCORM API:', e);
        return false;
    }
}

function findInteractionIndexById(id) {
  if (version === 'storage') {
      // Storage fallback when no SCORM API
      const keys = Object.keys(sessionStorage);
      for (let key of keys) {
          const match = key.match(/^cmi\.interactions\.(\d+)\.id$/);
          if (match && sessionStorage.getItem(key) === id) {
              return parseInt(match[1]);
          }
      }
      return getInteractionCount(); // return next available index
  }

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
      const unpacked = JSONCrush.uncrush(stored); // JSON.parse(stored));
      map = JSON.parse(unpacked);
    }
  } catch (e) {
    console.warn("Failed to unpack or parse cmi.comments:", e);
  }

  if (id in map) { // {"id-string-a" : number }, if id-string-a exists, return number
    return map[id];
  }

  const newIndex = getInteractionCount();
  map[id] = newIndex;

  try {
    const json = JSON.stringify(map);
    const compressedString = JSONCrush.crush(json);
    // const compressedString = JSON.stringify(compressed);
    setValue("cmi.comments", compressedString);
    commit();
  } catch (e) {
    console.warn("Failed to store compressed comment map:", e);
  }

  return newIndex;
}

function getLearnerId() {
  if (version === 'storage') {
    let identifier = sessionStorage.getItem(`learnerId`);
    if (!identifier) {
        identifier = crypto.randomUUID().slice(-12);
        sessionStorage.setItem(`learnerId`, identifier);
    }
    return identifier;
  }
  return (
    getValue("cmi.learner_id") ||
    getValue("cmi.core.student_id") ||
    null
  );
}

function getInteractionCount() {
    if (!initialized) return 0;

    if (version === 'storage') {
        const keys = Object.keys(sessionStorage);
        const interactionKeys = keys.filter(key => key.match(/^cmi\.interactions\.\d+\.id$/));
        return interactionKeys.length;
    }

    return version === '2004' ?
        parseInt(api.GetValue('cmi.interactions._count')) :
        parseInt(api.LMSGetValue('cmi.interactions._count'));
}

function getValue(element) {
    if (!initialized) return '';

    if (version === 'storage') {
        // Handle special counting cases
        if (element === 'cmi.interactions._count') {
            return getInteractionCount().toString();
        }
        
        // Handle other count elements
        const countMatch = element.match(/^(cmi\.[\w.]+)\._count$/);
        if (countMatch) {
            const prefix = countMatch[1];
            const keys = Object.keys(sessionStorage);
            const count = keys.filter(key => key.startsWith(`${prefix}.`)).length;
            return count.toString();
        }
        return sessionStorage.getItem(element) || '';
    }

    try {
        return version === '2004' ?
            api.GetValue(element) :
            api.LMSGetValue(element);
    } catch (e) {
        console.error(`Failed to get value for ${element}:`, e);
        return '';
    }
}

function setValue(element, value) {
    if (!initialized) return false;

    if (version === 'storage') {
        try {
            sessionStorage.setItem(element, value);
            return true;
        } catch (e) {
            console.error(`Failed to set storage value for ${element}:`, e);
            return false;
        }
    }

    try {
        return version === '2004' ?
            api.SetValue(element, value) :
            api.LMSSetValue(element, value);
    } catch (e) {
        console.error(`Failed to set value for ${element}:`, e);
        return false;
    }
}

function commit() {
    if (!initialized) return false;

    if (version === 'storage') {
        return true; // sessionStorage saves immediately
    }

    try {
        return version === '2004' ?
            api.Commit('') :
            api.LMSCommit('');
    } catch (e) {
        console.error('Failed to commit:', e);
        return false;
    }
}

function terminate() {
    if (!initialized) return false;

    if (version === 'storage') {
        return true;
    }

    try {
        return version === '2004' ?
            api.Terminate('') :
            api.LMSFinish('');
    } catch (e) {
        console.error('Failed to terminate:', e);
        return false;
    }
}

function getVersion() {
  return version;
}

export default {
    initialize,
    get:getValue,
    set:setValue,
    commit,
    terminate,

    findInteractionIndexById,
    getVersion,
    getLearnerId
};