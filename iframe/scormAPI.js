// scormAPI.js
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
  const count = getInteractionCount();
  for (let i = 0; i < count; i++) {
    if (getValue(`cmi.interactions.${i}.id`) === id) return i;
  }
  return count;
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