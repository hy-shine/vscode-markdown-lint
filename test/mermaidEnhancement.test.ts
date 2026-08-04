import assert from 'node:assert/strict';
import test from 'node:test';

const {
  addClassToAll,
  createFallbackMermaidConfig,
  createMermaidConfig,
  createMermaidDesign,
  detectMermaidDiagramType,
  enhanceMermaidSvg,
  formatMermaidErrorDetail,
  resolveCssColor,
  roundSvgRects,
} = require('../media/mermaidEnhancement.js');

function createClassList() {
  const values = new Set<string>();
  return {
    add(value: string) {
      values.add(value);
    },
    contains(value: string) {
      return values.has(value);
    },
  };
}

function createElement(textContent = '') {
  const attrs = new Map<string, string>();
  return {
    classList: createClassList(),
    dataset: {} as Record<string, string>,
    textContent,
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
  };
}

function createSvgFixture() {
  const title = createElement('  Diagram title  ');
  const node = createElement();
  const nodeRect = createElement();
  const clusterRect = createElement();
  const edgeLabelRect = createElement();
  const actorRect = createElement();
  const svg = {
    ...createElement(),
    querySelector(selector: string) {
      return selector === 'title' ? title : null;
    },
    querySelectorAll(selector: string) {
      const selectors: Record<string, ReturnType<typeof createElement>[]> = {
        '.node': [node],
        '.node rect': [nodeRect],
        '.cluster rect': [clusterRect],
        '.edgeLabel rect, .labelBkg': [edgeLabelRect],
        '.actor rect, .classBox rect, .note rect': [actorRect],
      };
      return selectors[selector] ?? [];
    },
  };
  const container = {
    dataset: {} as Record<string, string>,
    querySelector(selector: string) {
      return selector === 'svg' ? svg : null;
    },
  };

  return {
    actorRect,
    clusterRect,
    container,
    edgeLabelRect,
    node,
    nodeRect,
    svg,
  };
}

function createDesign() {
  return {
    background: '#f8f9fa',
    border: '#dadce0',
    borderStrong: '#9aa0a6',
    clusterFill: '#f1f3f4',
    curve: 'basis',
    edge: '#dadce0',
    edgeActive: '#1a73e8',
    fontFamily: 'Inter, sans-serif',
    labelFill: '#f8f9fa',
    nodeFill: '#ffffff',
    nodeFillAlt: '#f1f3f4',
    nodeRadius: 8,
    noteFill: '#ffffff',
    text: '#202124',
    textSoft: '#5f6368',
  };
}

test('detects supported Mermaid diagram families from source prefixes', () => {
  assert.equal(detectMermaidDiagramType('sequenceDiagram\n  A->>B: Hello'), 'sequence');
  assert.equal(detectMermaidDiagramType('classDiagram\n  class User'), 'class');
  assert.equal(detectMermaidDiagramType('stateDiagram-v2\n  [*] --> Still'), 'state');
  assert.equal(detectMermaidDiagramType('erDiagram\n  USER ||--o{ POST : writes'), 'er');
  assert.equal(detectMermaidDiagramType('journey\n  title Day'), 'journey');
  assert.equal(detectMermaidDiagramType('gantt\n  title Plan'), 'gantt');
  assert.equal(detectMermaidDiagramType('pie title Pets\n  "Dog" : 1'), 'pie');
  assert.equal(detectMermaidDiagramType('mindmap\n  root'), 'mindmap');
  assert.equal(detectMermaidDiagramType('timeline\n  title History'), 'timeline');
});

test('falls back to flowchart for blank or unrecognized Mermaid sources', () => {
  assert.equal(detectMermaidDiagramType(''), 'flowchart');
  assert.equal(detectMermaidDiagramType('flowchart TD\n  A --> B'), 'flowchart');
  assert.equal(detectMermaidDiagramType('graph TD\n  A --> B'), 'flowchart');
  assert.equal(detectMermaidDiagramType(undefined), 'flowchart');
});

test('normalizes Mermaid error details for compact display', () => {
  assert.equal(formatMermaidErrorDetail('  Parse\n\n error\tnear   line 2  '), 'Parse error near line 2');
  assert.equal(formatMermaidErrorDetail(null), '');
});

test('limits Mermaid error detail length', () => {
  const detail = formatMermaidErrorDetail('x'.repeat(220));

  assert.equal(detail.length, 180);
  assert.equal(detail, 'x'.repeat(180));
});

test('adds a class to every element matching a selector', () => {
  const first = createElement();
  const second = createElement();
  const root = {
    querySelectorAll(selector: string) {
      return selector === '.node' ? [first, second] : [];
    },
  };

  addClassToAll(root, '.node', 'mdlint-mermaid-node');

  assert.equal(first.classList.contains('mdlint-mermaid-node'), true);
  assert.equal(second.classList.contains('mdlint-mermaid-node'), true);
});

test('rounds matching SVG rectangles with rx and ry', () => {
  const rect = createElement();
  const root = {
    querySelectorAll(selector: string) {
      return selector === '.node rect' ? [rect] : [];
    },
  };

  roundSvgRects(root, '.node rect', 8);

  assert.equal(rect.getAttribute('rx'), '8');
  assert.equal(rect.getAttribute('ry'), '8');
});

test('enhances Mermaid SVG metadata, classes, labels, and radii', () => {
  const fixture = createSvgFixture();

  enhanceMermaidSvg(fixture.container, 'sequenceDiagram\n  A->>B: Hi', {
    getDesignTokens: () => ({ nodeRadius: 8, clusterRadius: 12 }),
    isPaperStyle: () => false,
  });

  assert.equal(fixture.container.dataset.diagramType, 'sequence');
  assert.equal(fixture.svg.dataset.diagramType, 'sequence');
  assert.equal(fixture.svg.classList.contains('mdlint-mermaid-svg'), true);
  assert.equal(fixture.svg.getAttribute('preserveAspectRatio'), 'xMidYMin meet');
  assert.equal(fixture.svg.getAttribute('role'), 'img');
  assert.equal(fixture.svg.getAttribute('aria-label'), 'Diagram title');
  assert.equal(fixture.node.classList.contains('mdlint-mermaid-node'), true);
  assert.equal(fixture.nodeRect.getAttribute('rx'), '8');
  assert.equal(fixture.clusterRect.getAttribute('rx'), '12');
  assert.equal(fixture.edgeLabelRect.getAttribute('rx'), '999');
  assert.equal(fixture.actorRect.getAttribute('rx'), '6');
});

test('uses tighter Mermaid SVG radii for paper style', () => {
  const fixture = createSvgFixture();

  enhanceMermaidSvg(fixture.container, 'flowchart TD\n  A --> B', {
    getDesignTokens: () => ({ nodeRadius: 8, clusterRadius: 12 }),
    isPaperStyle: () => true,
  });

  assert.equal(fixture.nodeRect.getAttribute('rx'), '3');
  assert.equal(fixture.clusterRect.getAttribute('rx'), '4');
  assert.equal(fixture.actorRect.getAttribute('rx'), '4');
});

test('creates Mermaid base config from design tokens and security level', () => {
  const config = createMermaidConfig(createDesign(), 'antiscript');

  assert.equal(config.startOnLoad, false);
  assert.equal(config.securityLevel, 'antiscript');
  assert.equal(config.theme, 'base');
  assert.equal(config.themeVariables.background, '#f8f9fa');
  assert.equal(config.themeVariables.primaryColor, '#ffffff');
  assert.equal(config.themeVariables.primaryTextColor, '#202124');
  assert.equal(config.themeVariables.nodeBorderRadius, 8);
  assert.equal(config.themeVariables.activeTaskBkgColor, '#1a73e8');
  assert.equal(config.flowchart.curve, 'basis');
  assert.equal(config.flowchart.htmlLabels, true);
  assert.equal(config.flowchart.nodeSpacing, 24);
  assert.equal(config.sequence.actorMargin, 28);
  assert.equal(config.sequence.messageFontSize, 12);
  assert.equal(config.sequence.mirrorActors, true);
  assert.equal(config.gantt.leftPadding, 84);
  assert.equal(config.journey.diagramMarginX, 28);
});

test('creates Mermaid fallback config for dark and light appearances', () => {
  assert.deepEqual(createFallbackMermaidConfig(true, 'antiscript'), {
    startOnLoad: false,
    securityLevel: 'antiscript',
    theme: 'dark',
    flowchart: {
      htmlLabels: true,
    },
  });
  assert.deepEqual(createFallbackMermaidConfig(false, 'antiscript'), {
    startOnLoad: false,
    securityLevel: 'antiscript',
    theme: 'default',
    flowchart: {
      htmlLabels: true,
    },
  });
});

function createResolveEnvironment(computedColor = 'rgb(244, 244, 244)') {
  const probe = {
    style: {} as Record<string, string>,
    remove() {},
  };
  return {
    document: {
      body: {
        appendChild(element: unknown) {
          assert.equal(element, probe);
        },
      },
      createElement(tag: string) {
        assert.equal(tag, 'span');
        return probe;
      },
    },
    getComputedStyle(element: unknown) {
      assert.equal(element, probe);
      return { color: computedColor };
    },
  };
}

test('resolves CSS color expressions through the browser computed style', () => {
  const environment = createResolveEnvironment();

  const resolved = resolveCssColor('color-mix(in srgb, #ffffff 88%, black 12%)', environment);

  assert.equal(resolved, 'rgb(244, 244, 244)');
});

test('passes through already concrete color formats', () => {
  const environment = createResolveEnvironment();

  assert.equal(resolveCssColor('#ffffff', environment), '#ffffff');
  assert.equal(resolveCssColor('#fff8', environment), '#fff8');
  assert.equal(resolveCssColor('rgb(31, 35, 40)', environment), 'rgb(31, 35, 40)');
  assert.equal(resolveCssColor('rgba(31, 35, 40, 0.5)', environment), 'rgba(31, 35, 40, 0.5)');
  assert.equal(resolveCssColor('hsl(220, 50%, 40%)', environment), 'hsl(220, 50%, 40%)');
});

test('returns the input when the computed color cannot be read', () => {
  const environment = createResolveEnvironment();
  environment.getComputedStyle = () => {
    throw new Error('no DOM');
  };

  const value = 'color-mix(in srgb, #ffffff 88%, black 12%)';
  assert.equal(resolveCssColor(value, environment), value);
});

test('returns the input when the browser cannot resolve the color', () => {
  const environment = createResolveEnvironment('');
  assert.equal(resolveCssColor('var(--missing)', environment), 'var(--missing)');
});

test('returns falsy or non-string inputs unchanged', () => {
  const environment = createResolveEnvironment();

  assert.equal(resolveCssColor('', environment), '');
  assert.equal(resolveCssColor(undefined, environment), undefined);
  assert.equal(resolveCssColor(null, environment), null);
});

test('does not throw when called without an environment', () => {
  assert.equal(resolveCssColor('#ffffff'), '#ffffff');
  assert.equal(resolveCssColor('color-mix(in srgb, #fff 50%, #000)', undefined), 'color-mix(in srgb, #fff 50%, #000)');
});

function createResolvedColors() {
  return {
    accent: '#8ab4f8',
    bg: '#1d2026',
    border: '#353d49',
    codeBg: '#1d2026',
    fontFamily: 'Inter, sans-serif',
    muted: '#9aa0a6',
    panel: '#303743',
    surfaceSoft: '#29313c',
    text: '#e8eaed',
  };
}

test('builds Mermaid design tokens from resolved CSS colors', () => {
  const design = createMermaidDesign(createResolvedColors(), true);

  assert.equal(design.background, '#1d2026');
  assert.equal(design.nodeFill, '#303743');
  assert.equal(design.nodeFillAlt, '#29313c');
  assert.equal(design.clusterFill, '#29313c');
  assert.equal(design.labelFill, '#1d2026');
  assert.equal(design.noteFill, '#303743');
  assert.equal(design.text, '#e8eaed');
  assert.equal(design.textSoft, '#9aa0a6');
  assert.equal(design.edge, '#9aa0a6');
  assert.equal(design.edgeActive, '#8ab4f8');
  assert.equal(design.border, '#353d49');
  assert.equal(design.borderStrong, '#8ab4f8');
  assert.equal(design.fontFamily, 'Inter, sans-serif');
  assert.equal(design.curve, 'basis');
  assert.equal(design.nodeRadius, 6);
  assert.equal(design.clusterRadius, 8);
  assert.equal(design.lineWidth, 1.0);
});

test('dark design uses light text on accent and inset shadows', () => {
  const design = createMermaidDesign(createResolvedColors(), true);

  assert.equal(design.textOnAccent, '#1e1e1e');
  assert.match(design.shellShadow, /^inset 0 1px 0 rgba\(255,255,255,0.03\)$/);
  assert.match(design.shellHoverShadow, /^inset 0 1px 0 rgba\(255,255,255,0.05\), 0 8px 20px rgba\(0,0,0,0.12\)$/);
});

test('light design uses dark text on accent and lifted shadows', () => {
  const design = createMermaidDesign({ ...createResolvedColors(), bg: '#f6f8fb', panel: '#ffffff' }, false);

  assert.equal(design.textOnAccent, '#ffffff');
  assert.match(design.shellShadow, /^inset 0 1px 0 rgba\(255,255,255,0.78\), 0 1px 2px rgba\(31,35,40,0.04\)$/);
  assert.match(design.shellHoverShadow, /^inset 0 1px 0 rgba\(255,255,255,0.95\), 0 10px 26px rgba\(31,35,40,0.08\)$/);
});
