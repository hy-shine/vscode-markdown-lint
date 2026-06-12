(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_ACTIVE_HEADING = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  const DEFAULT_TOP_OFFSET = 80;

  function getActiveLineRootMargin(viewportHeight, topOffset = DEFAULT_TOP_OFFSET) {
    const bottomMargin = Math.max(0, Math.ceil(viewportHeight - topOffset - 1));
    const bottomValue = bottomMargin === 0 ? '0px' : `-${bottomMargin}px`;
    return `-${topOffset}px 0px ${bottomValue} 0px`;
  }

  function createActiveHeadingState(options = {}) {
    const topOffset = options.topOffset ?? DEFAULT_TOP_OFFSET;
    let headings = Array.from(options.headings || []);
    let activeHeading = null;
    let lastScrollY = 0;

    function getHeadingIndex(heading) {
      return headings.indexOf(heading);
    }

    function getPreviousHeading(heading) {
      const index = getHeadingIndex(heading);
      if (index <= 0) {
        return null;
      }
      return headings[index - 1];
    }

    function setHeadings(nextHeadings) {
      headings = Array.from(nextHeadings || []);
      if (!headings.includes(activeHeading)) {
        activeHeading = null;
      }
    }

    function setActiveHeading(heading) {
      activeHeading = headings.includes(heading) ? heading : null;
    }

    function applyIntersections(entries, scrollY = lastScrollY) {
      const isScrollingUp = scrollY < lastScrollY;
      lastScrollY = scrollY;

      const sortedEntries = Array.from(entries || []).sort((a, b) => {
        return getHeadingIndex(a.target) - getHeadingIndex(b.target);
      });

      for (const entry of sortedEntries) {
        if (!headings.includes(entry.target)) {
          continue;
        }

        const top = entry.boundingClientRect?.top ?? topOffset;
        if (entry.isIntersecting || top < topOffset) {
          activeHeading = entry.target;
          continue;
        }

        if (isScrollingUp) {
          activeHeading = getPreviousHeading(entry.target);
        }
      }

      return activeHeading;
    }

    return {
      applyIntersections,
      getActiveHeading: () => activeHeading,
      getHeadings: () => headings.slice(),
      setActiveHeading,
      setHeadings,
    };
  }

  function createActiveHeadingObserver(options = {}) {
    const topOffset = options.topOffset ?? DEFAULT_TOP_OFFSET;
    const getScrollY = options.getScrollY || (() => root.scrollY || 0);
    const getViewportHeight = options.getViewportHeight || (() => root.innerHeight || 0);
    const onActiveChange = options.onActiveChange || (() => {});
    const ObserverClass = options.ObserverClass
      || (typeof root.IntersectionObserver === 'function' ? root.IntersectionObserver : null);
    const state = createActiveHeadingState({ topOffset });
    let observer = null;

    function disconnect() {
      observer?.disconnect?.();
      observer = null;
    }

    function reset(headings) {
      disconnect();
      state.setHeadings(headings);

      if (!ObserverClass || state.getHeadings().length === 0) {
        return false;
      }

      observer = new ObserverClass((entries) => {
        const active = state.applyIntersections(entries, getScrollY());
        onActiveChange(active);
      }, {
        root: null,
        rootMargin: getActiveLineRootMargin(getViewportHeight(), topOffset),
        threshold: [0],
      });

      for (const heading of state.getHeadings()) {
        observer.observe(heading);
      }

      return true;
    }

    return {
      disconnect,
      getActiveHeading: state.getActiveHeading,
      isSupported: () => Boolean(ObserverClass),
      reset,
      setActiveHeading: state.setActiveHeading,
    };
  }

  return {
    createActiveHeadingObserver,
    createActiveHeadingState,
    getActiveLineRootMargin,
  };
});
