(() => {
  const interaction = "cme1d3c3a005h3bbsatnl4nam"; // the block id of the knowledge check
  function imagify(blockId) {
    Array.from(document.querySelectorAll(`[data-block-id="${blockId}"] span[data-matching-interaction-piece-content-inline]`)).forEach(span=>{
      const tx = span.textContent;
      if (tx.startsWith('image:')) {
        span.querySelector('span').innerHTML = `<img src="${tx.substring(6)}" style="max-width:100%">`;
      }
    });
  }
  (new MutationObserver(() => {
    imagify(interaction);
  })).observe(document.body, {
    childList: true,
    subtree: true,
  });
  imagify(interaction);
})();