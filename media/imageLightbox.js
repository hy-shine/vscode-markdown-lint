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
    let lastTrigger = null;

    function setup(previewContent) {
      const images = previewContent.querySelectorAll('img');
      for (const img of images) {
        if (!img.getAttribute('src') || img.closest('a')) {
          continue;
        }

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

      const figure = documentRef.createElement('figure');
      figure.classList.add('image-lightbox-frame');

      const image = documentRef.createElement('img');
      image.classList.add('image-lightbox-image');
      image.alt = '';

      const caption = documentRef.createElement('figcaption');
      caption.classList.add('image-lightbox-caption');
      caption.hidden = true;

      figure.appendChild(image);
      figure.appendChild(caption);
      lightbox.appendChild(closeButton);
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
