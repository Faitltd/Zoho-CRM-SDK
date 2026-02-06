export interface Metrics {
  increment?: (name: string, value?: number, meta?: Record<string, unknown>) => void;
  timing?: (name: string, durationMs: number, meta?: Record<string, unknown>) => void;
  gauge?: (name: string, value: number, meta?: Record<string, unknown>) => void;
}

const noop = () => {
  // intentionally empty
};

export const noopMetrics: Required<Metrics> = {
  increment: noop,
  timing: noop,
  gauge: noop
};

export function normalizeMetrics(metrics?: Metrics): Required<Metrics> {
  if (!metrics) {
    return noopMetrics;
  }

  return {
    increment: metrics.increment ?? noop,
    timing: metrics.timing ?? noop,
    gauge: metrics.gauge ?? noop
  };
}
