// Observer to ensure only one flashcard is flipped at a time. apply to a flashcard block.
const wrapper = blockElement.querySelector('ol.block-flashcards__wrapper');

if (!wrapper) {
  console.warn('This extension only works on flashcards');
  return;
}

let debounceTimer = null;

function debounceFlipCheck(target) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const allFlashcards = wrapper.querySelectorAll('li.flashcard');
    allFlashcards.forEach((card) => {
      if (card !== target && card.classList.contains('flashcard--flipped')) {
        card.classList.remove('flashcard--flipped');
        card.querySelectorAll('.flashcard-side--flipped').forEach(el=>el.classList.remove('flashcard-side--flipped'));
      }
    });
  }, 10); // 10ms delay should be enough to let all mutations settle
}

const flibserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      if (target.tagName === 'LI' && 
          target.classList.contains('flashcard') && 
          target.classList.contains('flashcard--flipped')) {        
        debounceFlipCheck(target);
      }
    }
  });
});

const flashcards = wrapper.querySelectorAll('li.flashcard');
flashcards.forEach((card) => {
  flibserver.observe(card, {
    attributes: true,
    attributeFilter: ['class']
  });
});