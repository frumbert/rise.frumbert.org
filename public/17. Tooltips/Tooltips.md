## Creating pop-over balloons.

THis one is using a third party library called Tippy to create a pop-over ballon.

You edit the link to have the url #tip, and the following superscript becomes the content inside the balloon when the user clicks/hovers



```js
(() => {
    const ttTheme = "translucent";

    const tippyThemes = ['light', 'light-border', 'google', 'translucent'];
    if (tippyThemes.indexOf(ttTheme) !== -1) {
        const ln = document.createElement('link');
        ln.rel = "stylesheet";
        ln.href = `https://unpkg.com/tippy.js@4/themes/${ttTheme}.css`;
        document.body.appendChild(ln);
    }
    const sc = document.createElement('script');
    sc.type = 'module';
    sc.textContent = `
  import tippy from "https://esm.sh/tippy.js@4";
  function initTooltips() {
    const anchors = document.querySelectorAll('a[href$="#tip"]');
    console.log('anchors',anchors);
    anchors.forEach(anchor => {
      let node = anchor.nextSibling;

      while (node && node.nodeType === Node.TEXT_NODE && /^\s*$/.test(node.textContent)) {
        node = node.nextSibling;
      }

      if (node && node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SUP') {
        const tooltipHTML = node.innerHTML;

        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
        anchor.href = 'javascript:void(0)';

        tippy(anchor, {
          content: tooltipHTML,
          allowHTML: true,
          placement: 'top',
          theme: '${ttTheme}',
          arrow: true,
          flipOnUpdate: true,
          ignoreAttributes: true,
          trigger: "click",
          hideOnClick: true
        });

        // Remove the <sup> tag from the DOM
        node.remove();
      }
    });
  }
  (() => {
    (new MutationObserver(() => {
      initTooltips();
    })).observe(document.body, {
      childList: true,
      subtree: true,
    });
    initTooltips();
  })();
  `;
    document.body.appendChild(sc);
})();
```