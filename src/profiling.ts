import { performance } from 'node:perf_hooks';

export interface ProfileSpan {
  name: string;
  durationMs: number;
  meta?: Record<string, unknown>;
}

export interface ProfilerOptions {
  enabled?: boolean;
  sampleRate?: number; // 0..1
  slowRequestThresholdMs?: number;
  logSlowRequests?: boolean;
  onSample?: (span: ProfileSpan) => void;
  onSlowRequest?: (span: ProfileSpan) => void;
}

export interface NormalizedProfiler {
  enabled: boolean;
  sampleRate: number;
  slowRequestThresholdMs: number;
  logSlowRequests: boolean;
  onSample?: (span: ProfileSpan) => void;
  onSlowRequest?: (span: ProfileSpan) => void;
}

export interface ProfileSpanStart {
  name: string;
  start: number;
  meta?: Record<string, unknown>;
}

const DEFAULT_SLOW_THRESHOLD_MS = 750;

export function normalizeProfiler(options?: ProfilerOptions | NormalizedProfiler): NormalizedProfiler {
  if (!options) {
    return {
      enabled: false,
      sampleRate: 0,
      slowRequestThresholdMs: DEFAULT_SLOW_THRESHOLD_MS,
      logSlowRequests: false
    };
  }

  const enabled = options.enabled ?? Boolean(options.sampleRate || options.logSlowRequests);

  return {
    enabled,
    sampleRate: clamp(options.sampleRate ?? 0),
    slowRequestThresholdMs: options.slowRequestThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS,
    logSlowRequests: options.logSlowRequests ?? false,
    onSample: options.onSample,
    onSlowRequest: options.onSlowRequest
  };
}

export function startSpan(
  profiler: NormalizedProfiler,
  name: string,
  meta?: Record<string, unknown>
): ProfileSpanStart | null {
  if (!profiler.enabled) {
    return null;
  }

  if (profiler.sampleRate > 0 && Math.random() > profiler.sampleRate) {
    return null;
  }

  return {
    name,
    start: performance.now(),
    meta
  };
}

export function endSpan(
  profiler: NormalizedProfiler,
  span: ProfileSpanStart | null,
  meta?: Record<string, unknown>
): ProfileSpan | null {
  if (!span) {
    return null;
  }

  const durationMs = performance.now() - span.start;
  const payload: ProfileSpan = {
    name: span.name,
    durationMs,
    meta: { ...span.meta, ...meta }
  };

  if (profiler.onSample) {
    profiler.onSample(payload);
  }

  if (durationMs >= profiler.slowRequestThresholdMs && profiler.onSlowRequest) {
    profiler.onSlowRequest(payload);
  }

  return payload;
}

function clamp(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
