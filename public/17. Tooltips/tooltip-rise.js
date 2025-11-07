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
  function copyFontStylesFromAnchor(anchor, target) {
    if (!anchor || !target) return;
    const computed = window.getComputedStyle(anchor);
    const fontProperties = [
      "font-family",
      "font-size",
      "font-style",
      "font-weight",
      "line-height",
      "letter-spacing",
      "text-transform",
      "font-variant",
      "word-spacing",
    ];
    fontProperties.forEach(prop => {
      target.style.setProperty(prop, computed.getPropertyValue(prop));
    });
  }
  function findBlockAncestor(element) {
    let current = element.parentElement;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.display === "block" || style.display === "list-item" || style.display === "table") {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
  function findNextSupInBlock(anchor) {
    if (!anchor || !(anchor instanceof Element)) return null;
    const block = findBlockAncestor(anchor);
    if (!block) return null;
    const sups = block.querySelectorAll("sup,sub");
    for (const sup of sups) {
      if (anchor.compareDocumentPosition(sup) & Node.DOCUMENT_POSITION_FOLLOWING) {
        return sup; // First <sup> after the anchor in same block
      }
    }
    return null;
  }
  function initTooltips() {
    const anchors = document.querySelectorAll('a[href$="#tip"],a[href$="#hovertip"]');
    const options = {
      allowHTML: true,
      placement: 'top',
      theme: '${ttTheme}',
      arrow: true,
      flipOnUpdate: true,
      ignoreAttributes: true,
      hideOnClick: true
    };
    anchors.forEach(anchor => {
      const sup = findNextSupInBlock(anchor);
      if (sup) {
        delete options['trigger'];
        options['placement'] = sup.tagName==='SUB'?'bottom':'top';
        const span = document.createElement('span');
        span.textContent = sup.innerHTML;
        copyFontStylesFromAnchor(anchor,span);
        options['content'] = span.outerHTML;
        if (anchor.href.indexOf('#hover')===-1) {
          options['trigger'] = 'click';
        }
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
        anchor.href = 'javascript:void(0)';
        console.log(options);
        tippy(anchor, options);
        sup.remove();
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