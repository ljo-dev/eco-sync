import pRetry from "p-retry";
import pThrottle from "p-throttle";

// Shopify Admin API: 40バケット、2req/secで復元
const throttle = pThrottle({ limit: 2, interval: 1000 });

export interface ThrottleStatus {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: ThrottleStatus;
    };
  };
}

/**
 * レート制限 + 指数バックオフリトライ付きGraphQL実行
 * - pThrottle: 2req/sec に制限
 * - pRetry: 429/503/バケット枯渇時に最大5回リトライ
 */
export async function shopifyGraphQL<T>(
  graphqlFn: (query: string, opts?: { variables?: Record<string, unknown> }) => Promise<Response>,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const throttledExec = throttle(() =>
    pRetry(
      async (attemptNumber) => {
        const response = await graphqlFn(query, { variables });
        const json = (await response.json()) as GraphQLResponse<T>;

        if (json.errors?.length) {
          const msg = json.errors[0].message;
          // Throttled エラーはリトライ対象
          if (msg.includes("Throttled") || msg.includes("THROTTLED")) {
            throw new Error(`THROTTLED: ${msg}`);
          }
          throw new pRetry.AbortError(`GraphQL error: ${msg}`);
        }

        // コスト残量が10未満なら意図的に待機してリトライ
        const status = json.extensions?.cost?.throttleStatus;
        if (status && status.currentlyAvailable < 10) {
          const waitMs =
            ((10 - status.currentlyAvailable) / status.restoreRate) * 1000;
          console.warn(
            `[EcoSync] Bucket low (${status.currentlyAvailable}). Waiting ${Math.round(waitMs)}ms...`
          );
          await new Promise((r) => setTimeout(r, waitMs));
          throw new Error(`THROTTLE_WAIT attempt ${attemptNumber}`);
        }

        return json.data;
      },
      {
        retries: 5,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 16000,
        onFailedAttempt: (error) => {
          console.warn(
            `[EcoSync] Retry ${error.attemptNumber}/5: ${error.message}`
          );
        },
        shouldRetry: (error) =>
          error.message.startsWith("THROTTLE") ||
          error.message.includes("429") ||
          error.message.includes("503"),
      }
    )
  );

  return throttledExec();
}
