const vscode = acquireVsCodeApi();

const body = document.body;
const previewContent = document.getElementById('preview-content');
const tocList = document.getElementById('toc-list');
const outlineControl = document.getElementById('outline-control');
const outlineTrigger = document.getElementById('outline-trigger');
const floatingControls = document.getElementById('floating-controls');
const floatingTrigger = document.getElementById('floating-trigger');
const floatingMenu = document.getElementById('floating-menu');
const themeOptions = document.getElementById('theme-options');
const styleOptions = document.getElementById('style-options');
const formatButton = document.getElementById('format-button');
const exportButton = document.getElementById('export-button');
const floatingRefresh = document.getElementById('floating-refresh');
const themeValueEl = document.getElementById('theme-value');
const styleValueEl = document.getElementById('style-value');

let currentState = {
  themeMode: 'auto',
  previewStyle: 'default',
};

let isScrollingFromEditor = false;
let scrollSyncDebounce = null;
let suppressScrollSync = false;
let suppressScrollSyncTimer = null;

// --- Outline popup toggle ---
outlineTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  outlineControl.classList.toggle('is-open');
});

// --- Floating menu toggle ---
floatingTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = floatingControls.classList.toggle('is-open');
  floatingTrigger.setAttribute('aria-expanded', String(isOpen));
});

// --- Dismiss floating menu on outside click ---
document.addEventListener('click', (e) => {
  if (!floatingControls.contains(e.target)) {
    floatingControls.classList.remove('is-open');
    floatingTrigger.setAttribute('aria-expanded', 'false');
    collapseAllGroups();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    outlineControl.classList.remove('is-open');
    floatingControls.classList.remove('is-open');
    floatingTrigger.setAttribute('aria-expanded', 'false');
    collapseAllGroups();
  }
});

// --- Collapsible group toggle ---
floatingMenu.addEventListener('click', (e) => {
  const group = e.target.closest('.floating-menu-group');
  if (!group) { return; }
  e.stopPropagation();
  const wasExpanded = group.classList.contains('is-expanded');
  collapseAllGroups();
  if (!wasExpanded) {
    group.classList.add('is-expanded');
    group.setAttribute('aria-expanded', 'true');
  }
});

function collapseAllGroups() {
  for (const g of floatingMenu.querySelectorAll('.floating-menu-group.is-expanded')) {
    g.classList.remove('is-expanded');
    g.setAttribute('aria-expanded', 'false');
  }
}

// --- Theme option clicks ---
themeOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setThemeMode', value: item.dataset.value });
  collapseAllGroups();
});

// --- Style option clicks ---
styleOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setPreviewStyle', value: item.dataset.value });
  collapseAllGroups();
});

// --- Refresh action ---
floatingRefresh.addEventListener('click', () => {
  floatingRefresh.classList.add('spinning');
  vscode.postMessage({ type: 'refreshPreview' });
  floatingRefresh.addEventListener('animationend', () => {
    floatingRefresh.classList.remove('spinning');
  }, { once: true });
});

// --- Export action ---
exportButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'exportHtml' });
  floatingControls.classList.remove('is-open');
  collapseAllGroups();
});

// --- Format action ---
formatButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'formatDocument' });
  floatingControls.classList.remove('is-open');
  collapseAllGroups();
});

previewContent.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) {
    return;
  }

  const href = link.getAttribute('href');
  if (!href) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  if (href.startsWith('#')) {
    const target = document.getElementById(href.slice(1));
    target?.scrollIntoView({ block: 'nearest' });
    return;
  }

  vscode.postMessage({ type: 'openLink', value: href });
});

window.addEventListener('message', (event) => {
  const message = event.data;

  if (message.type === 'scrollToLine') {
    isScrollingFromEditor = true;
    const line = message.value;
    const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let target = null;
    for (const heading of headings) {
      const headingLine = heading.dataset.sourceLine;
      if (headingLine !== undefined && Number(headingLine) <= line) {
        target = heading;
      } else {
        break;
      }
    }
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    setTimeout(() => { isScrollingFromEditor = false; }, 120);
    return;
  }

  if (message.type !== 'render') {
    return;
  }

  const state = message.payload;
  currentState = state;
  document.title = state.title;
  if (state.baseUrl) {
    let base = document.querySelector('base');
    if (!base) {
      base = document.createElement('base');
      document.head.appendChild(base);
    }
    base.href = state.baseUrl;
  }
  setBodyPresentation(state.themeMode, state.previewStyle);
  syncFloatingMenu(state.themeMode, state.previewStyle);
  previewContent.innerHTML = state.html;
  renderToc(state.toc);
  renderMermaidDiagrams();
  setupCodeCopyButtons();
  setupCodeFoldButtons();
  updateActiveTocLink();
});

function setBodyPresentation(themeMode, previewStyle) {
  body.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  body.classList.remove('style-default', 'style-github', 'style-notion', 'style-tokyo-night', 'style-obsidian', 'style-paper', 'style-typora');
  body.classList.add(`theme-${themeMode}`);
  body.classList.add(`style-${previewStyle}`);
}

function syncFloatingMenu(themeMode, previewStyle) {
  for (const item of themeOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === themeMode);
  }
  for (const item of styleOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === previewStyle);
  }
  if (themeValueEl) {
    const themeLabels = { auto: 'System', light: 'Light', dark: 'Dark' };
    themeValueEl.textContent = themeLabels[themeMode] || themeMode;
  }
  if (styleValueEl) {
    styleValueEl.textContent = previewStyle.charAt(0).toUpperCase() + previewStyle.slice(1).replace('-', ' ');
  }
}

function renderToc(items) {
  tocList.innerHTML = '';

  for (const item of items) {
    const link = document.createElement('a');
    link.href = `#${item.slug}`;
    link.textContent = item.text;
    link.className = 'toc-link';
    link.style.paddingLeft = `${(item.level - 1) * 12 + 8}px`;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      vscode.postMessage({ type: 'revealLine', value: item.line });
      const target = document.getElementById(item.slug);
      target?.scrollIntoView({ block: 'nearest' });
      highlightTocItem(item.slug);
      suppressScrollSync = true;
      if (suppressScrollSyncTimer) {
        clearTimeout(suppressScrollSyncTimer);
      }
      suppressScrollSyncTimer = setTimeout(() => {
        suppressScrollSync = false;
      }, 400);
    });
    tocList.appendChild(link);
  }
}

window.addEventListener('scroll', () => {
  if (!suppressScrollSync) {
    updateActiveTocLink();
  }

  if (isScrollingFromEditor || suppressScrollSync) {
    return;
  }

  if (scrollSyncDebounce !== null) {
    clearTimeout(scrollSyncDebounce);
  }

  scrollSyncDebounce = setTimeout(() => {
    if (isScrollingFromEditor || suppressScrollSync) {
      return;
    }

    const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const areaRect = { top: 0, bottom: window.innerHeight };
    let bestHeading = null;
    let bestOffset = Infinity;

    for (const heading of headings) {
      const rect = heading.getBoundingClientRect();
      const offset = rect.top - areaRect.top;
      if (offset <= 80 && offset > -rect.height) {
        if (80 - offset < bestOffset) {
          bestOffset = 80 - offset;
          bestHeading = heading;
        }
      }
    }

    if (bestHeading && bestHeading.dataset.sourceLine !== undefined) {
      vscode.postMessage({ type: 'syncEditorScroll', value: Number(bestHeading.dataset.sourceLine) });
    }
  }, 80);
});

async function renderMermaidDiagrams() {
  const mermaidBlocks = previewContent.querySelectorAll('code.language-mermaid');
  if (mermaidBlocks.length === 0) {
    return;
  }

  const mermaid = await loadMermaid();
  if (!mermaid) {
    replaceMermaidBlocksWithError(mermaidBlocks, 'Mermaid failed to load');
    return;
  }

  try {
    mermaid.initialize(getMermaidConfig());
  } catch (error) {
    console.error('Mermaid initialize failed with themed config, falling back.', error);
    try {
      mermaid.initialize(getFallbackMermaidConfig());
    } catch (fallbackError) {
      console.error('Mermaid fallback initialize failed.', fallbackError);
      replaceMermaidBlocksWithError(mermaidBlocks, 'Mermaid rendering unavailable');
      return;
    }
  }

  for (const block of mermaidBlocks) {
    const pre = block.parentElement;
    if (!pre) {
      continue;
    }

    const source = block.textContent;
    if (!source) {
      continue;
    }

    try {
      const { svg } = await mermaid.render(`mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, source);
      const container = document.createElement('div');
      container.className = 'mermaid-diagram';
      container.dataset.style = currentState.previewStyle;
      container.innerHTML = svg;
      applyMermaidDesignTokens(container);
      enhanceMermaidSvg(container, source);
      pre.replaceWith(container);
      setupMermaidInteraction(container);
    } catch (error) {
      console.error('Mermaid render failed.', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'mermaid-error';
      const msg = error?.message || error?.str || String(error);
      errorDiv.innerHTML = `<strong>Mermaid rendering failed</strong><br><span class="mermaid-error-detail">${escapeMermaidHtml(msg)}</span>`;
      pre.replaceWith(errorDiv);
    }
  }
}

function highlightTocItem(slug) {
  const links = tocList.querySelectorAll('.toc-link');
  for (const link of links) {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${slug}`);
  }
}

function updateActiveTocLink() {
  const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const areaRect = { top: 0, bottom: window.innerHeight };
  let activeId = null;

  const isAtBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 40;

  for (const heading of headings) {
    const rect = heading.getBoundingClientRect();
    if (rect.top <= areaRect.top + 80) {
      activeId = heading.id;
    }
  }

  if (!activeId && isAtBottom) {
    for (let i = headings.length - 1; i >= 0; i--) {
      const rect = headings[i].getBoundingClientRect();
      if (rect.top < areaRect.bottom) {
        activeId = headings[i].id;
        break;
      }
    }
  }

  const links = tocList.querySelectorAll('.toc-link');
  for (const link of links) {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('is-active', isActive);
  }
}

function getCssVar(name, fallback = '') {
  const value = getComputedStyle(body).getPropertyValue(name).trim();
  return value || fallback;
}

function isPreviewDarkAppearance() {
  return body.classList.contains('theme-dark') || (body.classList.contains('theme-auto') && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function isPaperStyle() {
  return body.classList.contains('style-paper');
}

function getMermaidDesignTokens() {
  const fontFamily = getComputedStyle(previewContent).fontFamily || getComputedStyle(body).fontFamily;
  const isDark = isPreviewDarkAppearance();
  const isPaper = isPaperStyle();

  // Hardcoded palette for guaranteed readability.
  // Dark mode: deep gray background, light gray nodes, bright text.
  // Light mode: off-white background, white nodes, dark text.
  // Paper mode: even flatter, no shadows, tighter geometry.
  if (isDark) {
    return {
      fontFamily,
      isDark: true,
      curve: 'basis',
      nodeRadius: 8,
      clusterRadius: 12,
      lineWidth: 1.2,
      // Surfaces
      background: '#1e1e1e',
      nodeFill: '#2a2d33',
      nodeFillAlt: '#32353c',
      clusterFill: '#25282e',
      labelFill: '#1e1e1e',
      noteFill: '#2a2d33',
      // Text (guaranteed bright)
      text: '#e8eaed',
      textSoft: '#9aa0a6',
      textOnAccent: '#1e1e1e',
      // Lines
      edge: '#5f6368',
      edgeActive: '#8ab4f8',
      // Borders
      border: '#3c4043',
      borderStrong: '#5f6368',
      // Shadows (minimal)
      shellShadow: '0 1px 3px rgba(0,0,0,0.24)',
      shellHoverShadow: '0 2px 6px rgba(0,0,0,0.32)',
    };
  }

  return {
    fontFamily,
    isDark: false,
    curve: 'basis',
    nodeRadius: 8,
    clusterRadius: 12,
    lineWidth: 1.2,
    // Surfaces
    background: '#f8f9fa',
    nodeFill: '#ffffff',
    nodeFillAlt: '#f1f3f4',
    clusterFill: '#f1f3f4',
    labelFill: '#f8f9fa',
    noteFill: '#ffffff',
    // Text (guaranteed dark)
    text: '#202124',
    textSoft: '#5f6368',
    textOnAccent: '#ffffff',
    // Lines
    edge: '#dadce0',
    edgeActive: '#1a73e8',
    // Borders
    border: '#dadce0',
    borderStrong: '#9aa0a6',
    // Shadows (minimal)
    shellShadow: '0 1px 2px rgba(60,64,67,0.08)',
    shellHoverShadow: '0 1px 3px rgba(60,64,67,0.14)',
  };
}

function applyMermaidDesignTokens(container) {
  let design = getMermaidDesignTokens();
  if (isPaperStyle()) {
    design = {
      ...design,
      nodeRadius: 3,
      clusterRadius: 4,
      lineWidth: 1.0,
      shellShadow: 'none',
      shellHoverShadow: 'none',
    };
  }
  const variables = {
    '--mdlint-mermaid-bg': design.background,
    '--mdlint-mermaid-node-bg': design.nodeFill,
    '--mdlint-mermaid-node-bg-alt': design.nodeFillAlt,
    '--mdlint-mermaid-cluster-bg': design.clusterFill,
    '--mdlint-mermaid-label-bg': design.labelFill,
    '--mdlint-mermaid-note-bg': design.noteFill,
    '--mdlint-mermaid-text': design.text,
    '--mdlint-mermaid-text-soft': design.textSoft,
    '--mdlint-mermaid-edge': design.edge,
    '--mdlint-mermaid-edge-active': design.edgeActive,
    '--mdlint-mermaid-border': design.border,
    '--mdlint-mermaid-border-strong': design.borderStrong,
    '--mdlint-mermaid-shell-shadow': design.shellShadow,
    '--mdlint-mermaid-shell-hover-shadow': design.shellHoverShadow,
    '--mdlint-mermaid-node-radius': `${design.nodeRadius}px`,
    '--mdlint-mermaid-cluster-radius': `${design.clusterRadius}px`,
    '--mdlint-mermaid-line-width': `${design.lineWidth}px`,
  };

  for (const [name, value] of Object.entries(variables)) {
    container.style.setProperty(name, value);
  }
}

function addClassToAll(root, selector, className) {
  for (const element of root.querySelectorAll(selector)) {
    element.classList.add(className);
  }
}

function roundSvgRects(root, selector, radius) {
  for (const rect of root.querySelectorAll(selector)) {
    rect.setAttribute('rx', String(radius));
    rect.setAttribute('ry', String(radius));
  }
}

function detectMermaidDiagramType(source) {
  const normalized = source.trim();
  if (normalized.startsWith('sequenceDiagram')) {
    return 'sequence';
  }
  if (normalized.startsWith('classDiagram')) {
    return 'class';
  }
  if (normalized.startsWith('stateDiagram')) {
    return 'state';
  }
  if (normalized.startsWith('erDiagram')) {
    return 'er';
  }
  if (normalized.startsWith('journey')) {
    return 'journey';
  }
  if (normalized.startsWith('gantt')) {
    return 'gantt';
  }
  if (normalized.startsWith('pie')) {
    return 'pie';
  }
  if (normalized.startsWith('mindmap')) {
    return 'mindmap';
  }
  if (normalized.startsWith('timeline')) {
    return 'timeline';
  }
  return 'flowchart';
}

function enhanceMermaidSvg(container, source) {
  const svg = container.querySelector('svg');
  if (!svg) {
    return;
  }

  const diagramType = detectMermaidDiagramType(source);
  container.dataset.diagramType = diagramType;
  svg.classList.add('mdlint-mermaid-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
  svg.setAttribute('role', 'img');
  svg.dataset.diagramType = diagramType;

  const title = svg.querySelector('title');
  if (title?.textContent) {
    svg.setAttribute('aria-label', title.textContent.trim());
  }

  addClassToAll(svg, '.node', 'mdlint-mermaid-node');
  addClassToAll(svg, '.node rect, .node polygon, .node circle, .node ellipse, .node path', 'mdlint-mermaid-node-shape');
  addClassToAll(svg, '.cluster', 'mdlint-mermaid-cluster');
  addClassToAll(svg, '.cluster rect', 'mdlint-mermaid-cluster-shape');
  addClassToAll(svg, '.edgePath .path, .flowchart-link, path.relation, path.messageLine0, path.messageLine1, .transition', 'mdlint-mermaid-edge-path');
  addClassToAll(svg, 'marker path', 'mdlint-mermaid-arrow');
  addClassToAll(svg, '.edgeLabel', 'mdlint-mermaid-edge-label');
  addClassToAll(svg, '.edgeLabel rect, .labelBkg', 'mdlint-mermaid-label-bg');
  addClassToAll(svg, '.note rect, .note path', 'mdlint-mermaid-note-shape');
  addClassToAll(svg, '.actor rect, .actor path', 'mdlint-mermaid-actor-shape');
  addClassToAll(svg, '.classBox rect, .classBox path', 'mdlint-mermaid-class-shape');
  addClassToAll(svg, 'text, tspan', 'mdlint-mermaid-text');
  addClassToAll(svg, '.nodeLabel, .node foreignObject div, .node foreignObject span, .node foreignObject p', 'mdlint-mermaid-node-label');
  addClassToAll(svg, '.edgeLabel foreignObject div, .edgeLabel foreignObject span, .edgeLabel foreignObject p, .cluster-label foreignObject div, .cluster-label foreignObject span, .cluster-label foreignObject p', 'mdlint-mermaid-badge');

  const design = getMermaidDesignTokens();
  const isPaper = isPaperStyle();
  const nodeRadius = isPaper ? 3 : design.nodeRadius;
  const clusterRadius = isPaper ? 4 : design.clusterRadius;
  roundSvgRects(svg, '.node rect', nodeRadius);
  roundSvgRects(svg, '.cluster rect', clusterRadius);
  roundSvgRects(svg, '.edgeLabel rect, .labelBkg', 999);
  roundSvgRects(svg, '.actor rect, .classBox rect, .note rect', Math.max(4, nodeRadius - 2));
}

function getMermaidConfig() {
  const design = getMermaidDesignTokens();

  // Use 'base' theme with hardcoded hex values for guaranteed readability.
  const themeVariables = {
    background: design.background,
    fontFamily: design.fontFamily,
    fontSize: '14px',
    // Nodes (primary)
    primaryColor: design.nodeFill,
    primaryTextColor: design.text,
    primaryBorderColor: design.borderStrong,
    // Nodes (secondary)
    secondaryColor: design.nodeFillAlt,
    secondaryTextColor: design.text,
    secondaryBorderColor: design.border,
    // Background level
    tertiaryColor: design.background,
    tertiaryTextColor: design.text,
    tertiaryBorderColor: design.border,
    // Lines
    lineColor: design.edge,
    // Clusters
    clusterBkg: design.clusterFill,
    clusterBorder: design.border,
    // Edge labels
    edgeLabelBackground: design.labelFill,
    edgeLabelText: design.text,
    // Sequence diagram
    actorBkg: design.nodeFillAlt,
    actorBorder: design.border,
    actorTextColor: design.text,
    actorLineColor: design.border,
    signalColor: design.edge,
    signalTextColor: design.textSoft,
    // Notes
    noteBkgColor: design.noteFill,
    noteTextColor: design.text,
    noteBorderColor: design.borderStrong,
    // Labels
    labelBoxBkgColor: design.labelFill,
    labelBoxBorderColor: design.border,
    labelTextColor: design.text,
    // Rounding
    nodeBorderRadius: design.nodeRadius,
    // Class diagram
    classText: design.text,
    classColor: design.nodeFill,
    classBorder: design.border,
    // Gantt
    taskBkgColor: design.nodeFillAlt,
    taskTextColor: design.text,
    activeTaskBkgColor: design.edgeActive,
    activeTaskTextColor: design.text,
    gridColor: design.border,
    todayLineColor: design.edgeActive,
    // Pie
    pie1: design.edgeActive,
    pie2: design.borderStrong,
    pie3: design.nodeFillAlt,
    pie4: design.noteFill,
    pie5: design.clusterFill,
    pie6: design.text,
    pie7: design.labelFill,
  };

  return {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables,
    flowchart: {
      curve: design.curve,
      htmlLabels: true,
      nodeSpacing: 28,
      rankSpacing: 40,
      padding: 14,
    },
    sequence: {
      diagramMarginX: 28,
      diagramMarginY: 20,
      actorMargin: 36,
      messageMargin: 24,
    },
    gantt: {
      leftPadding: 84,
      topPadding: 36,
      barHeight: 28,
    },
    journey: {
      diagramMarginX: 28,
      diagramMarginY: 20,
    },
  };
}

function getFallbackMermaidConfig() {
  const isDark = isPreviewDarkAppearance();
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: isDark ? 'dark' : 'default',
    flowchart: {
      htmlLabels: true,
    },
  };
}

function replaceMermaidBlocksWithError(blocks, message) {
  for (const block of blocks) {
    const pre = block.parentElement;
    if (!pre) {
      continue;
    }
    const errorDiv = document.createElement('div');
    errorDiv.className = 'mermaid-error';
    errorDiv.textContent = message;
    pre.replaceWith(errorDiv);
  }
}

const SVG_ZOOM_IN  = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>';
const SVG_ZOOM_OUT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="8" x2="13" y2="8"/></svg>';
const SVG_RESET    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5A5.5 5.5 0 1 1 3.5 10"/><polyline points="2.5 2.5 2.5 6.5 6.5 6.5"/></svg>';
const SVG_CLOSE    = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

function setupMermaidInteraction(container) {
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

  function applyTransform() {
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function zoomTo(newScale) {
    scale = Math.min(Math.max(newScale, 0.3), 5);
    applyTransform();
  }

  // Zoom controls (top-right +/− buttons)
  if (!container.querySelector('.mermaid-zoom-controls')) {
    const controls = document.createElement('div');
    controls.className = 'mermaid-zoom-controls';

    const btnIn = document.createElement('button');
    btnIn.className = 'mermaid-zoom-btn mermaid-zoom-in';
    btnIn.innerHTML = SVG_ZOOM_IN;
    btnIn.setAttribute('aria-label', 'Zoom in');
    btnIn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomTo(scale * 1.25);
    });

    const btnOut = document.createElement('button');
    btnOut.className = 'mermaid-zoom-btn mermaid-zoom-out';
    btnOut.innerHTML = SVG_ZOOM_OUT;
    btnOut.setAttribute('aria-label', 'Zoom out');
    btnOut.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomTo(scale / 1.25);
    });

    const btnReset = document.createElement('button');
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

  // Pan with mouse drag
  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) { return; }
    isPanning = true;
    hasDragged = false;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    svg.style.cursor = 'grabbing';
    svg.style.transition = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isPanning) { return; }
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    hasDragged = true;
    applyTransform();
  });
  document.addEventListener('mouseup', () => {
    if (!isPanning) { return; }
    isPanning = false;
    svg.style.cursor = 'grab';
    svg.style.transition = 'transform 0.15s ease';
  });

  // Double-click to reset
  svg.addEventListener('dblclick', () => {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  });

  // Click to fullscreen
  container.addEventListener('click', (e) => {
    if (e.detail === 2) { return; } // skip double-click
    if (container.classList.contains('mermaid-fullscreen-content')) { return; }
    if (hasDragged) {
      hasDragged = false;
      return;
    }
    if (scale !== 1 || panX !== 0 || panY !== 0) { return; } // skip if already zoomed/panned
    openMermaidFullscreen(container);
  });
}

function openMermaidFullscreen(container) {
  const overlay = document.createElement('div');
  overlay.className = 'mermaid-fullscreen-overlay';
  const clone = container.cloneNode(true);
  clone.classList.add('mermaid-fullscreen-content');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'mermaid-fullscreen-close';
  closeBtn.innerHTML = SVG_CLOSE;
  closeBtn.setAttribute('aria-label', 'Close fullscreen');
  closeBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); }
  });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handler);
    }
  });
  overlay.appendChild(clone);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  // Re-setup interaction on clone
  setupMermaidInteraction(clone);
}

function escapeMermaidHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadMermaid() {
  if (window.mermaid) {
    return window.mermaid;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = window.MDLINT_MERMAID_URI || 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      if (window.mermaid) {
        resolve(window.mermaid);
      } else {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

function setupCodeCopyButtons() {
  const copyButtons = previewContent.querySelectorAll('.code-copy-button');
  for (const button of copyButtons) {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      const code = button.dataset.code;
      if (!code) {
        return;
      }

      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 2000);
      } catch {
        button.textContent = 'Failed';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    });
  }
}

function setupCodeFoldButtons() {
  const foldButtons = previewContent.querySelectorAll('.code-fold-toggle');
  for (const button of foldButtons) {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const pre = button.closest('pre');
      if (!pre) { return; }
      const isFolded = pre.getAttribute('data-folded') === 'true';
      pre.setAttribute('data-folded', String(!isFolded));
      button.setAttribute('aria-expanded', String(isFolded));
      button.textContent = isFolded ? 'Collapse' : 'Expand';
    });
  }
}
