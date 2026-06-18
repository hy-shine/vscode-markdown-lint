(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.MDLINT_MERMAID_ENHANCEMENT = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function detectMermaidDiagramType(source) {
    const normalized = String(source || '').trim();
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

  function formatMermaidErrorDetail(detail) {
    return String(detail || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
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

  function enhanceMermaidSvg(container, source, options = {}) {
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

    const design = options.getDesignTokens?.() || {};
    const isPaper = options.isPaperStyle?.() === true;
    const nodeRadius = isPaper ? 3 : design.nodeRadius;
    const clusterRadius = isPaper ? 4 : design.clusterRadius;
    roundSvgRects(svg, '.node rect', nodeRadius);
    roundSvgRects(svg, '.cluster rect', clusterRadius);
    roundSvgRects(svg, '.edgeLabel rect, .labelBkg', 999);
    roundSvgRects(svg, '.actor rect, .classBox rect, .note rect', Math.max(4, nodeRadius - 2));
  }

  function createMermaidConfig(design, securityLevel) {
    const themeVariables = {
      background: design.background,
      fontFamily: design.fontFamily,
      fontSize: '13px',
      primaryColor: design.nodeFill,
      primaryTextColor: design.text,
      primaryBorderColor: design.borderStrong,
      secondaryColor: design.nodeFillAlt,
      secondaryTextColor: design.text,
      secondaryBorderColor: design.border,
      tertiaryColor: design.background,
      tertiaryTextColor: design.text,
      tertiaryBorderColor: design.border,
      lineColor: design.edge,
      clusterBkg: design.clusterFill,
      clusterBorder: design.border,
      edgeLabelBackground: design.labelFill,
      edgeLabelText: design.text,
      actorBkg: design.nodeFillAlt,
      actorBorder: design.border,
      actorTextColor: design.text,
      actorLineColor: design.border,
      signalColor: design.edge,
      signalTextColor: design.textSoft,
      noteBkgColor: design.noteFill,
      noteTextColor: design.text,
      noteBorderColor: design.borderStrong,
      labelBoxBkgColor: design.labelFill,
      labelBoxBorderColor: design.border,
      labelTextColor: design.text,
      nodeBorderRadius: design.nodeRadius,
      classText: design.text,
      classColor: design.nodeFill,
      classBorder: design.border,
      taskBkgColor: design.nodeFillAlt,
      taskTextColor: design.text,
      activeTaskBkgColor: design.edgeActive,
      activeTaskTextColor: design.text,
      gridColor: design.border,
      todayLineColor: design.edgeActive,
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
      securityLevel,
      theme: 'base',
      themeVariables,
      flowchart: {
        curve: design.curve,
        htmlLabels: true,
        nodeSpacing: 24,
        rankSpacing: 34,
        padding: 10,
      },
      sequence: {
        diagramMarginX: 18,
        diagramMarginY: 8,
        actorMargin: 28,
        width: 118,
        height: 42,
        boxMargin: 6,
        boxTextMargin: 3,
        noteMargin: 6,
        messageMargin: 18,
        mirrorActors: true,
        activationWidth: 7,
        actorFontSize: 12,
        actorFontWeight: 500,
        noteFontSize: 12,
        noteFontWeight: 450,
        messageFontSize: 12,
        messageFontWeight: 450,
        wrapPadding: 6,
        labelBoxHeight: 16,
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

  function createFallbackMermaidConfig(isDark, securityLevel) {
    return {
      startOnLoad: false,
      securityLevel,
      theme: isDark ? 'dark' : 'default',
      flowchart: {
        htmlLabels: true,
      },
    };
  }

  return {
    addClassToAll,
    createFallbackMermaidConfig,
    createMermaidConfig,
    detectMermaidDiagramType,
    enhanceMermaidSvg,
    formatMermaidErrorDetail,
    roundSvgRects,
  };
});
