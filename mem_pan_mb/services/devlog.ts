// Centralized dev logger. Every entry is mirrored to the device console AND
// POSTed to Metro's /__devlog endpoint (see metro.config.js) so it shows up
// in the terminal running `npx expo start`.
//
// Usage from any .tsx file:
//   import { devlog } from '@/services/devlog';
//   devlog.event('login:submit', { hasIdentifier: !!identifier });
//   devlog.info('cards loaded', { count: cards.length });
//   devlog.warn('image too large', { size });
//   devlog.error('failed to delete card', err, { cardId });
//
// installGlobalErrorHandlers() is called once from app/_layout.tsx to capture
// uncaught JS errors and unhandled promise rejections.

import Constants from 'expo-constants';

const LOG_ENABLED = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const resolveMetroDevLogUrl = (): string | null => {
  if (!LOG_ENABLED) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = Constants;
  const hostUri: string | undefined =
    c.expoConfig?.hostUri ||
    c.expoGoConfig?.debuggerHost ||
    c.manifest?.debuggerHost ||
    c.manifest?.hostUri ||
    c.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split('/')[0].split('?')[0];
  return `http://${host}/__devlog`;
};

const METRO_URL = resolveMetroDevLogUrl();

// Redact obvious secrets before they leave the device.
const SENSITIVE = /password|token|secret|authorization|otp|pin/i;
const redact = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '<max-depth>';
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? '***' : redact(v, depth + 1);
  }
  return out;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeError = (err: any) => {
  if (!err) return undefined;
  if (typeof err === 'string') return { message: err };
  return {
    name: err.name,
    message: err.message ?? String(err),
    stack: err.stack,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = (entry: Record<string, any>) => {
  if (!LOG_ENABLED || !METRO_URL) return;
  try {
    fetch(METRO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'app', ts: Date.now(), ...entry }),
    }).catch(() => { /* swallow */ });
  } catch { /* swallow */ }
};

export const devlog = {
  info(message: string, data?: unknown) {
    if (!LOG_ENABLED) return;
    console.log(`[info] ${message}`, data ?? '');
    post({ kind: 'info', message, data: redact(data) });
  },
  warn(message: string, data?: unknown) {
    if (!LOG_ENABLED) return;
    console.warn(`[warn] ${message}`, data ?? '');
    post({ kind: 'warn', message, data: redact(data) });
  },
  error(message: string, err?: unknown, data?: unknown) {
    if (!LOG_ENABLED) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    console.error(`[error] ${message}`, e?.message ?? e ?? '', data ?? '');
    post({
      kind: 'error',
      message,
      error: serializeError(e),
      data: redact(data),
    });
  },
  event(name: string, data?: unknown) {
    if (!LOG_ENABLED) return;
    console.log(`[event] ${name}`, data ?? '');
    post({ kind: 'event', name, data: redact(data) });
  },
};

// Wraps a handler with try/catch so an uncaught throw inside a UI handler
// surfaces in the Metro terminal instead of being swallowed silently.
//   onPress={withErrorLog('module:deleteCard', () => handleDeleteCard(id))}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorLog<TArgs extends any[], TRet>(
  scope: string,
  fn: (...args: TArgs) => TRet | Promise<TRet>
): (...args: TArgs) => Promise<TRet | undefined> {
  return async (...args: TArgs) => {
    try {
      return await fn(...args);
    } catch (err) {
      devlog.error(`${scope}: uncaught`, err, { args: redact(args) });
      return undefined;
    }
  };
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || !LOG_ENABLED) return;
  installed = true;

  // React Native — uncaught JS errors (Hermes/JSC)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = typeof global !== 'undefined' ? global : undefined;
  if (g?.ErrorUtils?.setGlobalHandler) {
    const previous = g.ErrorUtils.getGlobalHandler?.();
    g.ErrorUtils.setGlobalHandler((err: Error, isFatal?: boolean) => {
      devlog.error(`uncaught JS error${isFatal ? ' (FATAL)' : ''}`, err);
      if (previous) previous(err, isFatal);
    });
  }

  // Web target (and modern RN runtimes that expose addEventListener)
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      devlog.error('unhandledrejection', ev.reason);
    });
    window.addEventListener('error', (ev: ErrorEvent) => {
      devlog.error('window.onerror', ev.error ?? ev.message);
    });
  }

  devlog.info('global error handlers installed');
}
