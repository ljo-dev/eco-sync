import { withRetry } from "../lib/retry.server";
import { logger } from "../lib/logger.server";

/**
 * 返品受付時に、紐づくサブスクリプション（定期購買）を自動で一時停止します。
 */
export async function pauseSubscriptionForOrder(graphql: any, orderId: string) {
  return await withRetry(async () => {
    logger.info(`Checking subscriptions linked to order: ${orderId}`);

    // 1. オーダーに紐づく SubscriptionContract を探す
    const queryResponse = await graphql(`
      #graphql
      query GetSubscriptionByOrder($query: String!) {
        subscriptionContracts(first: 1, query: $query) {
          edges {
            node {
              id
              status
            }
          }
        }
      }
    `, {
      variables: {
        // 注: 実際の構成に合わせてOrder ID等から検索条件を調整します
        query: `origin_order_id:${orderId.split("/").pop()}`
      }
    });

    const queryData = await queryResponse.json();
    const contract = queryData.data?.subscriptionContracts?.edges?.[0]?.node;

    if (!contract) {
      logger.info(`No active subscription found for order ${orderId}. Skipping pause.`);
      return null;
    }

    if (contract.status === "PAUSED" || contract.status === "CANCELLED") {
      logger.info(`Subscription ${contract.id} is already ${contract.status}.`);
      return contract;
    }

    // 2. サブスクリプションをPause(一時停止)する
    logger.info(`Pausing subscription ${contract.id}...`);
    const pauseResponse = await graphql(`
      #graphql
      mutation subscriptionContractPause($subscriptionContractId: ID!) {
        subscriptionContractPause(subscriptionContractId: $subscriptionContractId) {
          contract {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        subscriptionContractId: contract.id
      }
    });

    const pauseData = await pauseResponse.json();
    const userErrors = pauseData.data?.subscriptionContractPause?.userErrors;

    if (userErrors && userErrors.length > 0) {
      throw new Error(`Failed to pause subscription: ${userErrors.map((e: any) => e.message).join(", ")}`);
    }

    logger.info(`Successfully paused subscription ${contract.id}.`);
    return pauseData.data?.subscriptionContractPause?.contract;
  }, "Pause Subscription Logic");
}
