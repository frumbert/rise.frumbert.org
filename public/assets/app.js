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

async function app() {
  setupCodeClipboard();
  checkOverflow();
  addFontSizeAdjustment();
}

async function main() {
  return await app();
}

main();