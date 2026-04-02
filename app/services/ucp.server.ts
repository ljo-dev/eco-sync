import { withRetry } from "../lib/retry.server";
import { logger } from "../lib/logger.server";

/**
 * UCP (Universal Commerce Protocol) 向けに、Shopifyの商品データや
 * 在庫、サステナビリティメタデータをAIエージェントが好む JSON-LD 形式に変換するエンジン
 */
export async function generateUcpJsonLd(graphql: any, shopUrl: string) {
  return await withRetry(async () => {
    logger.info(`Fetching products to generate UCP JSON-LD mapping for shop: ${shopUrl}`);
    
    const response = await graphql(`
      #graphql
      query GetProductsForUCP {
        products(first: 50, query: "status:ACTIVE") {
          edges {
            node {
              id
              handle
              title
              description
              onlineStoreUrl
              featuredImage {
                url
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                    inventoryQuantity
                  }
                }
              }
              # サステナビリティ関連のメタデータ（例：CO2排出量など）
              sustainability: metafield(namespace: "ecosync", key: "dpp_score") {
                value
              }
            }
          }
        }
        shop {
          name
          primaryDomain {
            url
          }
        }
      }
    `);

    const { data } = await response.json();
    
    if (!data || !data.products) {
      throw new Error("Failed to fetch products from GraphQL API.");
    }

    const primaryUrl = data.shop.primaryDomain?.url || `https://${shopUrl}`;

    // Schema.orgのItemList / Product形式へマッピング
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${data.shop.name} - Universal Commerce Protocol Data`,
      "description": "AI-optimized catalog data including sustainability and inventory metrics.",
      "itemListElement": data.products.edges.map((edge: any, index: number) => {
        const product = edge.node;
        const variant = product.variants.edges[0]?.node;
        const inStock = variant && variant.inventoryQuantity > 0;

        return {
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": product.title,
            "description": product.description,
            "image": product.featuredImage?.url,
            "url": product.onlineStoreUrl || `${primaryUrl}/products/${product.handle}`,
            "offers": {
              "@type": "Offer",
              "price": variant?.price || "0.00",
              "priceCurrency": "USD", // 簡易設定。本来はShopの通貨を使用
              "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            "additionalProperty": product.sustainability ? [
              {
                "@type": "PropertyValue",
                "name": "Sustainability Score (DPP)",
                "value": product.sustainability.value
              }
            ] : []
          }
        };
      })
    };

    return jsonLd;
  }, "UCP JSON-LD Generation");
}
