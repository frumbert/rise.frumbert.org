(() => {
  function imagify() {
    Array.from(document.querySelectorAll(`span[data-matching-interaction-piece-content-inline]`)).forEach(span=>{
      const tx = span.textContent;
      if (tx.startsWith('image:')) {
        span.querySelector('span').innerHTML = `<img src="${tx.substring(6)}" style="max-width:100%">`;
      }
    });
  }
  (new MutationObserver(() => {
    imagify();
  })).observe(document.body, {
    childList: true,
    subtree: true,
  });
  imagify();
})();