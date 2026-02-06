import { warnDeprecated } from '../deprecation';

export type DeprecatedProxyEntry = {
  target: string;
  message: string;
  alternative: string;
  removalVersion?: string;
};

export function createDeprecatedProxy<T extends object>(
  target: T,
  map: Record<string, DeprecatedProxyEntry>
): T {
  return new Proxy(target, {
    get(targetObj, prop, receiver) {
      if (typeof prop === 'string' && map[prop]) {
        const entry = map[prop];
        warnDeprecated({
          feature: prop,
          message: entry.message,
          alternative: entry.alternative,
          removalVersion: entry.removalVersion
        });
        const value = (targetObj as Record<string, unknown>)[entry.target];
        if (typeof value === 'function') {
          return value.bind(targetObj);
        }
        return value;
      }

      return Reflect.get(targetObj, prop, receiver);
    }
  });
}
