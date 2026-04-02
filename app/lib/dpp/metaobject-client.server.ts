import { shopifyGraphQL } from "../shopify/api-client.server";
import { DPP_METAOBJECT_TYPE, type DppLifecycleData, calcCoverageScore } from "./dpp-schema";
import db from "../../db.server";

// ---- GraphQL ----

const CREATE_METAOBJECT_DEFINITION = `#graphql
  mutation CreateDppMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        type
        name
      }
      userErrors { field message }
    }
  }
`;

const UPSERT_DPP_METAOBJECT = `#graphql
  mutation UpsertDppMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        id
        handle
        fields { key value }
      }
      userErrors { field message }
    }
  }
`;

const GET_DPP_METAOBJECT = `#graphql
  query GetDppMetaobject($handle: String!, $type: String!) {
    metaobjectByHandle(handle: { handle: $handle, type: $type }) {
      id
      handle
      fields { key value }
      updatedAt
    }
  }
`;

const ATTACH_METAOBJECT_TO_PRODUCT = `#graphql
  mutation AttachDppToProduct($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key namespace value }
      userErrors { field message }
    }
  }
`;

// ---- ヘルパー ----

/** DPPデータをMetaobjectのfields配列に変換 */
function toMetaobjectFields(
  data: Partial<DppLifecycleData>
): Array<{ key: string; value: string }> {
  const fields: Array<{ key: string; value: string }> = [];

  if (data.materials?.length) {
    fields.push({ key: "materials", value: JSON.stringify(data.materials) });
  }
  if (data.materialOrigin) {
    fields.push({ key: "material_origin", value: data.materialOrigin });
  }
  if (data.co2EmissionKg !== undefined) {
    fields.push({ key: "co2_emission_kg", value: String(data.co2EmissionKg) });
  }
  if (data.co2CalculationMethod) {
    fields.push({ key: "co2_calculation_method", value: data.co2CalculationMethod });
  }
  if (data.waterUsageLiter !== undefined) {
    fields.push({ key: "water_usage_liter", value: String(data.waterUsageLiter) });
  }
  if (data.recyclability) {
    fields.push({ key: "recyclability", value: data.recyclability });
  }
  if (data.recycledContentPercent !== undefined) {
    fields.push({ key: "recycled_content_percent", value: String(data.recycledContentPercent) });
  }
  if (data.endOfLifeInstructions) {
    fields.push({ key: "end_of_life_instructions", value: data.endOfLifeInstructions });
  }
  if (data.manufacturingCountry) {
    fields.push({ key: "manufacturing_country", value: data.manufacturingCountry });
  }
  if (data.manufacturerName) {
    fields.push({ key: "manufacturer_name", value: data.manufacturerName });
  }
  if (data.supplierAuditStatus) {
    fields.push({ key: "supplier_audit_status", value: data.supplierAuditStatus });
  }
  if (data.certifications?.length) {
    fields.push({ key: "certifications", value: JSON.stringify(data.certifications) });
  }
  if (data.repairabilityScore !== undefined) {
    fields.push({ key: "repairability_score", value: String(data.repairabilityScore) });
  }
  if (data.warrantyYears !== undefined) {
    fields.push({ key: "warranty_years", value: String(data.warrantyYears) });
  }
  if (data.sparePartsAvailable !== undefined) {
    fields.push({ key: "spare_parts_available", value: String(data.sparePartsAvailable) });
  }
  if (data.productPassportId) {
    fields.push({ key: "product_passport_id", value: data.productPassportId });
  }
  if (data.issuedAt) {
    fields.push({ key: "issued_at", value: data.issuedAt });
  }
  if (data.validUntil) {
    fields.push({ key: "valid_until", value: data.validUntil });
  }

  return fields;
}

// ---- 公開関数 ----

/**
 * DPPデータをMetaobjectとして保存し、商品に紐付ける
 */
export async function upsertDpp(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  shop: string,
  productId: string,
  data: Partial<DppLifecycleData>
): Promise<{ metaobjectId: string; coverageScore: number }> {
  const handle = `dpp-${productId.split("/").pop()}`;
  const fields = toMetaobjectFields(data);

  // Metaobjectをupsert
  const upsertResult = await shopifyGraphQL<{
    metaobjectUpsert: {
      metaobject: { id: string; handle: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(graphql, UPSERT_DPP_METAOBJECT, {
    handle: { handle, type: DPP_METAOBJECT_TYPE },
    metaobject: { fields },
  });

  const errors = upsertResult.metaobjectUpsert.userErrors;
  if (errors.length > 0) {
    throw new Error(`DPP upsert error: ${errors.map((e) => e.message).join(", ")}`);
  }

  const metaobjectId = upsertResult.metaobjectUpsert.metaobject!.id;

  // 商品のMetafieldにDPP MetaobjectのGIDを保存
  await shopifyGraphQL(graphql, ATTACH_METAOBJECT_TO_PRODUCT, {
    metafields: [
      {
        ownerId: productId,
        namespace: "ecosync_dpp",
        key: "passport_ref",
        value: metaobjectId,
        type: "metaobject_reference",
      },
    ],
  });

  // 補完率をDBに記録
  const { score, missingFields } = calcCoverageScore(data);
  await db.dppCoverage.upsert({
    where: { shop_productId: { shop, productId } },
    create: { shop, productId, coverageScore: score, missingFields: JSON.stringify(missingFields) },
    update: { coverageScore: score, missingFields: JSON.stringify(missingFields) },
  });

  return { metaobjectId, coverageScore: score };
}

/**
 * 商品のDPPデータを取得
 */
export async function getDpp(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  productId: string
): Promise<Array<{ key: string; value: string }> | null> {
  const handle = `dpp-${productId.split("/").pop()}`;
  const result = await shopifyGraphQL<{
    metaobjectByHandle: {
      id: string;
      handle: string;
      fields: Array<{ key: string; value: string }>;
      updatedAt: string;
    } | null;
  }>(graphql, GET_DPP_METAOBJECT, {
    handle,
    type: DPP_METAOBJECT_TYPE,
  });

  return result.metaobjectByHandle?.fields ?? null;
}

/**
 * ショップ全体のDPP充足率サマリを取得
 */
export async function getDppStoreSummary(shop: string) {
  const all = await db.dppCoverage.findMany({ where: { shop } });
  if (all.length === 0) return { totalProducts: 0, avgScore: 0, fullyCompliant: 0 };

  const avg = all.reduce((sum, r) => sum + r.coverageScore, 0) / all.length;
  const fullyCompliant = all.filter((r) => r.coverageScore >= 1.0).length;

  return {
    totalProducts: all.length,
    avgScore: Math.round(avg * 100),
    fullyCompliant,
  };
}
