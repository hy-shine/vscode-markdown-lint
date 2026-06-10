export type ScrollSyncSuppressionSource = 'preview' | 'resize';

interface TimerHost {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const defaultTimerHost: TimerHost = {
  setTimeout(callback, ms) {
    return setTimeout(callback, ms);
  },
  clearTimeout(handle) {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};

export class ScrollSyncSuppressor {
  private readonly activeTokens = new Map<ScrollSyncSuppressionSource, symbol>();
  private readonly timers = new Map<ScrollSyncSuppressionSource, unknown>();

  constructor(private readonly timerHost: TimerHost = defaultTimerHost) {}

  public suppress(source: ScrollSyncSuppressionSource, durationMs: number): void {
    const existing = this.timers.get(source);
    if (existing !== undefined) {
      this.timerHost.clearTimeout(existing);
    }

    const token = Symbol(source);
    this.activeTokens.set(source, token);
    const timer = this.timerHost.setTimeout(() => {
      if (this.activeTokens.get(source) === token) {
        this.activeTokens.delete(source);
        this.timers.delete(source);
      }
    }, durationMs);
    this.timers.set(source, timer);
  }

  public isActive(source: ScrollSyncSuppressionSource | ScrollSyncSuppressionSource[]): boolean {
    const sources = Array.isArray(source) ? source : [source];
    return sources.some((item) => this.activeTokens.has(item));
  }

  public dispose(): void {
    for (const timer of this.timers.values()) {
      this.timerHost.clearTimeout(timer);
    }
    this.timers.clear();
    this.activeTokens.clear();
  }
}
