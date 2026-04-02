import { shopifyGraphQL } from "../shopify/api-client.server";

// ---- GraphQL ----

const GET_SUBSCRIPTIONS_BY_CUSTOMER = `#graphql
  query GetSubscriptionsByCustomer($customerId: ID!) {
    customer(id: $customerId) {
      id
      email
      subscriptionContracts(first: 10) {
        nodes {
          id
          status
          nextBillingDate
          lines(first: 5) {
            nodes {
              title
              quantity
              currentPrice { amount currencyCode }
            }
          }
        }
      }
    }
  }
`;

const PAUSE_SUBSCRIPTION = `#graphql
  mutation PauseSubscriptionContract($subscriptionContractId: ID!) {
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
`;

// ---- 型定義 ----

interface SubscriptionContract {
  id: string;
  status: string;
  nextBillingDate: string | null;
  lines: {
    nodes: Array<{
      title: string;
      quantity: number;
      currentPrice: { amount: string; currencyCode: string };
    }>;
  };
}

interface CustomerSubscriptionsResult {
  customer: {
    id: string;
    email: string;
    subscriptionContracts: { nodes: SubscriptionContract[] };
  } | null;
}

interface PauseResult {
  subscriptionContractPause: {
    contract: { id: string; status: string } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

// ---- 関数 ----

/**
 * 顧客IDに紐づくアクティブなサブスクリプション契約を取得
 */
export async function getActiveSubscriptionsByCustomer(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  customerId: string
): Promise<SubscriptionContract[]> {
  const data = await shopifyGraphQL<CustomerSubscriptionsResult>(
    graphql,
    GET_SUBSCRIPTIONS_BY_CUSTOMER,
    { customerId }
  );

  if (!data.customer) return [];

  return data.customer.subscriptionContracts.nodes.filter(
    (c) => c.status === "ACTIVE"
  );
}

/**
 * サブスクリプションを一時停止する
 * @returns 更新後のcontract、またはエラー
 */
export async function pauseSubscription(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  subscriptionContractId: string
): Promise<{ success: boolean; contractId: string; error?: string }> {
  const data = await shopifyGraphQL<PauseResult>(
    graphql,
    PAUSE_SUBSCRIPTION,
    { subscriptionContractId }
  );

  const result = data.subscriptionContractPause;

  if (result.userErrors.length > 0) {
    const msg = result.userErrors.map((e) => e.message).join(", ");
    console.error(`[Sync] Pause error for ${subscriptionContractId}: ${msg}`);
    return { success: false, contractId: subscriptionContractId, error: msg };
  }

  return {
    success: true,
    contractId: result.contract?.id ?? subscriptionContractId,
  };
}
