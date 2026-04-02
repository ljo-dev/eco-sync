/**
 * JSON-LD 構造化データビルダー
 * AIエージェント（ChatGPT/Perplexity等）が好む Schema.org 形式を生成
 */

export interface ProductData {
  id: string;
  title: string;
  description: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  priceRange: { min: string; max: string; currency: string };
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    sku: string | null;
    availableForSale: boolean;
    inventoryQuantity: number;
  }>;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}

export interface DppData {
  co2Emission?: string;
  materials?: string[];
  recyclability?: string;
  origin?: string;
  certifications?: string[];
}

/**
 * 商品データからSchema.org Product JSON-LDを生成（GEO最適化済み）
 */
export function buildProductJsonLd(
  product: ProductData,
  shopDomain: string,
  dpp?: DppData
): Record<string, unknown> {
  const baseUrl = `https://${shopDomain}`;
  const primaryImage = product.images[0];

  const offers = product.variants.map((v) => ({
    "@type": "Offer",
    "@id": `${baseUrl}/products/${product.handle}?variant=${v.id.split("/").pop()}`,
    sku: v.sku ?? undefined,
    price: v.price,
    priceCurrency: product.priceRange.currency,
    availability: v.availableForSale
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    inventoryLevel: { "@type": "QuantitativeValue", value: v.inventoryQuantity },
  }));

  // GEO: AIが理解しやすい自然言語記述をdescriptionに補強
  const geoDescription = buildGeoDescription(product, dpp);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${baseUrl}/products/${product.handle}`,
    name: product.title,
    description: geoDescription,
    brand: { "@type": "Brand", name: product.vendor },
    category: product.productType,
    keywords: product.tags.join(", "),
    url: `${baseUrl}/products/${product.handle}`,
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", offers },
  };

  if (primaryImage) {
    jsonLd.image = {
      "@type": "ImageObject",
      url: primaryImage.url,
      description: primaryImage.altText ?? product.title,
    };
  }

  // DPP サステナビリティ情報を追加
  if (dpp) {
    jsonLd.sustainabilityNote = buildSustainabilityNote(dpp);
    if (dpp.co2Emission) {
      jsonLd.hasEnergyConsumptionDetails = {
        "@type": "EnergyConsumptionDetails",
        description: `CO₂排出量: ${dpp.co2Emission}`,
      };
    }
  }

  return jsonLd;
}

/**
 * AIエージェント向けのGEO最適化説明文を生成
 * - 価格帯・在庫・素材情報を自然言語で補強
 */
function buildGeoDescription(product: ProductData, dpp?: DppData): string {
  const parts: string[] = [product.description || product.title];

  const inStockVariants = product.variants.filter((v) => v.availableForSale);
  if (inStockVariants.length > 0) {
    parts.push(
      `現在${inStockVariants.length}種類のバリアントが在庫あり。` +
        `価格は${product.priceRange.currency} ${product.priceRange.min}から。`
    );
  } else {
    parts.push("現在在庫切れです。");
  }

  if (product.tags.length > 0) {
    parts.push(`カテゴリ・タグ: ${product.tags.slice(0, 5).join(", ")}`);
  }

  if (dpp?.materials?.length) {
    parts.push(`使用素材: ${dpp.materials.join(", ")}`);
  }

  if (dpp?.certifications?.length) {
    parts.push(`認証取得: ${dpp.certifications.join(", ")}`);
  }

  return parts.join(" ");
}

function buildSustainabilityNote(dpp: DppData): string {
  const notes: string[] = [];
  if (dpp.co2Emission) notes.push(`CO₂排出量: ${dpp.co2Emission}`);
  if (dpp.recyclability) notes.push(`リサイクル可能性: ${dpp.recyclability}`);
  if (dpp.origin) notes.push(`製造地: ${dpp.origin}`);
  return notes.join(" / ");
}
