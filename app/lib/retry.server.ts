import pRetry from "p-retry";
import { logger } from "./logger.server";
import { handleAppError } from "./errorHandler.server";

/**
 * ShopifyのGraphQL APIなどは頻繁に呼び出すと「レートリミット（使用制限）」に引っかかることがあります。
 * その際に、少し待ってから自動で数回再試行（リトライ）するための仕組みです。
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string = "Shopify API Call"
): Promise<T> {
  try {
    return await pRetry(operation, {
      retries: 3, // 最大3回再試行する
      minTimeout: 1000, // 最初は1秒待つ
      maxTimeout: 5000, // 最大でも5秒間隔
      onFailedAttempt: (error) => {
        logger.warn(`[Retry] ${operationName} failed. Retrying... (Attempt ${error.attemptNumber} of ${error.retriesLeft + error.attemptNumber})`, {
          errorMessage: error.message,
        });
      },
    });
  } catch (error) {
    // 最終的に全てのリトライが失敗した場合
    handleAppError(error, `withRetry -> ${operationName} (All attempts failed)`);
    throw error;
  }
}
