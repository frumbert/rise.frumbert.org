// riseSCORMBridge.js (ES6 module)
import scormAPI from './scormAPI.js';

let token = null;
let SERVER_BASE = "https://rise.frumbert.org";
let DATA_ENDPOINT = `${SERVER_BASE}/generate`;
let questionText = "";

function applyGlobalConfig() {
  const globalCfg = window.riseSCORMBridgeConfig || {};
  if (globalCfg.token) token = globalCfg.token;
  if (globalCfg.serverBase) {
    SERVER_BASE = globalCfg.serverBase;
    DATA_ENDPOINT = `${SERVER_BASE}/generate`;
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
  return `${baseId}-${suffix}`;
}

function resolveInteractionId() {
  const cfg = window.riseSCORMBridgeConfig || {};
  return cfg.interactionId || getBlockScopedInteractionId("notes");
}

async function getCourseId() {
  const ready = window.__courseDataReady?.();
  if (ready && typeof ready.then === "function") {
    const data = await ready;
    return data?.course?.id || data?.__zone_symbol__value?.course?.id || null;
  }
  return null;
}

function getInteractionUrl(courseId, learnerId, interactionId, key = "") {
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

let __latestTextToSave = "";

async function saveTextContent(textContent, key = "", latency = "PT0H0M0S") {
  applyGlobalConfig();
  if (!scormAPI.isReady()) return false;

  __latestTextToSave = textContent;
  const courseId = await getCourseId();
  const learnerId = scormAPI.getLearnerId();
  const interactionId = resolveInteractionId();

  if (!courseId || !learnerId) return false;

  const url = await getInteractionUrl(courseId, learnerId, interactionId, key);
  if (!url) return false;

  const idx = scormAPI.findInteractionIndexById(interactionId);
  const prefix = `cmi.interactions.${idx}`;
  const responseProp = scormAPI.getVersion() === "2004" ? "learner_response" : "student_response";

  scormAPI.set(`${prefix}.id`, interactionId);
  scormAPI.set(`${prefix}.type`, "fill-in");
  scormAPI.set(`${prefix}.${responseProp}`, url);
  scormAPI.set(`${prefix}.result`, "neutral");
  scormAPI.set(`${prefix}.time`, new Date().toISOString());
  scormAPI.set(`${prefix}.latency`, latency);
  if (scormAPI.getVersion() === "2004") scormAPI.set(`${prefix}.description`, questionText);

  return scormAPI.commit();
}

async function loadTextContent() {
  applyGlobalConfig();
  if (!scormAPI.isReady()) return null;

  const interactionId = resolveInteractionId();
  const idx = scormAPI.findInteractionIndexById(interactionId);
  const prefix = `cmi.interactions.${idx}`;
  const responseProp = scormAPI.getVersion() === "2004" ? "learner_response" : "student_response";
  const url = scormAPI.get(`${prefix}.${responseProp}`);

  if (!url) return null;

  try {
    const res = await fetch(url);
    const html = await res.text();
    const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    return match && match[1] ? match[1].trim() : null;
  } catch (e) {
    console.warn("Failed to load stored text content:", e);
    return null;
  }
}

export default {
  setBearerToken,
  updateServerBase,
  saveTextContent,
  loadTextContent,
  resolveInteractionId // exposed in case your iframe wants to read it
};
