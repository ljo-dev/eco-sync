import {
  getActiveSubscriptionsByCustomer,
  pauseSubscription,
} from "./subscription-client.server";

/**
 * returns/create Webhookペイロードの型
 * （Shopify API 2026-04 準拠）
 */
export interface ReturnWebhookPayload {
  id: number;
  order_id: number;
  status: string;
  return_line_items: Array<{
    id: number;
    quantity: number;
    line_item_id: number;
    reason: string;
    reason_notes?: string;
  }>;
}

interface OrderCustomerResult {
  order: {
    id: string;
    customer: { id: string; email: string } | null;
    lineItems: {
      nodes: Array<{
        id: string;
        title: string;
        product: { id: string } | null;
      }>;
    };
  } | null;
}

const GET_ORDER_CUSTOMER = `#graphql
  query GetOrderCustomer($orderId: ID!) {
    order(id: $orderId) {
      id
      customer {
        id
        email
      }
      lineItems(first: 50) {
        nodes {
          id
          title
          product { id }
        }
      }
    }
  }
`;

import { shopifyGraphQL } from "../shopify/api-client.server";

/**
 * 返品イベント発生時のメイン処理
 * 1. 返品注文から顧客を特定
 * 2. その顧客のアクティブなサブスクリプションを取得
 * 3. 全サブスクリプションを一時停止
 */
export async function handleReturnCreated(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  payload: ReturnWebhookPayload
): Promise<{
  orderId: number;
  customerId: string | null;
  pausedContracts: string[];
  errors: string[];
}> {
  const gid = `gid://shopify/Order/${payload.order_id}`;
  const pausedContracts: string[] = [];
  const errors: string[] = [];

  // 注文から顧客を取得
  const orderData = await shopifyGraphQL<OrderCustomerResult>(
    graphql,
    GET_ORDER_CUSTOMER,
    { orderId: gid }
  );

  const customer = orderData.order?.customer;
  if (!customer) {
    console.warn(`[Sync] Order ${payload.order_id} has no customer. Skipping.`);
    return { orderId: payload.order_id, customerId: null, pausedContracts, errors };
  }

  console.log(
    `[Sync] Return ${payload.id} for order ${payload.order_id}. Customer: ${customer.email}`
  );

  // アクティブなサブスクリプションを取得
  const subscriptions = await getActiveSubscriptionsByCustomer(
    graphql,
    customer.id
  );

  if (subscriptions.length === 0) {
    console.log(`[Sync] No active subscriptions for ${customer.email}`);
    return {
      orderId: payload.order_id,
      customerId: customer.id,
      pausedContracts,
      errors,
    };
  }

  // 全サブスクリプションを一時停止
  for (const contract of subscriptions) {
    const result = await pauseSubscription(graphql, contract.id);
    if (result.success) {
      pausedContracts.push(result.contractId);
      console.log(`[Sync] Paused subscription ${contract.id} for ${customer.email}`);
    } else {
      errors.push(`${contract.id}: ${result.error}`);
    }
  }

  return {
    orderId: payload.order_id,
    customerId: customer.id,
    pausedContracts,
    errors,
  };
}
