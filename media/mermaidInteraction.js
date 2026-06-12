(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_MERMAID_INTERACTION = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  const SVG_ZOOM_IN  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>';
  const SVG_ZOOM_OUT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="8" x2="13" y2="8"/></svg>';
  const SVG_RESET    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5A5.5 5.5 0 1 1 3.5 10"/><polyline points="2.5 2.5 2.5 6.5 6.5 6.5"/></svg>';
  const SVG_CLOSE    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

  function createMermaidInteraction(options = {}) {
    const documentRef = options.document || root.document;
    const openFullscreen = options.openFullscreen || (() => {});

    function setup(container) {
      let scale = 1;
      let panX = 0;
      let panY = 0;
      let isPanning = false;
      let hasDragged = false;
      let startX = 0;
      let startY = 0;
      const svg = container.querySelector('svg');
      if (!svg) { return; }

      svg.style.cursor = 'grab';
      svg.style.transformOrigin = 'center center';
      svg.style.transition = 'transform 0.15s ease';
      svg.style.touchAction = 'none';

      function applyTransform() {
        svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      }

      function zoomTo(newScale) {
        scale = Math.min(Math.max(newScale, 0.3), 5);
        applyTransform();
      }

      if (!container.querySelector('.mermaid-zoom-controls')) {
        const controls = documentRef.createElement('div');
        controls.className = 'mermaid-zoom-controls';

        const btnIn = documentRef.createElement('button');
        btnIn.className = 'mermaid-zoom-btn mermaid-zoom-in';
        btnIn.innerHTML = SVG_ZOOM_IN;
        btnIn.setAttribute('aria-label', 'Zoom in');
        btnIn.addEventListener('click', (e) => {
          e.stopPropagation();
          zoomTo(scale * 1.25);
        });

        const btnOut = documentRef.createElement('button');
        btnOut.className = 'mermaid-zoom-btn mermaid-zoom-out';
        btnOut.innerHTML = SVG_ZOOM_OUT;
        btnOut.setAttribute('aria-label', 'Zoom out');
        btnOut.addEventListener('click', (e) => {
          e.stopPropagation();
          zoomTo(scale / 1.25);
        });

        const btnReset = documentRef.createElement('button');
        btnReset.className = 'mermaid-zoom-btn mermaid-zoom-reset';
        btnReset.innerHTML = SVG_RESET;
        btnReset.setAttribute('aria-label', 'Reset zoom');
        btnReset.addEventListener('click', (e) => {
          e.stopPropagation();
          scale = 1;
          panX = 0;
          panY = 0;
          applyTransform();
        });

        controls.appendChild(btnIn);
        controls.appendChild(btnOut);
        controls.appendChild(btnReset);
        container.appendChild(controls);
      }

      svg.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) { return; }
        isPanning = true;
        hasDragged = false;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        svg.style.cursor = 'grabbing';
        svg.style.transition = 'none';
        svg.setPointerCapture?.(e.pointerId);
      });
      svg.addEventListener('pointermove', (e) => {
        if (!isPanning) { return; }
        e.preventDefault();
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        hasDragged = true;
        applyTransform();
      });

      function finishPanning(e) {
        if (!isPanning) { return; }
        isPanning = false;
        if (e?.pointerId !== undefined && svg.hasPointerCapture?.(e.pointerId)) {
          svg.releasePointerCapture?.(e.pointerId);
        }
        svg.style.cursor = 'grab';
        svg.style.transition = 'transform 0.15s ease';
      }

      svg.addEventListener('pointerup', finishPanning);
      svg.addEventListener('pointercancel', finishPanning);

      svg.addEventListener('dblclick', () => {
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform();
      });

      container.addEventListener('click', (e) => {
        if (e.detail === 2) { return; }
        if (container.classList.contains('mermaid-fullscreen-content')) { return; }
        if (hasDragged) {
          hasDragged = false;
          return;
        }
        if (scale !== 1 || panX !== 0 || panY !== 0) { return; }
        openFullscreen(container);
      });
    }

    return {
      setup,
    };
  }

  function createMermaidFullscreen(options = {}) {
    const documentRef = options.document || root.document;
    const environment = options.environment || root;
    const createEventListenerScope = options.createEventListenerScope;
    const setupInteraction = options.setupInteraction || (() => {});

    function createListenerScope() {
      if (typeof createEventListenerScope === 'function') {
        return createEventListenerScope(environment);
      }

      return {
        add(target, type, listener, listenerOptions) {
          target.addEventListener(type, listener, listenerOptions);
        },
        abort() {},
      };
    }

    function open(container) {
      const overlay = documentRef.createElement('div');
      overlay.className = 'mermaid-fullscreen-overlay';
      const listenerScope = createListenerScope();
      function closeOverlay() {
        listenerScope.abort();
        overlay.remove();
      }

      const clone = container.cloneNode(true);
      clone.classList.add('mermaid-fullscreen-content');
      clone.querySelector('.mermaid-zoom-controls')?.remove();
      const closeBtn = documentRef.createElement('button');
      closeBtn.className = 'mermaid-fullscreen-close';
      closeBtn.innerHTML = SVG_CLOSE;
      closeBtn.setAttribute('aria-label', 'Close fullscreen');
      closeBtn.addEventListener('click', closeOverlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { closeOverlay(); }
      });
      listenerScope.add(documentRef, 'keydown', (e) => {
        if (e.key === 'Escape') {
          closeOverlay();
        }
      });
      overlay.appendChild(clone);
      overlay.appendChild(closeBtn);
      documentRef.body.appendChild(overlay);
      setupInteraction(clone);
      return overlay;
    }

    return {
      open,
    };
  }

  return {
    createMermaidFullscreen,
    createMermaidInteraction,
  };
});
