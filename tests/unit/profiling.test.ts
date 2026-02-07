import { describe, expect, it, vi } from 'vitest';
import { endSpan, normalizeProfiler, startSpan } from '../../src/profiling';
import { performance } from 'node:perf_hooks';

describe('profiling helpers', () => {
  it('normalizes profiler options with defaults', () => {
    const profiler = normalizeProfiler();
    expect(profiler.enabled).toBe(false);
    expect(profiler.sampleRate).toBe(0);
  });

  it('starts and ends spans when enabled', () => {
    const onSample = vi.fn();
    const onSlowRequest = vi.fn();
    const profiler = normalizeProfiler({
      enabled: true,
      sampleRate: 1,
      slowRequestThresholdMs: 10,
      onSample,
      onSlowRequest
    });

    vi.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(120);

    const span = startSpan(profiler, 'test', { foo: 'bar' });
    const result = endSpan(profiler, span, { status: 200 });

    expect(result?.name).toBe('test');
    expect(result?.meta).toMatchObject({ foo: 'bar', status: 200 });
    expect(onSample).toHaveBeenCalled();
    expect(onSlowRequest).toHaveBeenCalled();
  });

  it('returns null spans when sampling excludes', () => {
    const profiler = normalizeProfiler({ enabled: true, sampleRate: 0.1 });
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9);

    const span = startSpan(profiler, 'noop');
    expect(span).toBeNull();
  });
});
