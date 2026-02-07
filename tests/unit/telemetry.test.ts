import { describe, expect, it, vi } from 'vitest';
import { normalizeTelemetry, noopTelemetry } from '../../src/telemetry';

describe('telemetry helpers', () => {
  it('returns noop telemetry when undefined', () => {
    const telemetry = normalizeTelemetry();
    expect(telemetry).toBe(noopTelemetry);
  });

  it('uses provided tracker when present', () => {
    const track = vi.fn();
    const telemetry = normalizeTelemetry({ track });
    telemetry.track({ name: 'event', properties: { ok: true } });
    expect(track).toHaveBeenCalledWith({ name: 'event', properties: { ok: true } });
  });
});
