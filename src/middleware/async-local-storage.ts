import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "@vestfoldfylke/loglady";

import type { LogConfig } from "@vestfoldfylke/loglady/dist/types/types/log-config.types";

const asyncLocalStorage = new AsyncLocalStorage<LogConfig>();

export async function runInContext<T>(logConfig: LogConfig, callback: () => Promise<T>): Promise<T> {
  logger.setContextProvider((): LogConfig => asyncLocalStorage.getStore());
  return asyncLocalStorage.run(logConfig, callback);
}

export function updateContext(logConfig: LogConfig): void {
  const _logConfig: LogConfig = asyncLocalStorage.getStore();
  if (_logConfig) {
    Object.assign(_logConfig, logConfig);
  }
}
