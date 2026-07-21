type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  action: string;
  message: string;
  context?: Record<string, unknown>;
}

function emit(entry: LogEntry): void {
  const serialized = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    case 'debug':
      console.debug(serialized);
      break;
    default:
      console.info(serialized);
  }
}

function log(level: LogLevel, action: string, message: string, context?: Record<string, unknown>): void {
  emit({
    level,
    timestamp: new Date().toISOString(),
    action,
    message,
    context,
  });
}

export const logger = {
  debug: (action: string, message: string, context?: Record<string, unknown>) =>
    log('debug', action, message, context),
  info: (action: string, message: string, context?: Record<string, unknown>) =>
    log('info', action, message, context),
  warn: (action: string, message: string, context?: Record<string, unknown>) =>
    log('warn', action, message, context),
  error: (action: string, message: string, context?: Record<string, unknown>) =>
    log('error', action, message, context),
};
