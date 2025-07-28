/*
 * app.js
 * Long Text Entry for Scorm 1.2 (and 2004, which can do it anyway)
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
import {default as riseSCORMBridge} from 'https://esm.sh/gh/frumbert/rise-esm@v1.1.1';
import utils from 'https://esm.sh/gh/frumbert/rise-esm@v1.1.1/utils.js';

// store latency (time learner takes inside interaction)
let interactionStartTime = null;
let current_connections = [];

const debug = document.querySelector('main>pre');
function print(...message) {
  message.forEach(msg=>{
    msg = (typeof message === 'string') ? msg : JSON.stringify(msg);
    debug.textContent += `${msg}\n\n`;
  });
}

// wait for global config to be ready
async function waitForConfig() {
  while (typeof window.riseSCORMBridgeConfig === "undefined") {
    await new Promise(res => setTimeout(res, 10));
  }
}

function renderLists(data = {}) {
  return new Promise((done,fail) => { // TODO: fail condition might be that lists aren't the correct shape
    const container = document.querySelector('section');
    const plugsBoxes = container.querySelector('#plugs .boxes');
    const socketsBoxes = container.querySelector('#sockets .boxes');
    const connectors = document.getElementById('connectors');

    data.plugs.items.forEach((obj,index) => {
      const [key, content] = Object.entries(obj)[0];
      let html = `<div data-key="${key}" data-index="${index}"><span>`;
      if (content.mediaAbove) html += utils.formatMedia(content.mediaAbove);
      if (typeof content === "object" && "text" in content && content.text) {
        html += content.text.toString();
      } else if (typeof content === "string") {
        html += content;
      }
      if (content.mediaBelow) html += utils.formatMedia(content.mediaBelow);
html += ` (${key})`;
      html += `</span></div>`;
      plugsBoxes.insertAdjacentHTML('beforeend', html);
      connectors.insertAdjacentHTML('beforeend', `<div class='connector start'></div>`); 
      connectors.insertAdjacentHTML('beforeend', `<div class='connector end'></div>`); 
    });
    if (data.order === "random") utils.shuffleChildren(plugsBoxes);

    data.sockets.items.forEach((obj,index) => {
      const [key, content] = Object.entries(obj)[0];
      let html = `<div data-key="${key}" data-index="${index}"><span>`;
      if (content.mediaAbove) html += utils.formatMedia(content.mediaAbove);
      if (typeof content === "object" && "text" in content && content.text) {
        html += content.text.toString();
      } else if (typeof content === "string") {
        html += content;
      }
      if (content.mediaBelow) html += utils.formatMedia(content.mediaBelow);
html += ` (${key})`;
      html += `</span></div>`;
      socketsBoxes.insertAdjacentHTML('beforeend', html);
    });
    if (data.order === "random") utils.shuffleChildren(socketsBoxes);

    // renderLists has to have finished layout before we calculate leader-lines
    const mediaSelectors = 'img,video,audio,iframe';
    const mediaElements = [
      ...plugsBoxes.querySelectorAll(mediaSelectors),
      ...socketsBoxes.querySelectorAll(mediaSelectors)
    ];

    if (mediaElements.length === 0) {
      done();
      return;
    }

    // Helper to create a promise for each media element
    function mediaLoaded(el) {
      return new Promise(res => {
        if (el.tagName === 'IMG' || el.tagName === 'IFRAME') {
          if (el.complete) return res();
          el.addEventListener('load', res, { once: true });
          el.addEventListener('error', res, { once: true });
        } else if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
          if (el.readyState >= 1) return res();
          el.addEventListener('loadedmetadata', res, { once: true });
          el.addEventListener('error', res, { once: true });
        } else {
          res();
        }
      });
    }

    // requestAnimationFrame to ensure layout is updated
    Promise.all(mediaElements.map(mediaLoaded)).then(() => {
      requestAnimationFrame(() => done());
    });
  });
}

async function init() {
  await waitForConfig();
  const { token, serverBase, question, mediaAbove, mediaBelow, key, feedback, required, placeholder, distractors, correct } = window.riseSCORMBridgeConfig;

  const questionNode = document.getElementById('question');
  const feedbackNode = document.getElementById('feedback');
  const containerElement = document.querySelector("section");  

  if (token) riseSCORMBridge.setBearerToken(token);
  if (serverBase) riseSCORMBridge.updateServerBase(serverBase);
  if (question) questionNode.innerHTML = question;
  if (mediaAbove) questionNode.insertAdjacentHTML('beforebegin', utils.formatMedia(mediaAbove));
  if (mediaBelow) questionNode.insertAdjacentHTML('afterend', utils.formatMedia(mediaBelow));
  if (placeholder) textArea.placeholder = placeholder;
  if (correct) riseSCORMBridge.setCorrectValues(correct.replace(/\=/g,'.')); // = is more human readable, but sequencing uses . to separate values for some reason

  const btn = document.getElementById("save");
  btn.dataset.value = btn.textContent;

  // note when user starts interacting
  containerElement.addEventListener("focusin", (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) { // focus came from outside the container, https://danburzo.ro/focus-within/
      if (!interactionStartTime) {
        interactionStartTime = new Date();
      }
    }
  });

  // store current value
  btn.addEventListener("click", async () => {

    let answered = current_connections.some(item=>item!==-1);
    if (!answered) {
      btn.textContent = `⚠️ Please select an answer`;
      setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
      return;
    }
    const latency = interactionStartTime
      ? utils.formatLatency(new Date() - interactionStartTime)
      : "PT0H0M0S";
    const answer = calculateResponse();

    const saved = await riseSCORMBridge.saveInteraction('connect', answer, key, latency);
    btn.textContent = (saved) ? '👍 Saved' : '❌ Not saved';
    setTimeout(()=>{btn.textContent=btn.dataset.value},2000);
    const status = riseSCORMBridge.getLastResult();
    if (saved && feedback) utils.formatFeedback(feedbackNode, feedback, status);
    if (saved) window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});

  });

  // restore previously saved value, https://dev.to/latz/the-modern-way-of-checking-radio-groups-9j9
  const savedValue = await riseSCORMBridge.loadInteraction(key);
  if (savedValue) {
    window.parent.postMessage({type: 'MIGHTY_INTERACTIVE_COMPLETE'});
  }

  // now we know all the facts, render the leader-lines
  if (distractors) renderLists(distractors).then(()=> {
    bindLeaderLines(savedValue)
  });

}

// return a scorm-compatible sequence of the selected response
function calculateResponse() {
  const plugs = document.querySelector("#plugs .boxes");
  const sockets = document.querySelector("#sockets .boxes");
  const answer = [];
  current_connections.forEach(function(obj, index) {
    const plug = plugs.children[index].dataset.key;
    const socket = (obj===-1)?'':sockets.children[obj].dataset.key;
    answer.push(`${plug}.${socket}`);
  })
  return answer; // .join(',').replace(/[\'\"]/g,''); // not an array of strings
}

function removeActiveSnapClass() {
  document.querySelectorAll('#connectors .active-snap').forEach(el=>{console.log(el);el.classList.remove("active-snap")});
}

function bindLeaderLines(previousValue = '') {
  const computedStyle = getComputedStyle(document.documentElement);
  const connectorsNode = document.getElementById("connectors");
  const connectors = connectorsNode.querySelectorAll(".connector.start");
  const lineWrapper = document.getElementById("line-wrapper");
  const plugs = document.querySelector("#plugs .boxes");
  const sockets = document.querySelector("#sockets .boxes");

  let ends = [],
      snaptargets = [];

  utils.wrapperPosition(lineWrapper);
  let lastDraggedFrom, isSnapped;
  connectorsNode.style.height = `${plugs.getBoundingClientRect().height}px`;
  const negative_h = parseFloat(connectorsNode.getBoundingClientRect().top);
  for (let i=0;i<connectors.length;i++) current_connections[i] = -1; // snapindex[i]=plug, value=socket

  Array.from(connectors).forEach(function(start, index) {

    // connectors come in pairs
    const end = start.nextElementSibling;

    const plug = plugs.children[index];
    const p_position = plug.getBoundingClientRect();
    const p_midpoint = p_position.y + (p_position.height / 2) - negative_h;
    start.style.top = "calc(" + p_midpoint + "px - .5rem)";
    end.style.top = "calc(" + p_midpoint + "px - .5rem)";

    const socket = sockets.children[index];
    const s_position = socket.getBoundingClientRect();
    const s_midpoint = s_position.y + (s_position.height / 2) - negative_h;

    const div = document.createElement("div");
    const snaptarget = {
        element: div,
        x: (connectorsNode.offsetWidth - utils.remToPx(.5)),
        y: s_midpoint,
        i: index
    }
    div.classList.add("hint");
    div.style.top = snaptarget.y - utils.remToPx(.5) + 'px';
    div.style.right = 0;
    connectorsNode.appendChild(div);
    snaptargets.push(snaptarget);

    const line = new LeaderLine(start, end, {
        startPlug: 'none',
        startPlugColor: computedStyle.getPropertyValue('--button-bg-alpha-10'),
        endPlugColor: computedStyle.getPropertyValue('--button-bg-alpha-50'),
        gradient: true,
        path: 'fluid',
        startSocket: 'right',
        endSocket: 'left',
        hide: true,
        dropShadow: { dx:0, dy: 2, blur: 3, opacity: .2},
    });

    const draggable = new PlainDraggable(end, {
        onMove: function (newPosition) {
            utils.wrapperPosition(lineWrapper);
            line.position();
            isSnapped = !!newPosition.snapped;
            removeActiveSnapClass();

            if (isSnapped) {
              const bb = this.containment.getBoundingClientRect();
              const tolerance = utils.remToPx(1.5);
              var closest = snaptargets.find(function(target) {
                  const xpos = newPosition.left - bb.x;
                  const ypos = newPosition.top - bb.y;
                  return (Math.abs(target.x - xpos) < tolerance) && (Math.abs(target.y - ypos) < tolerance);
              });
              if (closest) {
                closest.element.classList.add('active-snap');
              }
            } else {
              removeActiveSnapClass();
            }
        },
        onMoveStart: function () {
          line.show('draw', {
              duration: 500,
              timing: 'ease-in'
          });
        },
        onDragStart: function (obj) {
            connectorsNode.classList.add("drop-hint");
            lastDraggedFrom = obj;
            line.dash = { animation: true };
        },
        onDragEnd: function (newPosition) {
            connectorsNode.classList.remove("drop-hint");
            removeActiveSnapClass();
            const bb = this.containment.getBoundingClientRect();
            const tolerance = utils.remToPx(1.5); // must be less than possible overlap between snaptargets
            var dropped = snaptargets.find(function(target) { // find closest drop-point
                const xpos = newPosition.left - bb.x;
                const ypos = newPosition.top - bb.y;
                return (Math.abs(target.x - xpos) < tolerance) && (Math.abs(target.y - ypos) < tolerance);
            });
            const occupied = dropped && current_connections.includes(dropped.i);
            if (!isSnapped || occupied) {
                lastDraggedFrom.target.style.transform = 'none';
                line.hide('draw',{duration:100});
                this.position(); // absurdly named method for resetting the drag coordinates
                current_connections[index] = -1;
            } else {
                current_connections[index] = dropped ? dropped.i : -1;
            }
            lastDraggedFrom = undefined;
            line.dash = false;
        },
        autoScroll: true
    });

    ends.push({ line , draggable });
  });

  // set up droppable targets for all ends
  ends.map(function(obj, index) {
    const draggable = obj.draggable;  // the 'end'
    const line = obj.line;            // the 'leader-line'
    draggable.snap = {
        targets: snaptargets.map(o => o.element),
        center: true,
        gravity: utils.remToPx(1.5),
        corner: 'all',
    }
  });

  // restore the previously connected ends, and skip missing answers
  const connectorsNodeBB = connectorsNode.getBoundingClientRect();
  const values = (previousValue.indexOf(',')===-1)?[]:previousValue.split(',');
  const plugKeyIndexes = Array.from(plugs.children).map(node=>node.dataset.key);
  const socketKeyIndexes = Array.from(sockets.children).map(node=>node.dataset.key);
  values.forEach(val => {
    const [plug,socket] = val.split('.');
    if (!socket) return;
    const plugIndex = plugKeyIndexes.indexOf(plug);
    const end = ends.find((e,i) => {
      return i===plugIndex;
    });
    const socketIndex = socketKeyIndexes.indexOf(socket);
    const sn = snaptargets[socketIndex];
    end.draggable.top = sn.y + connectorsNodeBB.top;
    end.draggable.left = sn.x + connectorsNodeBB.left;
    end.line.show('draw', {
      duration: 500,
      timing: 'ease-in-out'
    });
    end.line.position();
  });

}

// set up
init();