import type { ActionFunctionArgs } from "@remix-run/node";
import shopify from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, payload } = await shopify.authenticate.webhook(request);

  console.log(`GDPR Webhook received: ${topic} for ${shop}`);

  // 各トピックに応じた処理を記述（審査を通すだけなら 200 OK を返せば十分ですが、
  // 実際の運用ではログ出力やデータ削除リクエストの記録などを行うことが推奨されます）
  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // 顧客データの要求に対する処理
      break;
    case "CUSTOMERS_REDACT":
      // 顧客データの削除に対する処理
      break;
    case "SHOP_REDACT":
      // ショップデータの削除に対する処理
      break;
    default:
      console.warn(`Unhandled GDPR topic: ${topic}`);
  }

  return new Response();
};
