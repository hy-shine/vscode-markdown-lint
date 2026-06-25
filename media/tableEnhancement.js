(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_TABLE_ENHANCEMENT = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  function createTableEnhancement(options = {}) {
    const documentRef = options.document || root.document;

    function setup(previewContent) {
      const tables = previewContent.querySelectorAll('table');
      for (const table of tables) {
        enhanceTable(table);
      }
    }

    function enhanceTable(table) {
      if (!table.classList.contains('table-enhanced')) {
        table.classList.add('table-enhanced');
      }

      const wrapper = ensureWrapper(table);
      clearNumericColumns(table);
      markNumericColumns(table);
      updateOverflowState(wrapper);
      if (!wrapper.__mdlintTableEnhancementScrollBound) {
        wrapper.addEventListener('scroll', () => updateOverflowState(wrapper));
        wrapper.__mdlintTableEnhancementScrollBound = true;
      }
    }

    function ensureWrapper(table) {
      const parent = table.parentElement;
      if (parent?.classList?.contains('table-scroll')) {
        return parent;
      }

      const wrapper = documentRef.createElement('div');
      wrapper.classList.add('table-scroll');
      if (parent) {
        parent.insertBefore(wrapper, table);
      }
      wrapper.appendChild(table);
      return wrapper;
    }

    function markNumericColumns(table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      const matrix = rows.map((row) => Array.from(row.querySelectorAll('th, td')));
      const maxColumns = matrix.reduce((max, cells) => Math.max(max, cells.length), 0);

      for (let column = 0; column < maxColumns; column += 1) {
        const cells = matrix.map((cells) => cells[column]).filter(Boolean);
        if (cells.length < 2 || !isNumericColumn(cells)) {
          continue;
        }
        for (const cell of cells) {
          cell.classList.add('is-numeric');
        }
      }
    }

    function clearNumericColumns(table) {
      for (const cell of table.querySelectorAll('th, td')) {
        cell.classList.remove('is-numeric');
      }
    }

    function isNumericColumn(cells) {
      const bodyCells = cells.slice(1);
      if (bodyCells.length === 0) {
        return false;
      }
      let numericCount = 0;
      for (const cell of bodyCells) {
        const text = (cell.textContent || '').trim();
        if (!text) {
          continue;
        }
        if (isNumericText(text)) {
          numericCount += 1;
        }
      }
      return numericCount > 0 && numericCount / bodyCells.length >= 0.75;
    }

    function isNumericText(value) {
      return /^[+-]?(?:[$¥€£])?\s*\d[\d,\s]*(?:\.\d+)?\s*(?:%|[kmbt])?$/i.test(value);
    }

    function updateOverflowState(wrapper) {
      const overflow = wrapper.scrollWidth > wrapper.clientWidth + 1;
      const atStart = wrapper.scrollLeft <= 1;
      const atEnd = wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 1;

      setClass(wrapper, 'is-overflowing', overflow);
      setClass(wrapper, 'is-scrolled-start', overflow && !atStart);
      setClass(wrapper, 'is-scrolled-end', overflow && !atEnd);
    }

    function setClass(element, className, enabled) {
      if (enabled) {
        element.classList.add(className);
        return;
      }
      element.classList.remove(className);
    }

    return {
      setup,
    };
  }

  return {
    createTableEnhancement,
  };
});
