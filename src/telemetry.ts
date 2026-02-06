export interface TelemetryEvent {
  name: string;
  properties?: Record<string, unknown>;
}

export interface Telemetry {
  track?: (event: TelemetryEvent) => void;
}

const noop = () => {
  // intentionally empty
};

export const noopTelemetry: Required<Telemetry> = {
  track: noop
};

export function normalizeTelemetry(telemetry?: Telemetry): Required<Telemetry> {
  if (!telemetry) {
    return noopTelemetry;
  }

  return {
    track: telemetry.track ?? noop
  };
}
