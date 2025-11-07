
// CountdownTimer class
class CountdownTimer {
    constructor(options = {}) {
        const {
            start = "60",
            end = () => { },
            tick = () => { }
        } = options;

        this.totalSeconds = CountdownTimer.parseTime(start);
        this.remaining = this.totalSeconds;
        this.onEnd = end;
        this.onTick = tick;
        this.interval = null;
    }

    static parseTime(str) {
        if (str.indexOf(':') === -1) return parseInt(str, 10);
        const parts = str.split(':').map(Number).reverse();
        let seconds = 0;
        if (parts[0]) seconds += parts[0];
        if (parts[1]) seconds += parts[1] * 60;
        if (parts[2]) seconds += parts[2] * 3600;
        return seconds;
    }

    start() {
        if (this.interval) return;
        this.interval = setInterval(() => {
            this.remaining--;
            if (typeof this.onTick === 'function' && this.remaining > -1) {
                this.onTick(this.remaining, (this.remaining / this.totalSeconds) * 100, this.getTime());
            }
            if (this.remaining <= 0) {
                if (typeof this.onEnd === 'function') this.onEnd();
                this.stop();
            }
        }, 1000);
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    reset() {
        this.stop();
        this.remaining = this.totalSeconds;
    }

    getTime() {
        let s = this.remaining;
        const hours = Math.floor(s / 3600);
        s %= 3600;
        const minutes = Math.floor(s / 60);
        const seconds = s % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

// Global variables
let started = false;
let timerFn = undefined;
let sortable = undefined;
let pieces = [];
let source = undefined;

const text = {
    waiting: '⋯',
    fail: '❌',
    win: '✅',
    running: '⏰',
    reset: '🔄'
};

// Function to get source element from blockElement
function getSourceElement() {
    if (typeof blockElement === 'undefined') {
        throw new Error('blockElement is not defined globally');
    }

    const video = blockElement.querySelector('video');
    if (video) return video;

    const img = blockElement.querySelector('img');
    if (img) return img;

    const contentRow = blockElement.querySelector('.fr-view')?.closest('[class*="__row"]');
    if (contentRow) return contentRow;

    const firstDiv = blockElement.querySelector('div');
    if (firstDiv && firstDiv.firstElementChild) {
        return firstDiv.firstElementChild;
    }

    throw new Error('No valid source element found in blockElement');
}

function getSourceProperties() {
    if (typeof blockElement === 'undefined') {
        throw new Error('blockElement is not defined globally'); // means it's not running against a block
    }

    // Default values
    let rows = 3;
    let cols = 4;
    let duration = 70;

    // Pattern to match various combinations: (5x4, 120s), (5x4), (120s)
    // Also handles optional whitespace around the pattern
    const pattern = /\s*\((?:(\d+)x(\d+)(?:,\s*(\d+)s)?|(\d+)s)\)\s*/i;

    // Search through all text nodes in blockElement
    const walker = document.createTreeWalker(
        blockElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let textNode;
    while (textNode = walker.nextNode()) {
        const match = textNode.textContent.match(pattern);
        if (match) {
            // match[1] and match[2] are cols and rows .. when grid dimensions present
            // match[3] is duration when combined with grid (ie. 5x4, 120s)
            // match[4] is duration when only duration present (e.g. 120s)

            if (match[1] && match[2]) {
                cols = parseInt(match[1], 10);
                rows = parseInt(match[2], 10);
            }

            if (match[3]) {
                duration = parseInt(match[3], 10);
            } else if (match[4]) {
                duration = parseInt(match[4], 10);
            }

            textNode.textContent = textNode.textContent.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
            break;
        }
    }



    return {
        rows: rows,
        cols: cols,
        duration: duration
    } // shorter { rows, cols, duration }
}

// Async function to load Sortable and initialize puzzle
async function initializePuzzle() {
    if (typeof Sortable === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Wait for Sortable to be available
    while (typeof Sortable === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // globally available object
    source = getSourceElement();

    const props = getSourceProperties();
    const controls = `
    <div class="puzzle-container" data-timer="${props.duration}"></div>
    <div class="graph"><label for="remaining"></label><meter id="remaining" min="0" max="100" low="10" high="50" optimum="90" value="0"></meter><button></button></div>
  `;
    const tag = source.tagName.toLowerCase();
    if (tag === 'video') {
        source.closest('.figure-container').insertAdjacentHTML('beforeend', controls);
        source.closest('.video-wrapper').setAttribute('hidden', '');
    } else {
        source.insertAdjacentHTML('afterend', controls);
    }

    const container = blockElement.querySelector('.puzzle-container');
    const remaining = blockElement.querySelector('.graph>label');
    const meter = blockElement.querySelector('.graph>meter');
    const reset = blockElement.querySelector('.graph>button');

    container.style.setProperty('--cols', props.cols);
    container.style.setProperty('--rows', props.rows);

    remaining.textContent = text.waiting;
    reset.textContent = text.reset;

    reset.addEventListener('click', () => {
        reset.style.display = "none";
        if (timerFn) timerFn.reset();
        started = false;
        meter.value = "100";
        sortable.option("disabled", false);
        remaining.textContent = text.waiting;
        reShuffle();
    });

    for (let row = 0; row < props.rows; row++) {
        for (let col = 0; col < props.cols; col++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.dataset.key = row * props.cols + col;

            const x1 = (col / props.cols) * 100;
            const y1 = (row / props.rows) * 100;
            const x2 = ((col + 1) / props.cols) * 100;
            const y2 = ((row + 1) / props.rows) * 100;
            const clip = `polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`;

            let content;

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

    // this hides the original object
    if (tag === 'video') {
        source.closest('.video-wrapper').setAttribute('hidden', '');
    } else {
        source.setAttribute('hidden', '');
    }

    // this does the jumbling in the grid
    reShuffle();

    // pulling the first item starts the puzzle timer
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
}

// Global functions
function start() {
    const container = blockElement.querySelector('.puzzle-container');
    const remaining = blockElement.querySelector('.graph>label');
    const meter = blockElement.querySelector('.graph>meter');

    started = true;
    timerFn = new CountdownTimer({
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

function checkPuzzle(el) {
    const remaining = blockElement.querySelector('.graph>label');
    const solved = [...el.children].every((child, i) =>
        parseInt(child.dataset.key, 10) === i
    );
    if (solved) {
        el.classList.add('done');
        remaining.textContent = text.win;
        sortable.option("disabled", true);
        timerFn.stop();
        ended();
    }
}

function ended() {
    if (source.tagName.toLowerCase() === 'video') {
        const container = blockElement.querySelector('.puzzle-container');
        Array.from(container.querySelectorAll('video')).forEach(v => { v.pause(); });
    }
}

function showReset() {
    const reset = blockElement.querySelector('.graph>button');
    reset.style.display = "block";
    ended();
}

function reSyncVideo() {
    const container = blockElement.querySelector('.puzzle-container');
    Array.from(container.querySelectorAll('video')).forEach(v => { v.currentTime = 0; v.play(); });
}

function reShuffle() {
    const container = blockElement.querySelector('.puzzle-container');
    pieces.sort(() => Math.random() - 0.5).forEach(p => container.appendChild(p));
}

initializePuzzle();
