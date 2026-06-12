(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_SCROLL_SYNC_RUNTIME = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  function createDefaultTimerHost() {
    return {
      now: () => Date.now(),
      setTimeout: root.setTimeout?.bind(root) || setTimeout,
      clearTimeout: root.clearTimeout?.bind(root) || clearTimeout,
    };
  }

  function createScrollSyncGate(timerHost = createDefaultTimerHost()) {
    const blockedUntil = new Map();
    const timers = new Map();
    let debounceTimer = null;

    function block(source, durationMs) {
      const until = timerHost.now() + durationMs;
      blockedUntil.set(source, until);

      const existing = timers.get(source);
      if (existing !== undefined) {
        timerHost.clearTimeout(existing);
      }

      timers.set(source, timerHost.setTimeout(() => {
        if ((blockedUntil.get(source) || 0) <= timerHost.now()) {
          blockedUntil.delete(source);
          timers.delete(source);
        }
      }, durationMs));
    }

    function isBlocked(source) {
      const sources = Array.isArray(source) ? source : [source];
      const now = timerHost.now();
      return sources.some((item) => (blockedUntil.get(item) || 0) > now);
    }

    function clearDebounce() {
      if (debounceTimer !== null) {
        timerHost.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    }

    function debounce(callback, delayMs) {
      clearDebounce();
      debounceTimer = timerHost.setTimeout(() => {
        debounceTimer = null;
        callback();
      }, delayMs);
    }

    return {
      block,
      clearDebounce,
      debounce,
      isBlocked,
    };
  }

  function findHeadingForSourceLine(headings, line) {
    let target = null;
    for (const heading of headings) {
      const headingLine = Number(heading.dataset?.sourceLine);
      if (!Number.isFinite(headingLine)) {
        continue;
      }

      if (headingLine <= line) {
        target = heading;
        continue;
      }

      break;
    }

    return target;
  }

  return {
    createScrollSyncGate,
    findHeadingForSourceLine,
  };
});
