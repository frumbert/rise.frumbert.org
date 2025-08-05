function setupCodeClipboard() {
  // console.log('setupCodeClipboard');
  // document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('pre > code').forEach(codeBlock => {
      // console.log('hljs on pre', codeBlock);
      const pre = codeBlock.parentNode;

      // Wrap <pre> in a container div
      const wrapper = document.createElement('div');
      wrapper.className = 'pre-wrapper';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      // Create the copy button
      const button = document.createElement('button');
      button.className = 'copy-btn';
      button.textContent = '📋';
      button.title = 'Copy to clipboard';

      wrapper.appendChild(button);

      button.addEventListener('click', () => {
        const text = codeBlock.innerText;

        // Prefer Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            showFeedback(button, '✅ Copied!');
          }).catch(() => {
            fallbackCopyText(text, button);
          });
        } else {
          fallbackCopyText(text, button);
        }
      });

      function fallbackCopyText(text, button) {
        // Create a hidden textarea for fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          const successful = document.execCommand('copy');
          showFeedback(button, successful ? '✅ Copied!' : '❌ Failed');
        } catch (err) {
          console.error('Fallback copy failed:', err);
          showFeedback(button, '❌ Error');
        }

        document.body.removeChild(textarea);
      }

      function showFeedback(button, message) {
        const original = button.textContent;
        button.textContent = message;
        setTimeout(() => (button.textContent = original), 2000);
      }
    });
 // });
}

function checkOverflow() {
  if (document.body.scrollHeight > window.innerHeight) {
    document.documentElement.style.setProperty('--sw', '8px'); // magic number for accounting for scrollbar width
  }
}

function addFontSizeAdjustment() {
  const cachedSize = localStorage.getItem('--font-size');
  if (cachedSize) document.documentElement.style.setProperty('--font-size', cachedSize + 'px');
  const ul = document.querySelector('body>nav>ul:last-of-type');
  ul.classList.add('font-size-adjust');
  ul.addEventListener('click', (event) => {
    event.preventDefault();
    AddFontSize(~~event.target.href.split('#')[1]);
  })
  function AddFontSize(delta) {
    let size = Math.min(Math.max(parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--font-size'),10) + delta, 10), 42);
    localStorage.setItem('--font-size', size)
    document.documentElement.style.setProperty('--font-size', size + 'px');
  }
}

// a thing where you mouse-over an image and it zooms up on it
// applies automatically if the width of the image exceeds its container.
function setupImageZoom() {
  document.querySelectorAll('article.article-body img').forEach(img => {
    if (!img.complete || img.naturalWidth <= img.clientWidth) return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'img-zoom-container';
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = img.clientWidth + 'px';
    wrapper.style.height = img.clientHeight + 'px';

    // Set image styles for zooming
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    // img.style.transition = 'transform 0.2s, max-width 0s, max-height 0s';
    img.style.cursor = 'zoom-in';
    img.style.display = 'block';

    // Insert wrapper
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    // Mouse events
    wrapper.addEventListener('mouseenter', () => {
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.cursor = 'zoom-out';
      //img.classList.add('natural');
      img.style.transform = `scale(${img.naturalWidth / img.clientWidth})`;
    });

    wrapper.addEventListener('mouseleave', () => {
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.transform = '';
      img.style.cursor = 'zoom-in';
      //img.classList.remove('natural');
    });

    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const scale = img.naturalWidth / img.clientWidth;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Calculate the max translation
      const maxX = img.naturalWidth - rect.width;
      const maxY = img.naturalHeight - rect.height;
      // Calculate the cursor's percent position
      const percentX = x / rect.width;
      const percentY = y / rect.height;
      // Calculate the translation so the zoomed image follows the cursor
      const translateX = -maxX * percentX;
      const translateY = -maxY * percentY;
      img.style.transformOrigin = 'top left';
      img.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    });
  });
}

function addRepo() {
  const a = document.createElement('a');
  a.href = 'https://github.com/frumbert/rise.frumbert.org';
  a.innerHTML = '<img src="/assets/github-svgrepo-com.svg" />';
  a.classList.add('gh-repo');
  document.body.appendChild(a);

  document.head.insertAdjacentHTML('beforeend', `<script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="meax3" data-color="#FFDD00" data-emoji=""  data-font="Cookie" data-text="🙌" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff" ></script>`);
  document.body.insertAdjacentHTML('beforeend', `<a href="https://www.buymeacoffee.com/meax3" target="_blank" style="position:fixed;left:calc(2rem + 40px);bottom:1rem"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important" ></a>`);


}

async function app() {
  setupCodeClipboard();
  checkOverflow();
  addFontSizeAdjustment();
  setupImageZoom();
  addRepo();
}

async function main() {
  return await app();
}

main();