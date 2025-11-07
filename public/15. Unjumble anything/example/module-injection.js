/**
 * Module Injection Script for Puzzle Game
 * 
 * This script provides ES6 module support for the puzzle game.
 * Use this when you need to integrate the puzzle into a modular environment.
 * 
 * Usage:
 * 1. Remove the Sortable CDN script tag from the HTML
 * 2. Include this script as a module: <script type="module" src="module-injection.js"></script>
 * 3. Or import the initializePuzzleModule function in your module system
 */

import { Sortable, Swap } from 'https://cdn.jsdelivr.net/npm/sortablejs/modular/sortable.core.esm.js';

// Mount the Swap plugin for Sortable
Sortable.mount(new Swap());

/**
 * Initialize the puzzle game with module support
 * @param {string} containerId - ID of the puzzle container element
 * @param {object} CountdownTimer - CountdownTimer class (must be available globally or passed in)
 */
export function initializePuzzleModule(containerId = 'puzzle-container', CountdownTimerClass = window.CountdownTimer) {
  if (!CountdownTimerClass) {
    throw new Error('CountdownTimer class is required. Make sure it\'s available globally or pass it as a parameter.');
  }

  let started = false;
  let timerFn = undefined;
  let sortable = undefined;

  const text = {
    waiting: '⋯',
    fail:    '❌',
    win:     '✅',
    running: '⏰',
    reset:   '🔄'
  };

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with ID "${containerId}" not found`);
  }

  const source = document.querySelector(container.dataset.src);
  const [cols, rows] = container.dataset.tiles.split('x').map(Number);
  const remaining = document.querySelector('.graph>label');
  const meter = document.querySelector('.graph>meter');
  const reset = document.querySelector('.graph>button');

  container.style.setProperty('--cols', cols);
  container.style.setProperty('--rows', rows);

  remaining.textContent = text.waiting;
  reset.textContent = text.reset;

  const pieces = [];

  // Reset button functionality
  reset.addEventListener('click', () => {
    reset.style.display = "none";
    if (timerFn) timerFn.reset();
    started = false;
    meter.value = "100";
    sortable.option("disabled", false);
    remaining.textContent = text.waiting;
    reShuffle();
  });

  // Create puzzle pieces
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const piece = document.createElement('div');
      piece.className = 'puzzle-piece';
      piece.dataset.key = row * cols + col;

      const x1 = (col / cols) * 100;
      const y1 = (row / rows) * 100;
      const x2 = ((col + 1) / cols) * 100;
      const y2 = ((row + 1) / rows) * 100;
      const clip = `polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`;

      let content;
      const tag = source.tagName.toLowerCase();

      if (tag === 'video') {
        content = document.createElement('video');
        content.src = source.currentSrc || source.src;
        content.autoplay = true;
        content.muted = true;
        content.loop = true;
        content.playsInline = true;
      } else if (tag === 'img') {
        content = document.createElement('img');
        content.src = source.currentSrc || source.src;
      } else {
        content = source.cloneNode(true);
        content.removeAttribute('id');
      }

      content.style.setProperty('--row', row);
      content.style.setProperty('--col', col);
      content.style.setProperty('--clip', clip);

      piece.appendChild(content);
      pieces.push(piece);
    }
  }

  // Initial shuffle
  reShuffle();

  // Initialize Sortable
  sortable = Sortable.create(container, {
    swap: true,
    animation: 150,
    swapClass: "sortable-swap-highlight",
    onStart: (evt) => {
      if (!started) start();
      container.classList.add('dragging');
    },
    onEnd: () => {
      container.classList.remove('dragging');
      checkPuzzle(container);
    }
  });

  // Start the game
  function start() {
    started = true;
    timerFn = new CountdownTimerClass({
      start: container.dataset.timer,
      end: () => {
        remaining.textContent = text.fail;
        sortable.option("disabled", true);
        showReset();
      },
      tick: (seconds, percentage, readable) => {
        meter.value = percentage;
      }
    });
    remaining.textContent = text.running;
    timerFn.start();
    reSyncVideo();
  }

  // Check if puzzle is solved
  function checkPuzzle(el) {
    const solved = [...el.children].every((child, i) =>
      parseInt(child.dataset.key, 10) === i
    );
    if (solved) {
      el.classList.add('done');
      remaining.textContent = text.win;
      sortable.option("disabled", true);
      timerFn.stop();
      reSyncVideo();
    }
  }

  // Show reset button
  function showReset() {
    reset.style.display = "block";
  }

  // Sync video playback
  function reSyncVideo() {
    Array.from(container.querySelectorAll('video')).forEach(v => { v.currentTime = 0; });
  }

  // Shuffle puzzle pieces
  function reShuffle() {
    pieces.sort(() => Math.random() - 0.5).forEach(p => container.appendChild(p));
  }

  // Return API for external control
  return {
    start,
    reset: () => reset.click(),
    shuffle: reShuffle,
    timer: () => timerFn,
    sortable: () => sortable,
    isStarted: () => started
  };
}

// Auto-initialize if DOM is ready and this is used as a standalone module
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('puzzle-container')) {
      initializePuzzleModule();
    }
  });
} else {
  if (document.getElementById('puzzle-container')) {
    initializePuzzleModule();
  }
}