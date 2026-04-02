import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { pauseSubscriptionForOrder } from "../services/subscription.server";
import { handleAppError } from "../lib/errorHandler.server";

/**
 * 返品受付（RETURNS_CREATE または RETURN_REQUESTS_CREATE）の
 * Webhookを受け取り、対象のサブスクリプションを停止します。
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, admin, payload } = await authenticate.webhook(request);

    // 返品系のトピックか確認
    if (!topic.includes("RETURN")) {
      return new Response("Unhandled webhook topic", { status: 200 });
    }

    // 返品リクエストのペイロードから、関連する元のオーダーIDを取得
    const orderId = payload.order_id ? `gid://shopify/Order/${payload.order_id}` : null;
    
    if (orderId) {
      await pauseSubscriptionForOrder(admin.graphql, orderId);
    }

    // Shopifyには必ず200 OKを返してWebhookの再送を防ぎます
    return new Response(null, { status: 200 });
  } catch (error) {
    handleAppError(error, "Returns Webhook Handler");
    // 500を返すとShopifyが自動でリトライします（障害時対応を期待する場合）
    return new Response("Error processing webhook", { status: 500 });
  }
};
