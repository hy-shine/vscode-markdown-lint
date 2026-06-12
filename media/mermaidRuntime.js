(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_MERMAID_RUNTIME = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  const MERMAID_SECURITY_LEVEL = 'antiscript';

  function createMermaidRenderSession() {
    let currentToken = 0;

    function start() {
      currentToken += 1;
      return currentToken;
    }

    return {
      start,
      isCurrent: (token) => token === currentToken,
    };
  }

  function getCapture(options) {
    if (typeof options === 'boolean') {
      return options;
    }

    return Boolean(options?.capture);
  }

  function withSignal(options, signal) {
    if (typeof options === 'boolean') {
      return { capture: options, signal };
    }

    return { ...(options || {}), signal };
  }

  function createEventListenerScope(environment = root) {
    const AbortControllerClass = environment?.AbortController;
    const controller = typeof AbortControllerClass === 'function'
      ? new AbortControllerClass()
      : null;
    const listeners = [];
    let aborted = false;

    function add(target, type, listener, options = {}) {
      if (controller) {
        target.addEventListener(type, listener, withSignal(options, controller.signal));
        return;
      }

      target.addEventListener(type, listener, options);
      listeners.push({
        target,
        type,
        listener,
        capture: getCapture(options),
      });
    }

    function abort() {
      if (aborted) {
        return;
      }

      aborted = true;
      if (controller) {
        controller.abort();
        return;
      }

      for (const item of listeners) {
        item.target.removeEventListener(item.type, item.listener, item.capture);
      }
      listeners.length = 0;
    }

    return {
      abort,
      add,
    };
  }

  return {
    MERMAID_SECURITY_LEVEL,
    createEventListenerScope,
    createMermaidRenderSession,
  };
});
