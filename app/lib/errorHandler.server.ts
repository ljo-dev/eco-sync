import { logger } from "./logger.server";

/**
 * 予期せぬエラーが発生した際の共通ハンドラー。
 * アプリ全体のフォールトトレランス（障害耐性）を高めるため、
 * エラーの内容を適切にロギングし、システムが停止しないように制御します。
 */
export function handleAppError(error: unknown, context: string) {
  if (error instanceof Error) {
    logger.error(`[Error in ${context}]`, error);
  } else {
    logger.error(`[Unknown Error in ${context}]`, { rawError: error });
  }
}
