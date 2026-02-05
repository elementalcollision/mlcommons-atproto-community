/**
 * Structured Logger
 *
 * Provides structured logging for production environments.
 * Output is JSON-formatted for easy parsing by log aggregators.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isProduction ? 'info' : 'debug');
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isProduction) {
      // JSON format for production (easy to parse)
      return JSON.stringify(entry);
    }

    // Human-readable format for development
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const level = entry.level.toUpperCase().padEnd(5);
    let output = `[${timestamp}] ${level} ${entry.message}`;

    if (entry.context) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && !this.isProduction) {
        output += `\n${entry.error.stack}`;
      }
    }

    return output;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          ...(error.stack && { stack: error.stack }),
        },
      }),
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : undefined;
    this.log('error', message, context, err);
  }

  /**
   * Log an HTTP request
   */
  request(request: Request, status: number, durationMs: number): void {
    const url = new URL(request.url);
    this.info('HTTP Request', {
      method: request.method,
      path: url.pathname,
      status,
      durationMs,
    });
  }

  /**
   * Log a database query
   */
  query(operation: string, table: string, durationMs: number): void {
    this.debug('Database Query', {
      operation,
      table,
      durationMs,
    });
  }

  /**
   * Log an external API call
   */
  api(service: string, endpoint: string, status: number, durationMs: number): void {
    this.info('External API Call', {
      service,
      endpoint,
      status,
      durationMs,
    });
  }

  /**
   * Log a business event
   */
  event(name: string, context?: LogContext): void {
    this.info(`Event: ${name}`, context);
  }
}

// Singleton logger instance
export const logger = new Logger();

/**
 * Measure and log execution time of an async function
 */
export async function timed<T>(
  name: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.debug(`${name} completed`, {
      ...context,
      durationMs: Date.now() - start,
    });
    return result;
  } catch (error) {
    logger.error(`${name} failed`, error, {
      ...context,
      durationMs: Date.now() - start,
    });
    throw error;
  }
}
