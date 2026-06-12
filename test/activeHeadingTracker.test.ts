import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  createActiveHeadingObserver,
  createActiveHeadingState,
  getActiveLineRootMargin,
} = require('../media/activeHeadingTracker.js');

function heading(id: string) {
  return { id };
}

test('computes a narrow root margin around the active heading line', () => {
  assert.equal(getActiveLineRootMargin(600, 80), '-80px 0px -519px 0px');
  assert.equal(getActiveLineRootMargin(60, 80), '-80px 0px 0px 0px');
});

test('tracks heading crossings from observer entries', () => {
  const intro = heading('intro');
  const usage = heading('usage');
  const api = heading('api');
  const state = createActiveHeadingState({ headings: [intro, usage, api], topOffset: 80 });

  state.applyIntersections([
    { target: intro, isIntersecting: true, boundingClientRect: { top: 80 } },
  ], 0);
  assert.equal(state.getActiveHeading(), intro);

  state.applyIntersections([
    { target: usage, isIntersecting: true, boundingClientRect: { top: 80 } },
  ], 300);
  assert.equal(state.getActiveHeading(), usage);

  state.applyIntersections([
    { target: usage, isIntersecting: false, boundingClientRect: { top: 60 } },
  ], 360);
  assert.equal(state.getActiveHeading(), usage);
});

test('moves back to the previous heading when scrolling upward past a heading', () => {
  const intro = heading('intro');
  const usage = heading('usage');
  const api = heading('api');
  const state = createActiveHeadingState({ headings: [intro, usage, api], topOffset: 80 });

  state.setActiveHeading(api);
  state.applyIntersections([], 300);
  state.applyIntersections([
    { target: api, isIntersecting: false, boundingClientRect: { top: 120 } },
  ], 200);

  assert.equal(state.getActiveHeading(), usage);
});

test('observer reset observes headings and reports active changes', () => {
  const intro = heading('intro');
  const usage = heading('usage');
  const observed: unknown[] = [];
  const activeChanges: unknown[] = [];
  let callback: ((entries: unknown[]) => void) | undefined;
  let observerOptions: { rootMargin?: string } | undefined;

  class FakeIntersectionObserver {
    constructor(nextCallback: (entries: unknown[]) => void, options: { rootMargin?: string }) {
      callback = nextCallback;
      observerOptions = options;
    }

    observe(target: unknown) {
      observed.push(target);
    }

    disconnect() {}
  }

  const tracker = createActiveHeadingObserver({
    ObserverClass: FakeIntersectionObserver,
    getViewportHeight: () => 400,
    getScrollY: () => 100,
    onActiveChange: (heading: unknown) => activeChanges.push(heading),
    topOffset: 80,
  });

  assert.equal(tracker.reset([intro, usage]), true);
  assert.deepEqual(observed, [intro, usage]);
  assert.equal(observerOptions?.rootMargin, '-80px 0px -319px 0px');

  callback?.([
    { target: usage, isIntersecting: true, boundingClientRect: { top: 80 } },
  ]);

  assert.equal(tracker.getActiveHeading(), usage);
  assert.deepEqual(activeChanges, [usage]);
});

test('observer reports unsupported when IntersectionObserver is unavailable', () => {
  const tracker = createActiveHeadingObserver({ ObserverClass: null });

  assert.equal(tracker.isSupported(), false);
  assert.equal(tracker.reset([heading('intro')]), false);
});
