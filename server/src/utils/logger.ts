type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  event: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, payload: LogPayload): void {
  const line = {
    ts: new Date().toISOString(),
    level,
    ...payload
  };
  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) =>
    emit('info', { event, ...data }),
  warn: (event: string, data?: Record<string, unknown>) =>
    emit('warn', { event, ...data }),
  error: (event: string, data?: Record<string, unknown>) =>
    emit('error', { event, ...data }),
  debug: (event: string, data?: Record<string, unknown>) =>
    emit('debug', { event, ...data })
};
