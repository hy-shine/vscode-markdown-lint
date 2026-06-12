(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_CODE_BLOCK_CONTROLS = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  const COPIED_RESET_DELAY_MS = 1600;
  const FAILED_RESET_DELAY_MS = 2000;

  function createCodeBlockControls(options = {}) {
    const copyFeedbackTimers = new WeakMap();
    const clipboard = options.clipboard || root.navigator?.clipboard;
    const setTimeoutFn = options.setTimeout || root.setTimeout?.bind(root) || setTimeout;
    const clearTimeoutFn = options.clearTimeout || root.clearTimeout?.bind(root) || clearTimeout;

    function setup(previewContent) {
      setupCodeCopyButtons(previewContent);
      setupCodeFoldButtons(previewContent);
    }

    function setupCodeCopyButtons(previewContent) {
      const copyButtons = previewContent.querySelectorAll('.code-copy-button');
      for (const button of copyButtons) {
        setCopyButtonState(button, 'idle');
        button.addEventListener('click', async (e) => {
          e.stopPropagation();
          const code = button.dataset.code;
          if (!code) {
            return;
          }

          try {
            await clipboard.writeText(code);
            setCopyButtonState(button, 'copied');
            queueCopyButtonReset(button, COPIED_RESET_DELAY_MS);
          } catch {
            setCopyButtonState(button, 'failed');
            queueCopyButtonReset(button, FAILED_RESET_DELAY_MS);
          }
        });
      }
    }

    function setupCodeFoldButtons(previewContent) {
      const foldButtons = previewContent.querySelectorAll('.code-fold-toggle');
      for (const button of foldButtons) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleCodeFoldButton(button);
        });
      }
    }

    function setCopyButtonState(button, state) {
      button.classList.toggle('copied', state === 'copied');
      button.classList.toggle('failed', state === 'failed');

      if (state === 'copied') {
        button.textContent = 'Copied';
        button.setAttribute('aria-label', 'Code copied');
        return;
      }

      if (state === 'failed') {
        button.textContent = 'Failed';
        button.setAttribute('aria-label', 'Copy failed');
        return;
      }

      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code');
    }

    function queueCopyButtonReset(button, delayMs) {
      const existing = copyFeedbackTimers.get(button);
      if (existing) {
        clearTimeoutFn(existing);
      }

      copyFeedbackTimers.set(button, setTimeoutFn(() => {
        setCopyButtonState(button, 'idle');
        copyFeedbackTimers.delete(button);
      }, delayMs));
    }

    function toggleCodeFoldButton(button) {
      const pre = button.closest('pre');
      if (!pre) {
        return;
      }

      const isFolded = pre.getAttribute('data-folded') === 'true';
      pre.setAttribute('data-folded', String(!isFolded));
      button.setAttribute('aria-expanded', String(isFolded));
      button.textContent = isFolded ? 'Collapse' : 'Expand';
      button.setAttribute('aria-label', isFolded ? 'Collapse code' : 'Expand code');
    }

    return {
      queueCopyButtonReset,
      setCopyButtonState,
      setup,
      setupCodeCopyButtons,
      setupCodeFoldButtons,
      toggleCodeFoldButton,
    };
  }

  return {
    createCodeBlockControls,
  };
});
