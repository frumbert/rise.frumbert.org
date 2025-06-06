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
  } else if (lc.endsWith('.mp3') || lc.endsWith('.wav') || lc.endsWith('.ogg')) { // audio
    return `<audio src="${url}" controls preload="none"></audio>`;
  } else if (lc.endsWith('.mp4') || lc.endsWith('.ogg') || lc.endsWith('.mov') || lc.endsWith('.webm')) { // video
    return `<video src="${url}" controls preload="none"></video>`;
  } else if (isHTML(url)) { // embeds
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
  const { token, serverBase, question, mediaAbove, mediaBelow } = window.riseSCORMBridgeConfig;

  const questionNode = document.getElementById('question');
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
    const latency = interactionStartTime
      ? formatLatency(new Date() - interactionStartTime)
      : "PT0H0M0S";

    const saved = await riseSCORMBridge.saveTextContent(val, "", latency);
    btn.textContent = (saved) ? '👍 Saved' : '❌ Not saved';
    setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
  });

  // restore previously saved value
  const html = await riseSCORMBridge.loadTextContent();
  if (html) {
    const text = html.replace(/<p>(.*?)<\/p>/g, "$1\n").trim();
    textArea.value = text;
  }
}

// set up
init();