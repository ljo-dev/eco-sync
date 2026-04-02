import { shopifyGraphQL } from "../shopify/api-client.server";
import { buildProductJsonLd, type ProductData } from "./json-ld-builder";
import db from "../../db.server";

// ---- GraphQL クエリ ----

const GET_PRODUCTS_FOR_GEO = `#graphql
  query GetProductsForGeo($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        description
        handle
        vendor
        productType
        tags
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        images(first: 1) {
          nodes { url altText }
        }
        variants(first: 50) {
          nodes {
            id
            title
            price
            sku
            availableForSale
            inventoryQuantity
          }
        }
        metafields(
          identifiers: [
            { namespace: "ecosync_dpp", key: "co2_emission" }
            { namespace: "ecosync_dpp", key: "materials" }
            { namespace: "ecosync_dpp", key: "recyclability" }
            { namespace: "ecosync_dpp", key: "origin" }
            { namespace: "ecosync_dpp", key: "certifications" }
          ]
        ) {
          namespace
          key
          value
          type
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface ShopifyProductNode {
  id: string;
  title: string;
  description: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  images: { nodes: Array<{ url: string; altText: string | null }> };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      price: string;
      sku: string | null;
      availableForSale: boolean;
      inventoryQuantity: number;
    }>;
  };
  metafields: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }> | null;
}

interface ProductsQueryResult {
  products: {
    nodes: ShopifyProductNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

// ---- ヘルパー ----

function toProductData(node: ShopifyProductNode): ProductData {
  return {
    id: node.id,
    title: node.title,
    description: node.description,
    handle: node.handle,
    vendor: node.vendor,
    productType: node.productType,
    tags: node.tags,
    priceRange: {
      min: node.priceRange.minVariantPrice.amount,
      max: node.priceRange.maxVariantPrice.amount,
      currency: node.priceRange.minVariantPrice.currencyCode,
    },
    images: node.images.nodes,
    variants: node.variants.nodes,
    metafields: node.metafields ?? [],
  };
}

function extractDpp(metafields: ProductData["metafields"]) {
  if (!metafields) return undefined;
  const get = (key: string) =>
    metafields.find((m) => m.namespace === "ecosync_dpp" && m.key === key)?.value;

  const materialsRaw = get("materials");
  const certsRaw = get("certifications");

  return {
    co2Emission: get("co2_emission"),
    materials: materialsRaw ? JSON.parse(materialsRaw) : undefined,
    recyclability: get("recyclability"),
    origin: get("origin"),
    certifications: certsRaw ? JSON.parse(certsRaw) : undefined,
  };
}

// ---- メイン関数 ----

/**
 * 全商品のJSON-LDを生成してUCPキャッシュに保存
 */
export async function buildUcpPayload(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  shop: string
): Promise<Record<string, unknown>> {
  const shopDomain = shop;
  const productJsonLds: Record<string, unknown>[] = [];

  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await shopifyGraphQL<ProductsQueryResult>(
      graphql,
      GET_PRODUCTS_FOR_GEO,
      { first: 50, after: cursor }
    );

    for (const node of data.products.nodes) {
      const product = toProductData(node);
      const dpp = extractDpp(product.metafields);
      const jsonLd = buildProductJsonLd(product, shopDomain, dpp);
      productJsonLds.push(jsonLd);
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  const payload = {
    "@context": "https://schema.org",
    "@type": "DataCatalog",
    name: `${shop} Product Catalog`,
    description:
      "EcoSync UCP — AI-optimized product data for ChatGPT, Perplexity, and other AI agents.",
    url: `https://${shop}/.well-known/ucp`,
    dataset: productJsonLds,
    provider: {
      "@type": "Organization",
      name: shop,
      url: `https://${shop}`,
    },
    dateModified: new Date().toISOString(),
  };

  // キャッシュ保存（最大1時間）
  await db.ucpCache.upsert({
    where: { shop },
    create: { shop, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });

  return payload;
}

/**
 * キャッシュから取得（なければ再生成）
 */
export async function getUcpPayload(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  shop: string
): Promise<Record<string, unknown>> {
  const cached = await db.ucpCache.findUnique({ where: { shop } });

  if (cached) {
    const age = Date.now() - cached.updatedAt.getTime();
    if (age < 60 * 60 * 1000) {
      return JSON.parse(cached.payload);
    }
  }

  return buildUcpPayload(graphql, shop);
}
