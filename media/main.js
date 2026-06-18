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
const placementOptions = document.getElementById('placement-options');
const styleOptions = document.getElementById('style-options');
const formatButton = document.getElementById('format-button');
const exportButton = document.getElementById('export-button');
const floatingRefresh = document.getElementById('floating-refresh');
const themeValueEl = document.getElementById('theme-value');
const placementValueEl = document.getElementById('placement-value');
const styleValueEl = document.getElementById('style-value');

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

let currentState = {
  themeMode: 'auto',
  previewMode: 'beside',
  previewStyle: 'default',
  tocVisible: true,
};

const scrollSync = window.MDLINT_SCROLL_SYNC_RUNTIME.createScrollSyncGate();
let mermaidLoadPromise = null;
const mermaidRuntime = window.MDLINT_MERMAID_RUNTIME;
const mermaidEnhancement = window.MDLINT_MERMAID_ENHANCEMENT;
const mermaidFullscreen = window.MDLINT_MERMAID_INTERACTION.createMermaidFullscreen({
  createEventListenerScope: mermaidRuntime.createEventListenerScope,
  setupInteraction: setupMermaidInteraction,
});
const mermaidInteraction = window.MDLINT_MERMAID_INTERACTION.createMermaidInteraction({
  openFullscreen: mermaidFullscreen.open,
});
const mermaidRenderSession = mermaidRuntime.createMermaidRenderSession();
const codeBlockControls = window.MDLINT_CODE_BLOCK_CONTROLS.createCodeBlockControls();
const imageLightbox = window.MDLINT_IMAGE_LIGHTBOX.createImageLightbox();
let headingCache = [];
let lastSyncedSourceLine = null;
let activeHeadingTracker = window.MDLINT_ACTIVE_HEADING?.createActiveHeadingObserver?.({
  getScrollY: () => window.scrollY,
  getViewportHeight: () => window.innerHeight,
  onActiveChange: (heading) => {
    if (!scrollSync.isBlocked('navigation')) {
      highlightTocItem(heading?.id ?? null);
    }
  },
});
if (activeHeadingTracker?.isSupported?.() !== true) {
  activeHeadingTracker = null;
}

function closeOutline() {
  outlineControl.classList.remove('is-open');
  outlineTrigger.setAttribute('aria-expanded', 'false');
}

function setOutlineOpen(isOpen) {
  if (outlineControl.classList.contains('is-hidden')) {
    isOpen = false;
  }
  outlineControl.classList.toggle('is-open', isOpen);
  outlineTrigger.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    closeFloatingMenu();
    scrollActiveTocLinkIntoView();
  }
}

function closeFloatingMenu() {
  floatingControls.classList.remove('is-open');
  floatingTrigger.setAttribute('aria-expanded', 'false');
  collapseAllGroups();
}

function setFloatingMenuOpen(isOpen) {
  floatingControls.classList.toggle('is-open', isOpen);
  floatingTrigger.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    closeOutline();
    return;
  }
  collapseAllGroups();
}

// --- Outline popup toggle ---
outlineTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  setOutlineOpen(!outlineControl.classList.contains('is-open'));
});

// --- Floating menu toggle ---
floatingTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  setFloatingMenuOpen(!floatingControls.classList.contains('is-open'));
});

// --- Dismiss floating controls on outside click ---
document.addEventListener('click', (e) => {
  if (!floatingControls.contains(e.target)) {
    closeFloatingMenu();
  }
  if (!outlineControl.contains(e.target)) {
    closeOutline();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') {
    return;
  }

  if (document.querySelector('.mermaid-fullscreen-overlay')) {
    return;
  }

  if (imageLightbox.closeIfOpen()) {
    e.preventDefault();
    return;
  }

  if (floatingMenu.querySelector('.floating-menu-group.is-expanded')) {
    collapseAllGroups();
    e.preventDefault();
    return;
  }

  if (floatingControls.classList.contains('is-open')) {
    closeFloatingMenu();
    e.preventDefault();
    return;
  }

  if (outlineControl.classList.contains('is-open')) {
    closeOutline();
    e.preventDefault();
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

// --- Placement option clicks ---
placementOptions.addEventListener('click', (e) => {
  const item = e.target.closest('.floating-menu-item');
  if (!item) { return; }
  e.stopPropagation();
  vscode.postMessage({ type: 'setPreviewMode', value: item.dataset.value });
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
  closeFloatingMenu();
});

// --- Format action ---
formatButton.addEventListener('click', () => {
  vscode.postMessage({ type: 'formatDocument' });
  closeFloatingMenu();
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

window.addEventListener('message', handleWebviewMessage);

function handleWebviewMessage(event) {
  const message = event.data;

  if (message.type === 'scrollToLine') {
    handleScrollToLine(message.value);
    return;
  }

  if (message.type === 'scrollToAnchor') {
    handleScrollToAnchor(message.value);
    return;
  }

  if (message.type !== 'render') {
    return;
  }

  handleRenderMessage(message.payload);
}

function handleScrollToLine(line) {
  scrollSync.block('editor', 220);
  scrollSync.clearDebounce();
  const target = window.MDLINT_SCROLL_SYNC_RUNTIME.findHeadingForSourceLine(headingCache, line);
  if (target) {
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

function handleScrollToAnchor(anchor) {
  scrollSync.block('navigation', 450);
  scrollSync.clearDebounce();
  const target = document.getElementById(anchor);
  target?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function handleRenderMessage(state) {
  const mermaidRenderToken = mermaidRenderSession.start();
  scrollSync.block('render', 120);
  scrollSync.clearDebounce();
  applyRenderState(state);
  resetRenderedContent(state.html);
  initializeRenderedContent(state, mermaidRenderToken);
}

function applyRenderState(state) {
  currentState = state;
  document.title = state.title;
  if (state.baseUrl) {
    ensureBaseElement().href = state.baseUrl;
  }
  setBodyPresentation(state.themeMode, state.previewStyle);
  syncFloatingMenu(state.themeMode, state.previewStyle, state.previewMode);
  syncTocVisibility(state.tocVisible);
}

function ensureBaseElement() {
  let base = document.querySelector('base');
  if (!base) {
    base = document.createElement('base');
    document.head.appendChild(base);
  }

  return base;
}

function resetRenderedContent(html) {
  // Cleanup orphaned Mermaid error containers that are attached directly to the document body
  document.querySelectorAll('[id^="dmermaid-"]').forEach(el => el.remove());
  headingCache = [];
  lastSyncedSourceLine = null;
  previewContent.innerHTML = html;
  rebuildHeadingCache();
  resetActiveHeadingObserver();
}

function initializeRenderedContent(state, mermaidRenderToken) {
  renderToc(state.toc);
  renderMermaidDiagrams(mermaidRenderToken);
  codeBlockControls.setup(previewContent);
  imageLightbox.setup(previewContent);
  updateActiveTocLink();
}

function setBodyPresentation(themeMode, previewStyle) {
  body.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  body.classList.remove('style-default', 'style-github', 'style-notion', 'style-tokyo-night', 'style-obsidian', 'style-paper', 'style-typora');
  body.classList.add(`theme-${themeMode}`);
  body.classList.add(`style-${previewStyle}`);
}

function syncFloatingMenu(themeMode, previewStyle, previewMode) {
  for (const item of themeOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === themeMode);
  }
  for (const item of placementOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === previewMode);
  }
  for (const item of styleOptions.querySelectorAll('.floating-menu-item')) {
    item.classList.toggle('is-active', item.dataset.value === previewStyle);
  }
  if (themeValueEl) {
    const themeLabels = { auto: 'System', light: 'Light', dark: 'Dark' };
    themeValueEl.textContent = themeLabels[themeMode] || themeMode;
  }
  if (placementValueEl) {
    const placementLabels = { beside: 'Beside', inline: 'Inline' };
    placementValueEl.textContent = placementLabels[previewMode] || previewMode;
  }
  if (styleValueEl) {
    styleValueEl.textContent = previewStyle.charAt(0).toUpperCase() + previewStyle.slice(1).replace('-', ' ');
  }
}

function syncTocVisibility(tocVisible) {
  const isVisible = tocVisible !== false;
  outlineControl.classList.toggle('is-hidden', !isVisible);
  outlineControl.setAttribute('aria-hidden', String(!isVisible));
  outlineTrigger.tabIndex = isVisible ? 0 : -1;
  if (!isVisible) {
    closeOutline();
  }
}

function renderToc(items) {
  tocList.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'toc-empty';
    empty.textContent = 'No headings in document';
    tocList.appendChild(empty);
    outlineControl.classList.add('is-empty');
    return;
  }

  outlineControl.classList.remove('is-empty');

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
      scrollSync.block('navigation', 500);
      scrollSync.clearDebounce();
      target?.scrollIntoView({ block: 'nearest' });
      highlightTocItem(item.slug);
      scrollActiveTocLinkIntoView();
    });
    tocList.appendChild(link);
  }
}

window.addEventListener('scroll', () => {
  if (!scrollSync.isBlocked('navigation')) {
    updateActiveTocLink();
  }

  if (scrollSync.isBlocked(['editor', 'navigation', 'render'])) {
    return;
  }

  scrollSync.debounce(() => {
    if (scrollSync.isBlocked(['editor', 'navigation', 'render'])) {
      return;
    }

    postEditorScrollForHeading(getHeadingForEditorSync());
  }, 80);
});

window.addEventListener('resize', () => {
  resetActiveHeadingObserver();
  updateActiveTocLink();
});

function rebuildHeadingCache() {
  headingCache = Array.from(previewContent.querySelectorAll(HEADING_SELECTOR));
}

function resetActiveHeadingObserver() {
  activeHeadingTracker?.reset(headingCache);
}

async function renderMermaidDiagrams(renderToken) {
  const mermaidBlocks = Array.from(previewContent.querySelectorAll('code.language-mermaid'));
  if (mermaidBlocks.length === 0) {
    return;
  }

  const mermaid = await loadMermaid();
  if (!mermaidRenderSession.isCurrent(renderToken)) {
    return;
  }

  if (!mermaid) {
    replaceMermaidBlocksWithError(mermaidBlocks, 'Renderer failed to load.');
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
      if (mermaidRenderSession.isCurrent(renderToken)) {
        replaceMermaidBlocksWithError(mermaidBlocks, 'Renderer initialization failed.');
      }
      return;
    }
  }

  for (const block of mermaidBlocks) {
    if (!mermaidRenderSession.isCurrent(renderToken)) {
      return;
    }

    const pre = block.parentElement;
    if (!pre?.isConnected) {
      continue;
    }

    const source = block.textContent;
    if (!source) {
      continue;
    }

    try {
      const { svg, bindFunctions } = await mermaid.render(`mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, source);
      if (!mermaidRenderSession.isCurrent(renderToken)) {
        return;
      }
      if (!pre.isConnected) {
        continue;
      }

      const container = document.createElement('div');
      container.className = 'mermaid-diagram';
      container.dataset.style = currentState.previewStyle;
      container.innerHTML = svg;
      applyMermaidDesignTokens(container);
      enhanceMermaidSvg(container, source);
      pre.replaceWith(container);
      try {
        bindFunctions?.(container);
      } catch (bindError) {
        console.error('Mermaid bind functions failed.', bindError);
      }
      setupMermaidInteraction(container);
    } catch (error) {
      if (!mermaidRenderSession.isCurrent(renderToken)) {
        return;
      }
      if (!pre.isConnected) {
        continue;
      }

      console.error('Mermaid render failed.', error);
      pre.replaceWith(createMermaidErrorElement(error?.message || error?.str || String(error)));
    }
  }
}

function highlightTocItem(slug) {
  const links = tocList.querySelectorAll('.toc-link');
  for (const link of links) {
    const isActive = slug !== null && link.getAttribute('href') === `#${slug}`;
    link.classList.toggle('is-active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

function updateActiveTocLink() {
  const observedHeading = activeHeadingTracker?.getActiveHeading();
  if (observedHeading) {
    highlightTocItem(observedHeading.id);
    return;
  }

  const activeHeading = findActiveHeadingByGeometry();
  activeHeadingTracker?.setActiveHeading(activeHeading);
  highlightTocItem(activeHeading?.id ?? null);
}

function findActiveHeadingByGeometry() {
  const areaRect = { top: 0, bottom: window.innerHeight };
  let activeHeading = null;

  const isAtBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 40;

  for (const heading of headingCache) {
    const rect = heading.getBoundingClientRect();
    if (rect.top <= areaRect.top + 80) {
      activeHeading = heading;
    }
  }

  if (!activeHeading && isAtBottom) {
    for (let i = headingCache.length - 1; i >= 0; i--) {
      const rect = headingCache[i].getBoundingClientRect();
      if (rect.top < areaRect.bottom) {
        activeHeading = headingCache[i];
        break;
      }
    }
  }

  return activeHeading;
}

function getHeadingForEditorSync() {
  const observedHeading = activeHeadingTracker?.getActiveHeading();
  if (observedHeading) {
    return observedHeading;
  }

  const areaRect = { top: 0 };
  let bestHeading = null;
  let bestOffset = Infinity;

  for (const heading of headingCache) {
    const rect = heading.getBoundingClientRect();
    const offset = rect.top - areaRect.top;
    if (offset <= 80 && offset > -rect.height) {
      if (80 - offset < bestOffset) {
        bestOffset = 80 - offset;
        bestHeading = heading;
      }
    }
  }

  return bestHeading;
}

function postEditorScrollForHeading(heading) {
  if (!heading || heading.dataset.sourceLine === undefined) {
    return;
  }

  const sourceLine = Number(heading.dataset.sourceLine);
  if (sourceLine === lastSyncedSourceLine) {
    return;
  }

  lastSyncedSourceLine = sourceLine;
  vscode.postMessage({ type: 'syncEditorScroll', value: sourceLine });
}

function scrollActiveTocLinkIntoView() {
  const active = tocList.querySelector('.toc-link.is-active');
  if (!active || !outlineControl.classList.contains('is-open')) {
    return;
  }

  active.scrollIntoView({ block: 'nearest' });
}

function getCssVar(name, fallback = '') {
  const value = getComputedStyle(body).getPropertyValue(name).trim();
  return value || fallback;
}

function isPreviewDarkAppearance() {
  return mermaidRuntime.isDarkPreviewAppearance(body.classList);
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

function enhanceMermaidSvg(container, source) {
  mermaidEnhancement.enhanceMermaidSvg(container, source, {
    getDesignTokens: getMermaidDesignTokens,
    isPaperStyle,
  });
}

function getMermaidConfig() {
  return mermaidEnhancement.createMermaidConfig(
    getMermaidDesignTokens(),
    mermaidRuntime.MERMAID_SECURITY_LEVEL,
  );
}

function getFallbackMermaidConfig() {
  return mermaidEnhancement.createFallbackMermaidConfig(
    isPreviewDarkAppearance(),
    mermaidRuntime.MERMAID_SECURITY_LEVEL,
  );
}

function replaceMermaidBlocksWithError(blocks, message) {
  for (const block of blocks) {
    const pre = block.parentElement;
    if (!pre) {
      continue;
    }
    pre.replaceWith(createMermaidErrorElement(message));
  }
}

function createMermaidErrorElement(detail) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'mermaid-error';

  const title = document.createElement('strong');
  title.textContent = 'Mermaid diagram unavailable';
  errorDiv.appendChild(title);

  const message = mermaidEnhancement.formatMermaidErrorDetail(detail);
  if (message) {
    const detailEl = document.createElement('span');
    detailEl.className = 'mermaid-error-detail';
    detailEl.textContent = message;
    errorDiv.appendChild(detailEl);
  }

  return errorDiv;
}

function setupMermaidInteraction(container) {
  mermaidInteraction.setup(container);
}

async function loadMermaid() {
  if (window.mermaid) {
    return window.mermaid;
  }

  if (mermaidLoadPromise) {
    return mermaidLoadPromise;
  }

  mermaidLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = window.MDLINT_MERMAID_URI || 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => {
      if (window.mermaid) {
        resolve(window.mermaid);
      } else {
        resolve(null);
      }
    };
    script.onerror = () => {
      mermaidLoadPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return mermaidLoadPromise;
}
