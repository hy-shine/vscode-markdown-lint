import assert from 'node:assert/strict';
import test from 'node:test';

const {
  addClassToAll,
  createFallbackMermaidConfig,
  createMermaidConfig,
  detectMermaidDiagramType,
  enhanceMermaidSvg,
  formatMermaidErrorDetail,
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
