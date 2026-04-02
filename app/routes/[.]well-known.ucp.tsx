import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import shopify from "../shopify.server";
import { generateUcpJsonLd } from "../services/ucp.server";
import { handleAppError } from "../lib/errorHandler.server";

/**
 * /.well-known/ucp
 * AIエージェント（ChatGPT 等）がストアデータをクロールするためのエンドポイント。
 * ?shop=example.myshopify.com のようにパラメータで対象ストアを指定し、
 * オフラインセッションを用いて認証なし（またはトークンベース）でGraphQLを叩いて結果を返します。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing 'shop' query parameter" }, { status: 400 });
  }

  try {
    // AIクローラーからのリクエスト想定のため、ユーザーセッション不要の unauthenticated.admin を使用
    const { admin } = await shopify.unauthenticated.admin(shop);
    
    const ucpData = await generateUcpJsonLd(admin.graphql, shop);

    return json(ucpData, {
      headers: {
        "Content-Type": "application/ld+json",
        // クローラー向けに長めのキャッシュを指定
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    handleAppError(error, `/.well-known/ucp for shop: ${shop}`);
    return json({ error: "Internal Server Error while generating UCP data" }, { status: 500 });
  }
};
