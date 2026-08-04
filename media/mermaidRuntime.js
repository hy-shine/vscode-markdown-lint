(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_MERMAID_RUNTIME = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  const MERMAID_CDN_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js';
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

  function hasClass(classList, className) {
    return typeof classList?.contains === 'function' && classList.contains(className);
  }

  function isDarkPreviewAppearance(classList) {
    if (hasClass(classList, 'theme-dark')) {
      return true;
    }

    return false;
  }

  function getMermaidScriptSources(localSrc, fallbackSrc = MERMAID_CDN_SRC) {
    const sources = [];
    if (localSrc) {
      sources.push(localSrc);
    }
    if (!sources.includes(fallbackSrc)) {
      sources.push(fallbackSrc);
    }
    return sources;
  }

  function isMermaidApi(value) {
    return Boolean(value) && typeof value.initialize === 'function';
  }

  function createMermaidLoader(options) {
    let loadPromise = null;

    function load() {
      const existing = options.normalizeApi(options.getGlobal());
      if (existing) {
        return Promise.resolve(existing);
      }

      if (loadPromise) {
        return loadPromise;
      }

      loadPromise = options
        .loadScriptSequence(options.getScriptSources())
        .then((loaded) => {
          const api = options.normalizeApi(loaded);
          if (!api) {
            loadPromise = null;
          }
          return api;
        })
        .catch(() => {
          loadPromise = null;
          return null;
        });

      return loadPromise;
    }

    return { load };
  }

  function loadScriptSequence(environment, sources, globalName) {
    if (isMermaidApi(environment?.[globalName])) {
      return Promise.resolve(environment[globalName]);
    }

    return new Promise((resolve) => {
      let index = 0;

      function tryNext() {
        const src = sources[index++];
        if (!src) {
          resolve(null);
          return;
        }

        const script = environment.document.createElement('script');
        script.src = src;
        script.onload = () => {
          if (isMermaidApi(environment?.[globalName])) {
            resolve(environment[globalName]);
            return;
          }
          tryNext();
        };
        script.onerror = () => {
          tryNext();
        };
        environment.document.head.appendChild(script);
      }

      tryNext();
    });
  }

  return {
    MERMAID_CDN_SRC,
    MERMAID_SECURITY_LEVEL,
    createEventListenerScope,
    createMermaidLoader,
    createMermaidRenderSession,
    getMermaidScriptSources,
    isDarkPreviewAppearance,
    isMermaidApi,
    loadScriptSequence,
  };
});
