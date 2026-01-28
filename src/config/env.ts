import { clientEnv } from './env.client';
export { clientEnv };

// Lazy proxy for backward compatibility if any code accesses `env.VAR`
// This avoids top-level validation crashing the build
let _serverEnv: any = null;

export const env = new Proxy({} as any, {
  get(_target, prop: string) {
    if (typeof window !== 'undefined') {
      // In browser, return from clientEnv
      return (clientEnv as any)[prop];
    }
    // On server, dynamically load getServerEnv
    if (!_serverEnv) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const { getServerEnv } = require('./env.server');
        _serverEnv = getServerEnv();
      } catch {
        return process.env[prop];
      }
    }
    return _serverEnv ? _serverEnv[prop] : process.env[prop];
  },
});
