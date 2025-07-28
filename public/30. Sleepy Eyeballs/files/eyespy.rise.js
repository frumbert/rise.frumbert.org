(() => {
  class EyeSpy {
    constructor (container, options) {
      this.container = container;
      this.settings = Object.assign({
        eyes: 2,
        iris: 16,
        pupil: 4,
        fg: 'black',
        bg: 'white',
        delay: 5000, //ms
        cssName: 'eyespy'
      }, options);
      this.maxDist = this.settings.iris - this.settings.pupil;
      for (let i=0; i<this.settings.eyes; i++) {
        this.container.innerHTML += `
          <div style='--delay:${this.settings.delay}ms;width:${this.settings.iris*2}px;height:${this.settings.iris*2}px;border-radius:${this.settings.iris}px;border:1px solid ${this.settings.fg};background:${this.settings.bg};' class='${this.settings.cssName}'>
            <span style='width:${this.settings.pupil*2}px;height:${this.settings.pupil*2}px;border-radius:${this.settings.pupil}px;background:${this.settings.fg};' data-pupil />
          </div>`;
      }
      this.pupils = container.querySelectorAll('[data-pupil]');
      document.addEventListener('mousemove',this.move.bind(this));
      if (!document.querySelector('[data-eye-style]')) {
        const style = document.createElement('style');
        style.dataset.eyeStyle = !0;
        style.textContent = `
        .${this.settings.cssName} {display:inline-block;position:relative;font-size:0;transition-delay:0;transition-duration:.2s;clip-path:ellipse(50% 50% at 50% 50%);
        &.snooze{border-color:red;clip-path:ellipse(50% 0 at 50% 100%);transition:clip-path 2s;transition-timing-function:cubic-bezier(0,1,.23,-0.2);transition-delay:var(--delay);}
        >span {position:absolute;top:50%;left:50%;}}`;
        document.head.appendChild(style);
      }
    }

    snooze(eye) {
      eye.classList.add('snooze');
    }

    move(e) {
      for (const el of this.pupils) {
          const eye = el.parentNode;
          eye.classList.remove('snooze');
          const midx = this.pos(eye, true) + this.settings.iris;
          const midy = this.pos(eye, false) + this.settings.iris;
          let distX = e.clientX + document.documentElement.scrollLeft - midx;
          let distY = e.clientY + document.documentElement.scrollTop - midy;
          const dist = Math.sqrt(Math.pow(distX, 2) + Math.pow(distY, 2));
          if (dist > this.maxDist) {
              const scale = this.maxDist / dist;
              distX *= scale;
              distY *= scale;
          }
          el.style.left = parseInt(distX + this.settings.iris - this.settings.pupil) + "px";
          el.style.top = parseInt(distY + this.settings.iris - this.settings.pupil) + "px";
          setTimeout(this.snooze, this.settings.delay/2, eye);
      }
    }

    pos(el,left) {
      let val = 0;
      while (el != null) {
          val += el["offset" + (left ? "Left" : "Top")];
          el = el.offsetParent;
      }
      return val;
    }
  }

  function main() {
    let el = document.querySelector('.lesson-header-wrap [eye-spy]');
    if (el instanceof HTMLElement) return;
    el = document.createElement('div');
    el.style = `position:fixed;top:0;right:${window.innerWidth - document.body.clientWidth}px;`;
    el.setAttribute('eye-spy',true);
    document.querySelector('.lesson-header-wrap').appendChild(el);
    new EyeSpy(el);
  }

  // Start observing the body for changes
  (new MutationObserver(() => {
    main();
  })).observe(document.body, {
    childList: true,
    subtree: true,
  });
  main()
})();