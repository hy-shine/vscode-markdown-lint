(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_IMAGE_LIGHTBOX = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  function createImageLightbox(options = {}) {
    const documentRef = options.document || root.document;
    const body = documentRef.body;
    const zoomStep = 0.15;
    const minScale = 0.25;
    const maxScale = 6;
    let lastTrigger = null;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    function setup(previewContent) {
      const images = previewContent.querySelectorAll('img');
      for (const img of images) {
        if (img.__mdlintImageLightboxBound || !img.getAttribute('src') || img.closest('a')) {
          continue;
        }

        img.__mdlintImageLightboxBound = true;
        img.classList.add('preview-image-lightbox-trigger');
        img.tabIndex = 0;
        img.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          open(img.currentSrc || img.src, img.alt || '', img);
        });
        img.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') {
            return;
          }

          e.preventDefault();
          open(img.currentSrc || img.src, img.alt || '', img);
        });
      }
    }

    function open(src, alt, trigger) {
      const lightbox = ensure();
      const image = lightbox.querySelector('.image-lightbox-image');
      const caption = lightbox.querySelector('.image-lightbox-caption');
      const closeButton = lightbox.querySelector('.image-lightbox-close');
      if (!image) {
        return;
      }

      lastTrigger = trigger || null;
      resetImageView(image);
      image.src = src;
      image.alt = alt;
      if (caption) {
        caption.textContent = alt;
        caption.hidden = !alt;
      }
      lightbox.classList.add('is-open');
      body.classList.add('has-image-lightbox');
      closeButton?.focus();
    }

    function closeIfOpen() {
      const lightbox = documentRef.getElementById('image-lightbox');
      if (!lightbox?.classList.contains('is-open')) {
        return false;
      }

      close();
      return true;
    }

    function close() {
      const lightbox = documentRef.getElementById('image-lightbox');
      if (!lightbox) {
        return;
      }

      const image = lightbox.querySelector('.image-lightbox-image');
      if (image) {
        image.removeAttribute('src');
        image.removeAttribute('alt');
      }
      const caption = lightbox.querySelector('.image-lightbox-caption');
      if (caption) {
        caption.replaceChildren();
        caption.hidden = true;
      }
      lightbox.classList.remove('is-open');
      body.classList.remove('has-image-lightbox');
      lastTrigger?.focus?.();
      lastTrigger = null;
    }

    function resetImageView(image) {
      scale = 1;
      panX = 0;
      panY = 0;
      isPanning = false;
      applyImageTransform(image);
      image.style.cursor = 'grab';
    }

    function zoomImage(image, nextScale) {
      scale = Math.min(Math.max(nextScale, minScale), maxScale);
      applyImageTransform(image);
    }

    function applyImageTransform(image) {
      image.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    function bindImageInteractions(image) {
      image.style.transformOrigin = 'center center';
      image.style.touchAction = 'none';
      image.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) {
          return;
        }
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        image.style.cursor = 'grabbing';
        image.setPointerCapture?.(e.pointerId);
      });
      image.addEventListener('pointermove', (e) => {
        if (!isPanning) {
          return;
        }
        e.preventDefault();
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyImageTransform(image);
      });
      image.addEventListener('pointerup', (e) => finishPanning(image, e));
      image.addEventListener('pointercancel', (e) => finishPanning(image, e));
      image.addEventListener('dblclick', () => resetImageView(image));
      image.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomImage(image, scale + (e.deltaY < 0 ? zoomStep : -zoomStep));
      }, { passive: false });
    }

    function finishPanning(image, e) {
      if (!isPanning) {
        return;
      }
      isPanning = false;
      if (e?.pointerId !== undefined && image.hasPointerCapture?.(e.pointerId)) {
        image.releasePointerCapture?.(e.pointerId);
      }
      image.style.cursor = 'grab';
    }

    function ensure() {
      let lightbox = documentRef.getElementById('image-lightbox');
      if (lightbox) {
        return lightbox;
      }

      lightbox = documentRef.createElement('div');
      lightbox.id = 'image-lightbox';
      lightbox.classList.add('image-lightbox');
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-label', 'Image preview');

      const closeButton = documentRef.createElement('button');
      closeButton.classList.add('image-lightbox-close');
      closeButton.setAttribute('type', 'button');
      closeButton.setAttribute('aria-label', 'Close image preview');
      closeButton.textContent = '\u00d7';

      const toolbar = documentRef.createElement('div');
      toolbar.classList.add('image-lightbox-toolbar');

      const zoomIn = createToolButton('image-lightbox-zoom-in', 'Zoom image in', '+');
      const zoomOut = createToolButton('image-lightbox-zoom-out', 'Zoom image out', '\u2212');
      const reset = createToolButton('image-lightbox-reset', 'Reset image view', 'Reset');
      toolbar.appendChild(zoomOut);
      toolbar.appendChild(reset);
      toolbar.appendChild(zoomIn);

      const figure = documentRef.createElement('figure');
      figure.classList.add('image-lightbox-frame');

      const image = documentRef.createElement('img');
      image.classList.add('image-lightbox-image');
      image.alt = '';
      bindImageInteractions(image);
      zoomIn.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomImage(image, scale + zoomStep);
      });
      zoomOut.addEventListener('click', (e) => {
        e.stopPropagation();
        zoomImage(image, scale - zoomStep);
      });
      reset.addEventListener('click', (e) => {
        e.stopPropagation();
        resetImageView(image);
      });

      const caption = documentRef.createElement('figcaption');
      caption.classList.add('image-lightbox-caption');
      caption.hidden = true;

      figure.appendChild(image);
      figure.appendChild(caption);
      lightbox.appendChild(closeButton);
      lightbox.appendChild(toolbar);
      lightbox.appendChild(figure);

      lightbox.addEventListener('click', (e) => {
        const target = e.target;
        if (target === lightbox || target?.closest?.('.image-lightbox-close')) {
          close();
        }
      });

      body.appendChild(lightbox);
      return lightbox;
    }

    function createToolButton(className, label, text) {
      const button = documentRef.createElement('button');
      button.classList.add('image-lightbox-tool');
      button.classList.add(className);
      button.setAttribute('type', 'button');
      button.setAttribute('aria-label', label);
      button.textContent = text;
      return button;
    }

    return {
      close,
      closeIfOpen,
      ensure,
      open,
      setup,
    };
  }

  return {
    createImageLightbox,
  };
});
