/**
 * アプリ全体のログ出力を統一するためのモジュールです。
 * CloudWatchやDatadogなどの外部監視ツールに送りやすいように、JSON形式で構造化ログを出力します。
 */

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: "INFO", timestamp: new Date().toISOString(), message, ...meta }));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: "WARN", timestamp: new Date().toISOString(), message, ...meta }));
  },
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    let errorDetails = error;
    if (error instanceof Error) {
      errorDetails = { message: error.message, stack: error.stack };
    }
    console.error(JSON.stringify({ level: "ERROR", timestamp: new Date().toISOString(), message, error: errorDetails, ...meta }));
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(JSON.stringify({ level: "DEBUG", timestamp: new Date().toISOString(), message, ...meta }));
    }
  }
};
