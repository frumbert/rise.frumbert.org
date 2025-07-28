(async () => {
    window.__MODLOADER__ = window.__MODLOADER__ || {};

    const MODS = [
        { block: "cm9sdzd5000xk3bbrcj84q2vo", fn: Carousel, called: false },
        { block: "cma4q8q8f03bh3bbsafnl0tay", fn: Carousel, called: false },
        { block: "cm9s1lu2p00db3b7c5v3o6tkd", fn: SideBySide, called: false },
        { block: "cm9sbg808003y3bbrbnrw7yat", fn: SideBySide, called: false },
        { block: "cmbwtt66v00703b7clojmgez1", fn: Bleary, called: false },
        { block: "cmabux1dq015u3bbsx4s7qsq4", fn: Dropple, called: false },
        { block: "cmbyduxaz02t33b7cmpjmx001", fn: Dropple, called: false }
    ];

    /* ----------------------------------------------*/

    class Comparison {
        constructor(blockId, options = {}) {
            this.id = blockId;
            this.block = document.querySelector(`[data-block-id="${this.id}"]`);
            this.surface = this.block?.querySelector('.block-gallery__row');
            this.initial = options.initial || '50%';
            this.handle = options.handle || '|';
            this.hStyle = options.style || {
                'border-radius': '3px',
                'background-color': '#99CEDB',
                'color': 'black'
            };
            this.cStyle = options.caption || {
                'background-color': '#0000007f',
                'color': 'white',
                'text-shadow': '1px 1px 0 #0000007f',
                'padding': '1rem'
            };
            this.images = Array.from(this.block.querySelectorAll('img')).map(node => node.src);
            this.captions = Array.from(this.block.querySelectorAll('.block-gallery__caption')).map(node => node.innerHTML);
            this.labels = {};
            this.minSize = 32;

            this.customCSS();
            this.setup();
            this.listen();

        }

        customCSS() {
            if (document.querySelector(`#cjs-${this.id}`)) return; // run on ths instance
            const style = document.createElement('style');
            style.id = `cjs-${this.id}`;
            const handle = []; const caption = [];
            for (const [key, value] of Object.entries(this.hStyle)) handle.push(`${key}:${value};`);
            for (const [key, value] of Object.entries(this.cStyle)) caption.push(`${key}:${value};`);
            style.textContent = `
                .cjs-${this.id}-container { position: relative;
                > img { max-width: 100%; display: block; }
                .cjs-label { position: absolute; bottom:0; right: 0; margin:0; ${caption.join('')};
                    &.cjs-hide { visibility: hidden; }
                    p:last-of-type { margin-bottom: 0; }
                }
                > .cjs-cover { animation: cjs-bounce 1s; animation-delay: .5s; width: ${this.initial}; position: absolute; top:0;left:0;height:100%;overflow:hidden;background:url(${this.images[0]}) no-repeat top left; background-size:cover; transform:translateZ(0);backface-visibility:hidden;
                    > .cjs-label { right: auto; left: 0 }
                }
                > .cjs-handle { ${handle.join('')}; cursor: pointer; position: absolute; top: 50%; left: ${this.initial}; transform: translate(-50%,-50%); font-size: 0;
                    > svg { pointer-events: none }
                }
                }
                @keyframes cjs-bounce { 0% { width: 0} 75% { width: calc(${this.initial} + 1rem)} 100% { width: ${this.initial} }}
            `;
            document.body.appendChild(style);
        }

        setup() {
            if (!this.block) return;
            this.surface.innerHTML = this.captions[1] ? `
        <figure class='cjs-${this.id}-container'>
            <img src='${this.images[1]}' alt='Comparison image'>
            <span class='cjs-label'>${this.captions[1]}</span>
            <div class='cjs-cover'>
                <span class='cjs-label'>${this.captions[0]}</span>
            </div>
            <span class='cjs-handle'>${this.handle}</span>
        </figure>` : `<figure class='cjs-${this.id}-container'>
            <img src='${this.images[1]}' alt='Comparison image'>
            <div class='cjs-cover'></div>
            <span class='cjs-handle'>${this.handle}</span>
        </figure>`;
            this.block.dataset.mightyComparison = true; // mark this block as done
            this.container = this.block.querySelector(`.cjs-${this.id}-container`);
            this.handle = this.block.querySelector('.cjs-handle');
            this.cover = this.block.querySelector('.cjs-cover');
            this.container.style.maxWidth = this.surface.getBoundingClientRect().width + 'px';
            this.minSize = this.handle.getBoundingClientRect().width / 2;
            this.labels = {
                right: { el: this.container.querySelector('.cjs-label') },
                left: { el: this.container.querySelector('.cjs-cover .cjs-label') }
            };
        }

        listen() {
            if (!this.block) return;

            let rect = {}; let containerWidth = 0;
            let isDragging = false;

            const onDragStart = (e) => {
                e.preventDefault();
                isDragging = true;
                rect = this.container.getBoundingClientRect();
                this.labels.right['size'] = this.labels.right.el?.getBoundingClientRect();
                this.labels.left['size'] = this.labels.left.el?.getBoundingClientRect();
                containerWidth = rect.width;
            };

            const onDragMove = (e) => {
                if (!isDragging) return;

                // Determine the current mouse/touch position relative to the container
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                let offsetX = clientX - rect.left;

                // Clamp the offset to stay within the container bounds
                offsetX = Math.max(this.minSize, Math.min(offsetX, containerWidth - this.minSize));

                // Calculate the percentage position
                const percentage = (offsetX / containerWidth) * 100;

                // Update the handle's position and the cover width
                this.handle.style.left = `${percentage}%`;
                this.cover.style.width = `${percentage}%`;

                // check to see if the labels are visible (if we have captions)
                this.labels.left.el?.classList[(offsetX < this.labels.left.size.width) ? 'add' : 'remove']('cjs-hide');
                this.labels.right.el?.classList[(offsetX > containerWidth - this.labels.right.size.width) ? 'add' : 'remove']('cjs-hide');
            };

            const onDragEnd = () => {
                isDragging = false;
            };

            // Add event listeners for mouse and touch events
            this.handle.addEventListener('mousedown', onDragStart);
            this.handle.addEventListener('touchstart', onDragStart);

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('touchmove', onDragMove);

            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchend', onDragEnd);
        }
    }

    class FrumbertCarousel {
        constructor(sliderId, config) {
            this.slider = sliderId instanceof HTMLElement ? sliderId : document.getElementById(sliderId);
            this.slides = this.slider.querySelectorAll('figure');
            this.config = Object.assign({
                maxRows: 8,
                maxCols: 10,
                interval: 100,
                fadeDuration: 600,
                patterns: ['squares', 'vbeams', 'hbeams', 'fade', 'rando'],
                previous: undefined,
                next: undefined,
                zoom: false,
                dots: undefined,
                dotShapes: {
                    current: "M512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256zM256 48C141.1 48 48 141.1 48 256C48 370.9 141.1 464 256 464C370.9 464 464 370.9 464 256C464 141.1 370.9 48 256 48z",
                    other: "M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512z"
                }
            }, config);

            this.current = 0;
            [this.rows, this.cols] = [this.config.maxRows, this.config.maxCols];

            this.init();
        }

        zoomContent(slide, index) {
            const sw = 920;
            const sh = (sw / parseFloat(slide.dataset.w) * parseFloat(slide.dataset.h)).toFixed();
            return `<img src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' width='${sw}' height='${sh}' data-src='${slide.dataset.src}'>`;
        }

        // replicate the internal image zoom control
        zoomOverlay(e) {
            const src = e.target.dataset.src;
            const control = `url('data:image/svg+xml,<svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="arrow-up-right-and-arrow-down-left-from-center" class="svg-inline--fa fa-arrow-up-right-and-arrow-down-left-from-center " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M496 0h-160C327.2 0 320 7.156 320 16S327.2 32 336 32h121.4l-164.7 164.7c-6.25 6.25-6.25 16.38 0 22.62s16.38 6.25 22.62 0L480 54.63V176C480 184.8 487.2 192 496 192S512 184.8 512 176v-160C512 7.156 504.8 0 496 0zM196.7 292.7L32 457.4V336C32 327.2 24.84 320 16 320S0 327.2 0 336v160C0 504.8 7.156 512 16 512h160C184.8 512 192 504.8 192 496S184.8 480 176 480H54.63l164.7-164.7c6.25-6.25 6.25-16.38 0-22.62S202.9 286.4 196.7 292.7z"></path></svg>')`;
            const dialog = document.createElement('dialog');
            const clone = e.target.cloneNode(false);
            const style = document.createElement('style');
            style.textContent = `
                dialog { padding: 0; border: 0; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 1rem; box-shadow: 0 1rem 2rem #0000003f; }
                dialog::backdrop { background-color: white; background-repeat: no-repeat; background-image: ${control}; background-position: top 2rem right 2rem; background-size: 2rem; }
            `;
            document.body.appendChild(style);
            clone.removeAttribute('width');
            clone.removeAttribute('height');
            clone.src = clone.dataset.src;
            clone.style.width = '100%';
            clone.style.cursor = 'zoom-out';
            dialog.appendChild(clone);
            document.body.appendChild(dialog);
            dialog.addEventListener('close', (event) => { dialog.remove(); style.remove(); });
            dialog.addEventListener('click', (event) => { dialog.close('click'); });
            dialog.showModal();
        }

        init() {
            // ensure supporting css exists
            if (!document.querySelector(`style[frumbert-carousel]`)) { // only needs one instance
                const cssTag = document.createElement('style');
                cssTag.setAttribute('frumbert-carousel', !0);
                cssTag.textContent = `div[frumbert-carousel]{
                  *{box-sizing: border-box;}
                  position:relative;width:100%;overflow:hidden;
                  figure.slide {
                    margin-block-start:0;margin-block-end:0;margin-inline-start:0;margin-inline-end:0;margin:0;padding:0;
                    position:absolute;width:100%;height:100%;background-size:cover;background-position:center;opacity:0;z-index:1;pointer-events:none;
                    transition:box-shadow .5s linear;overflow:hidden;
                    figcaption {
                      position:absolute;bottom:1rem;left:1rem;width:auto;
                      em{font-style:italic;}
                      strong{font-weight:bold}
                      &:not(:empty) {
                        background-color:var(--bg);backdrop-filter:blur(.5rem);color:var(--fg);padding:1rem;max-width:50%;border-radius:.5rem
                      }
                    }
                    &.active {
                      box-shadow:0 0 2rem var(--bg);opacity:1;pointer-events:auto
                    }
                    img {
                      cursor:zoom-in;
                      max-width:100%;
                    }
                  }
                  .slice{
                    position:absolute;opacity:0;background-repeat:no-repeat;pointer-events:none;z-index:2
                  }
                  .slide,.slice{
                    will-change:opacity,transform
                  }
                }
                .carousel-slides{transition:all .5s ease-in-out;}`;
                document.body.appendChild(cssTag);
            }
            this.slider.closest('div[data-block-id]').setAttribute('frumbert-carousel', !0);

            // Initialize slides - create anew to avoid rise bindings
            this.slides.forEach((slide, i) => {
                const div = slide.parentNode;
                const figure = document.createElement('figure');
                const img = slide.querySelector('img');
                if (slide.querySelector('figcaption')) {
                  const caption = document.createElement('figcaption');
                  caption.innerHTML = slide.querySelector('figcaption').querySelector('p')?.parentNode?.innerHTML || '';
                  figure.appendChild(caption);
                }
                for (const attr of div.attributes) figure.setAttribute(attr.name,attr.value);
                figure.removeAttribute('class');
                figure.removeAttribute('hidden');
                figure.removeAttribute('inert');
                figure.classList.add('slide');
                figure.dataset.src = img.src;
                figure.dataset.w = img.width;
                figure.dataset.h = img.height;
                this.slider.appendChild(figure);
                if (i === 0) {
                  figure.classList.add('active');
                  this.adjustSliderHeight(figure);
                }
                this._getAverageColour(figure.dataset.src).then((c) => {
                  figure.style.setProperty('--bg', c.average);
                  figure.style.setProperty('--fg', c.contrast);
                }).catch(err => console.warn);
                if (this.config.zoom) {
                    figure.insertAdjacentHTML('afterbegin', this.zoomContent(figure, i)); // creates the transparent dummy image
                    figure.querySelector('img').addEventListener('click', this.zoomOverlay);
                }
                slide.remove();
            });
            Array.from(this.slider.querySelectorAll('div')).forEach((el) => { el.remove() });

            this.slides = this.slider.querySelectorAll('figure'); // same name, different dom nodes

            // Consume event listeners for navigation buttons
            [this.config.previous, this.config.next].forEach((el, index) => {
                if (el instanceof HTMLElement) {
                    el.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); this.showNextSlide(index === 0 ? -1 : 1) });
                }
            });

            // clicking on a dot takes you to the slide
            if (this.config.dots) {
              Array.from(this.config.dots.querySelectorAll('button')).forEach((el, index) => {
                el.addEventListener('click', (e) => { e.preventDefault(); this.goToSlide(index); });
              });
            }

            // Recalculate height on window resize
            window.addEventListener('resize', () => {
                this.adjustSliderHeight(this.slides[this.current]);
            });

            // touch swipes
            this.addSwipeListener();
        }

        addSwipeListener() {
          let touchStartX = 0;
          let touchEndX = 0;
          const minSwipeDistance = 50; // minimum distance for a swipe

          this.slider.addEventListener('touchstart', (e) => {
              touchStartX = e.touches[0].clientX;
          }, false);

          this.slider.addEventListener('touchend', (e) => {
              touchEndX = e.changedTouches[0].clientX;
              handleSwipe();
          }, false);

          const handleSwipe = () => {
              const swipeDistance = touchEndX - touchStartX;
              
              // Only trigger if the swipe is long enough
              if (Math.abs(swipeDistance) >= minSwipeDistance) {
                  if (swipeDistance > 0) {
                      // Swiped right to left
                      this.showNextSlide(-1);
                  } else {
                      // Swiped left to right
                      this.showNextSlide(1);
                  }
              }
          };
      }

        adjustSliderHeight(slideElement) {
          if (slideElement.dataset.src) {
            slideElement.style.backgroundImage = `url('${slideElement.dataset.src}')`;
          }
          if (slideElement.dataset.w && slideElement.dataset.h) {
            const aspectRatio = parseFloat(slideElement.dataset.h) / parseFloat(slideElement.dataset.w);
            const containerWidth = this.slider.offsetWidth;
            this.slider.style.height = `${containerWidth * aspectRatio}px`;
          } else {
            const src = slideElement.getAttribute('data-src');
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.naturalHeight / img.naturalWidth;
                const containerWidth = this.slider.offsetWidth;
                this.slider.style.height = `${containerWidth * aspectRatio}px`;
            };
            img.src = src;
          }
        }

        createSlice(data, width, height, left, top, delay, shape) {
            const slice = document.createElement('div');
            slice.className = `slice ${shape}`;
            slice.style.width = `${width}px`;
            slice.style.height = `${height}px`;
            slice.style.left = `${left}px`;
            slice.style.top = `${top}px`;
            slice.style.backgroundImage = `url('${data.nextImageURL}')`;
            slice.style.backgroundSize = `${data.sliderWidth}px ${data.sliderHeight}px`;
            slice.style.backgroundPosition = `-${left}px -${top}px`;
            return { el: slice, delay };
        }

        shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        rando(data) {
            let ar = this.squares(data);
            let delays = ar[0].map(item => item.delay);
            this.shuffle(delays);
            ar[0].forEach((item, index) => {
                item.delay = delays[index];
            });
            return ar;
        }

        squares(data) {
            const slices = [];
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const delay = data.reversed ? (this.rows - 1 - r + this.cols - 1 - c) * this.config.interval : (r + c) * this.config.interval;
                    slices.push(this.createSlice(data, data.sliceWidth, data.sliceHeight, c * data.sliceWidth, r * data.sliceHeight, delay, 'square'));
                }
            }
            const maxDelay = (this.rows + this.cols - 2) * this.config.interval + this.config.fadeDuration;
            return [slices, maxDelay];
        }

        vbeams(data) {
            const slices = [];
            for (let c = 0; c < this.cols; c++) {
                const delay = data.reversed ? (this.cols - 1 - c) * this.config.interval : c * this.config.interval;
                slices.push(this.createSlice(data, data.sliceWidth, data.sliderHeight, c * data.sliceWidth, 0, delay, 'vbeam'));
            }
            const maxDelay = (this.cols - 2) * this.config.interval + this.config.fadeDuration;
            return [slices, maxDelay];
        }

        hbeams(data) {
            const slices = [];
            for (let r = 0; r < this.rows; r++) {
                const delay = data.reversed ? (this.rows - 1 - r) * this.config.interval : r * this.config.interval;
                slices.push(this.createSlice(data, data.sliderWidth, data.sliceHeight, 0, r * data.sliceHeight, delay, 'hbeam'));
            }
            const maxDelay = (this.rows - 2) * this.config.interval + this.config.fadeDuration;
            return [slices, maxDelay];
        }

        fade(data) {
            const slices = [];
            slices.push(this.createSlice(data, data.sliderWidth, data.sliderHeight, 0, 0, this.config.interval, 'fade'));
            const maxDelay = this.config.interval + this.config.fadeDuration;
            return [slices, maxDelay];
        }

        goToSlide(slideNumber) {
            const targetIndex = slideNumber; //  - 1;
            if (targetIndex < 0 || targetIndex >= this.slides.length) {
                console.warn(`Invalid slide number: ${slideNumber}`);
                return;
            }
            let difference = targetIndex - this.current;
            if (Math.abs(difference) > this.slides.length / 2) {
                if (difference > 0) {
                    difference = difference - this.slides.length;
                } else {
                    difference = difference + this.slides.length;
                }
            }
            this.showNextSlide(difference);
        }

        showNextSlide(n) {
            const prev = this.current;

            // Increment in positive/negative direction, looping
            this.current = (this.current + ~~n) % this.slides.length;
            if (this.current < 0) this.current = this.slides.length - 1;

            // Pick a random number of divisions
            this.rows = Math.floor(Math.random() * (this.config.maxRows - 2)) + 2;
            this.cols = Math.floor(Math.random() * (this.config.maxCols - 2)) + 2;

            const currentSlide = this.slides[prev];
            const nextSlide = this.slides[this.current];
            const sliderWidth = this.slider.clientWidth;
            const sliderHeight = this.slider.clientHeight;
            const data = {
                sliderWidth,
                sliderHeight,
                sliceWidth: (sliderWidth / this.cols).toFixed(),
                sliceHeight: (sliderHeight / this.rows).toFixed(),
                nextImageURL: nextSlide.getAttribute('data-src'),
                reversed: Math.random() < 0.5
            };

            // Create a mapping of pattern names to their corresponding functions
            const patternFunctions = {
                squares: this.squares.bind(this),
                vbeams: this.vbeams.bind(this),
                hbeams: this.hbeams.bind(this),
                fade: this.fade.bind(this),
                rando: this.rando.bind(this)
            };

            // Validate config.patterns against patternFunctions
            const validPatterns = this.config.patterns.filter(pattern => patternFunctions[pattern]);

            // Select a random pattern and call the corresponding function
            const randomPattern = validPatterns[Math.floor(Math.random() * validPatterns.length)];
            const [transitionUnits, maxDelay] = patternFunctions[randomPattern](data);

            // Render the transition
            for (const slide of transitionUnits) {
                this.slider.appendChild(slide.el);
                setTimeout(() => {
                    slide.el.style.transition = `opacity ${this.config.fadeDuration}ms ease`;
                    slide.el.style.opacity = 1;
                }, slide.delay);
            }

            // Cleanup the transition and prepare for the next slide
            setTimeout(() => {
                nextSlide.classList.add('active');
                this.updateDots();

                // Hide current slide
                currentSlide.style.transition = 'none';
                currentSlide.classList.remove('active');
                currentSlide.offsetHeight; // Force reflow
                currentSlide.style.transition = '';

                transitionUnits.forEach(slice => {
                    slice.el.remove();
                });
                this.adjustSliderHeight(nextSlide);
            }, maxDelay);
        }

        updateDots() {
            if (!this.config.dots) return;
            this.config.dots.closest('.carousel').style.setProperty('--carousel-active-index', this.current);
            this.config.dots.querySelectorAll('path').forEach((el, index) => {
                el.setAttribute('d', index === this.current ? this.config.dotShapes.current : this.config.dotShapes.other);
            });
        }

        async _getAverageColour(src) {
            return new Promise((resolve, reject) => {
                const imgEl = new Image();
                const defaultValue = {
                    average: "#7f7f7f7f",
                    contrast: 'black'
                };
                imgEl.onerror = () => resolve(defaultValue);
                imgEl.onload = function () {
                    let blockSize = 32,
                        canvas = document.createElement('canvas'),
                        context = canvas.getContext && canvas.getContext('2d'),
                        i = -4,
                        rgb = { r: 0, g: 0, b: 0 },
                        count = 0,
                        contrast = 'black',
                        pixels = null,
                        brightness = 0;

                    if (!context) resolve(defaultValue);
                    canvas.width = imgEl.naturalWidth || imgEl.offsetWidth;
                    canvas.height = imgEl.naturalHeight || imgEl.offsetHeight;
                    context.drawImage(imgEl, 0, 0);
                    try {
                        pixels = context.getImageData(0, 0, canvas.width, canvas.height);
                    } catch (e) {
                        return resolve(defaultValue);
                    }
                    if (!pixels?.data) return resolve(defaultValue);
                    // console.trace(pixels);
                    while ((i += blockSize * 4) < pixels.data.length) {
                        ++count;
                        rgb.r += pixels.data[i];
                        rgb.g += pixels.data[i + 1];
                        rgb.b += pixels.data[i + 2];
                    }
                    brightness = (Math.max(0, Math.min(255, parseInt(~~(rgb.r / count), 10))) * 299) +
                        (Math.max(0, Math.min(255, parseInt(~~(rgb.g / count), 10))) * 587) +
                        (Math.max(0, Math.min(255, parseInt(~~(rgb.b / count), 10))) * 114);
                    brightness = brightness / 255000;
                    contrast = brightness >= 0.5 ? 'black' : 'white';
                    resolve({
                        average: `#${[
                            ("0" + Math.max(0, Math.min(255, parseInt(~~(rgb.r / count), 10))).toString(16)).substr(-2),
                            ("0" + Math.max(0, Math.min(255, parseInt(~~(rgb.g / count), 10))).toString(16)).substr(-2),
                            ("0" + Math.max(0, Math.min(255, parseInt(~~(rgb.b / count), 10))).toString(16)).substr(-2),
                            '3f'
                        ].join("")}`,
                        contrast
                    });
                };
                imgEl.src = src;
            });
        }
    }

    /* ----------------------------------------------*/

    // make a side-by-side comparison image control
    function SideBySide(node, blockData) {
        if (node.hasAttribute('data-mighty-comparison') || node.classList.contains('sparkle-fountain')) return;
        new Comparison(node.dataset.blockId, {
            handle: '<svg xmlns="http://www.w3.org/2000/svg" width="32" viewBox="-1 0 19 19"><path d="M16.42 9.58A7.92 7.92 0 1 1 8.5 1.66a7.92 7.92 0 0 1 7.92 7.92zm-2.5-.56-2.77-2.77a.8.8 0 0 0-1.12 1.12l1.42 1.42H5.54l1.41-1.42a.8.8 0 0 0-1.12-1.12L3.07 9.02a.8.8 0 0 0 0 1.12l2.77 2.77a.8.8 0 1 0 1.12-1.12l-1.42-1.42h5.9l-1.4 1.42a.8.8 0 0 0 1.11 1.12l2.77-2.77a.8.8 0 0 0 0-1.12z"/></svg>',
            style: {
                'border-radius': '50%',
                'background-image': 'linear-gradient(#5092A8,#004668)',
                'border': '1px solid #002D427f',
                'box-shadow': '0 5px 10px #00000020'
            },
            initial: '66%'
        });
    }

    // re-render the carousel with random slide-change effects
    function Carousel(node, blockData) {

        const block = node.closest('div[data-block-id]');
        if (block.hasAttribute('frumbert-carousel') || node.classList.contains('sparkle-fountain')) return;
        if (blockData.family !== 'gallery') return;

        // we like the dots but they are bound to scripts which don't work here - recreating them breaks the binding
        const dots = node.querySelector('.carousel-controls-items'); if (dots) {
            const cci = dots.cloneNode(true);
            const p = dots.parentNode;
            p.appendChild(cci);
            dots.remove();
        }

        // Here's a thing. RISE does not create <figcaption> elements inside the <figure> until slightly before the slide is rendered. Because 🤷🏼
        // So we need the blockData just to get the captions, and write them ourselves.
        const container = node.querySelector('.carousel-slides');
        const figures = container.querySelectorAll('figure');
        for (let i=0;i<figures.length;i++) {
          const fc = document.createElement('figcaption');
          fc.innerHTML = blockData.items[i].caption;
          if (fc.textContent.length>0) {
            figures[i].appendChild(fc);
          }
        }

        const fbc = new FrumbertCarousel(container, {
            previous: node.querySelector('button.carousel-controls-prev'),
            next: node.querySelector('button.carousel-controls-next'),
            zoom: blockData.settings.zoomOnClick,
            dots: block.querySelector('.carousel-controls-items')
        });
    }

    // make an image drunk
    function Bleary(node, blockData) {
        const block = node.closest('div[data-block-id]');
        ((img) => {
            let style = document.getElementById('drunken-css');
            if (!style) {
              style = document.createElement('style');
              style.id = 'drunken-css';
              document.body.appendChild(style);
              style.textContent = `
                #bleary-wrapper {
                  display: inline-block;
                  position: relative;
                }
                #bleary-eyed {
                  display: block;
                  max-width: 100%;
                  height: auto;
                }
                .ripple-overlay {
                  position: absolute;
                  top: 0;
                  left: 0;
                  pointer-events: none;
                }
                .ripple-layer {
                  position: absolute;
                  left: 0;
                  width: 100%;
                  background-repeat: repeat;
                  pointer-events: none;
                }
                `;
            }

            const wrap = document.createElement('div'); wrap.id = 'bleary-wrapper';
            img.insertAdjacentElement('beforebegin', wrap); wrap.appendChild(img); img.id = 'bleary-eyed';
            let overlay, width, height, rippleLayers = [];

            // overkill? absolutely.
            function getNextFibonacci(current) {
                const φ = (1 + Math.sqrt(5)) / 2; // Phi (golden ratio, you know, 3,4,5, triangles, pythagoras? anybody? oknvm)
                const n = Math.round(Math.log(current * Math.sqrt(5)) / Math.log(φ)); // Find position of current number in sequence
                return Math.round(φ ** (n + 1) / Math.sqrt(5)); // Calculate next number using Binet's formula. reminds me, I must take the bins out.
            }

            let hasRun = false;

            img.onload = () => {
                hasRun = true;
                const rect = img.getBoundingClientRect();
                width = Math.round(rect.width);
                height = Math.round(rect.height);

                // Build overlay
                overlay = document.createElement('div');
                overlay.className = 'ripple-overlay';
                overlay.style.width = width + 'px';
                overlay.style.height = height + 'px';
                overlay.style.backgroundImage = `url('${img.src}')`;
                overlay.style.backgroundSize = `${width}px ${height}px`;

                const wrapper = document.getElementById('bleary-wrapper');
                wrapper.style.width = width + 'px';
                wrapper.style.height = height + 'px';
                wrapper.appendChild(overlay);

                // Create ripple layers
                const startY = 2; // Math.floor(height / 2);
                let currentTop = startY;
                let currentHeight = 1;

                // incrementally grow
                while (currentTop < height) {
                    let layerHeight = currentHeight;
                    if (currentTop + layerHeight > height) {
                        layerHeight = height - currentTop;
                    }

                    const layer = document.createElement('div');
                    layer.className = 'ripple-layer';
                    layer.style.height = layerHeight + 'px';
                    layer.style.top = currentTop + 'px';
                    layer.style.backgroundImage = `url('${img.src}')`;
                    layer.style.backgroundSize = `${width}px ${height}px`;
                    layer.style.opacity = .66;

                    // 🔁 Flip vertically by computing the mirrored region
                    const flippedTop = height - (currentTop + layerHeight);
                    layer.style.backgroundPosition = `center -${flippedTop}px`;

                    overlay.appendChild(layer);
                    rippleLayers.push(layer);

                    currentTop += layerHeight;
                    currentHeight *= 1.5;
                    // currentHeight += getNextFibonacci(currentHeight);
                }

                requestAnimationFrame(animate);
            };

            if (img.complete && !hasRun) {
              // console.info('ill do it myself then');
              const evt = new Event('load');
              img.dispatchEvent(evt);
            }

            let time = 0;
            const yspeed = 0.02;
            const xspeed = 0.04;

            function animate() {
                time += 1;

                rippleLayers.forEach((layer) => {
                    const top = parseFloat(layer.style.top);
                    const layerHeight = layer.offsetHeight;

                    const verticalAmplitude = 4; // magic numbers ftw
                    const horizontalAmplitude = 11;
                    const frequency = 0.01;

                    const yOffset = Math.sin(time * yspeed + top * frequency) * verticalAmplitude; // wibbly wobbly
                    const xOffset = Math.sin(time * xspeed + top * frequency * 0.5) * horizontalAmplitude; // timey wimey

                    const depthRatio = (top - height / 2) / (height / 2);
                    const scaleFactor = 1 + depthRatio * (Math.sin(time * frequency) * 0.005); // i think I'm gonna throw up .. 
                    const bgWidth = width * scaleFactor;
                    const bgHeight = height * scaleFactor;

                    const newX = -xOffset + (width - bgWidth) / 2;
                    const newY = -top - yOffset + (height - bgHeight) / 2;

                    layer.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
                    layer.style.backgroundPosition = `${newX}px ${newY}px`;
                });

                requestAnimationFrame(animate);
            }
        })(block.querySelector('img'));
    }

    // drips and drops effect
    function Dropple(node, blockData) {
        const block = node.closest('div[data-block-id]');
        Array.from(block.querySelectorAll('img')).forEach((img) => {
            const image = document.createElement('img'); image.src = img.src; image.width = img.width; image.height = img.height;
            img.replaceWith(image);
            const container = image.closest('.img');
            if (container) {
              container.appendChild(image);
              Array.from(container.childNodes).forEach(el => el!==image && el.remove()); // away wif ye
            }
            image.parentNode.style.position = 'relative';
            const obj = new Image();
            obj.crossOrigin = "anonymous";
            obj.onload = () => { waterRipple(obj, image) };
            obj.src = image.src;
            // waterRipple(image);
        });


        /**
        * Water ripple effect.
        * modded by tim to actually work with Rise - async image loading and such
        * Original code (Java) by Neil Wallis 
        * @link http://www.neilwallis.com/java/water.html
        * 
        * @author Sergey Chikuyonok (serge.che@gmail.com)
        * @link http://chikuyonok.ru
        */
        function waterRipple(img, node) {
            var canvas = document.createElement('canvas'),
                /** @type {CanvasRenderingContext2D} */
                ctx = canvas.getContext('2d', {willReadFrequently: true}),
                width = node.width,
                height = node.height,
                half_width = width >> 1,
                half_height = height >> 1,
                size = width * (height + 2) * 2,
                delay = 30,
                oldind = width,
                newind = width * (height + 3),
                riprad = 13,
                ripplemap = [],
                last_map = [],
                ripple,
                texture,
                line_width = 20,
                step = line_width * 2,
                count = height / line_width;

            canvas.style.position = 'absolute';
            canvas.style.zIndex = 1;
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, node.width, node.height);
            canvas.style.left = img.offsetLeft + 'px';
            canvas.style.top = img.offsetTop + 'px';

            node.parentNode.insertBefore(canvas, node);

            texture = ctx.getImageData(0, 0, width, height); // console.dir(texture);
            ripple = ctx.getImageData(0, 0, width, height); // console.dir(ripple);

            for (var i = 0; i < size; i++) {
                last_map[i] = ripplemap[i] = 0;
            }

            /**
            * Main loop
            */
            function run() {
                newframe();
                ctx.putImageData(ripple, 0, 0);
                requestAnimationFrame(run);
            }

            /**
            * Disturb water at specified point
            */
            function disturb(dx, dy) {
                dx <<= 0;
                dy <<= 0;

                // console.log('disturb', canvas, dx, dy);

                for (var j = dy - riprad; j < dy + riprad; j++) {
                    for (var k = dx - riprad; k < dx + riprad; k++) {
                        ripplemap[oldind + (j * width) + k] += 128;
                    }
                }
            }

            /**
            * Generates new ripples
            */
            function newframe() {
                var a, b, data, cur_pixel, new_pixel, old_data;

                var t = oldind; oldind = newind; newind = t;
                var i = 0;

                // create local copies of variables to decrease
                // scope lookup time in Firefox
                var _width = width,
                    _height = height,
                    _ripplemap = ripplemap,
                    _last_map = last_map,
                    _rd = ripple.data,
                    _td = texture.data,
                    _half_width = half_width,
                    _half_height = half_height;

                for (var y = 0; y < _height; y++) {
                    for (var x = 0; x < _width; x++) {
                        var _newind = newind + i, _mapind = oldind + i;
                        data = (
                            _ripplemap[_mapind - _width] +
                            _ripplemap[_mapind + _width] +
                            _ripplemap[_mapind - 1] +
                            _ripplemap[_mapind + 1]) >> 1;

                        data -= _ripplemap[_newind];
                        data -= data >> 5;

                        _ripplemap[_newind] = data;

                        //where data=0 then still, where data>0 then wave
                        data = 1024 - data;

                        old_data = _last_map[i];
                        _last_map[i] = data;

                        if (old_data != data) {
                            //offsets
                            a = (((x - _half_width) * data / 1024) << 0) + _half_width;
                            b = (((y - _half_height) * data / 1024) << 0) + _half_height;

                            //bounds check
                            if (a >= _width) a = _width - 1;
                            if (a < 0) a = 0;
                            if (b >= _height) b = _height - 1;
                            if (b < 0) b = 0;

                            new_pixel = (a + (b * _width)) * 4;
                            cur_pixel = i * 4;

                            _rd[cur_pixel] = _td[new_pixel];
                            _rd[cur_pixel + 1] = _td[new_pixel + 1];
                            _rd[cur_pixel + 2] = _td[new_pixel + 2];
                        }

                        ++i;
                    }
                }
            }

            canvas.onmousemove = function (/* Event */ evt) {
                disturb(evt.offsetX || evt.layerX, evt.offsetY || evt.layerY);
            };

            requestAnimationFrame(run);
            // setInterval(run, delay);

            // generate random ripples
            var rnd = Math.random;
            setInterval(function () {
                disturb(rnd() * width, rnd() * height);
            }, 700);

        };

    }

    /* ----------------------------------------------*/

    function RunMods(blockData) {
      MODS.forEach((mod) => {
          if (!mod.called) {
              if (mod.block) mod.match = `div[data-block-id='${mod.block}']`;
              const node = document.querySelector(mod.match);
              if (mod.once) {
                  mod.fn(node, blockData);
                  mod.called = true;
                  return;
              } else if (node && mod.block && mod.block === blockData.id) {
                  mod.fn(node, blockData);
                  mod.called = true;
              } else if (node && !mod.block) {
                  mod.fn(node);
                  mod.called = true;
              }
          }
      });
    }

    // listen to the React state store changing (triggers when pages change or when users interact)
    if (!window.__MODLOADER__.getRiseStateStore) {
        window.__MODLOADER__.getRiseStateStore = () => {
            return new Promise((resolve) => {
                const app = document.querySelector("#app");
                const interval = setInterval(() => {
                    const key = Object.keys(app)
                        .filter((keyName) =>
                            keyName.includes("__reactContainer")
                        )
                        .pop();
                    if (key) {
                        clearInterval(interval);
                        const traverse = (element) => {
                            const store =
                                element?.memoizedState?.element?.props?.store ||
                                element?.pendingProps?.store ||
                                element?.stateNode?.store;
                            if (store) {
                                resolve(store);
                            }
                            if (element.child) {
                                traverse(element.child);
                            }
                        };
                        const internalRoot = app[key];
                        traverse(internalRoot);
                    }
                }, 100);
            });
        };
    }
    const store = await window.__MODLOADER__.getRiseStateStore();
    store.subscribe(() => {
        const state = store.getState();
        const id = state?.courseProgress?.currentLesson || location.href.split('/').pop();
        if (state && id) {
            const lesson = state.course.lessons.filter((el) => { return el.id === id });
            if (lesson && lesson[0]) {
                for (const block of lesson[0].items) {
                    RunMods(block);
                }
            }
        }
    });
})();