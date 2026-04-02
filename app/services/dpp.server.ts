import { withRetry } from "../lib/retry.server";
import { logger } from "../lib/logger.server";

/**
 * EUのESPR規制に対応する Digital Product Passport (DPP) を管理するための処理。
 * インストール時などに呼び出され、必要な Metaobject のスキーマ（定義）を自動生成します。
 */
export async function setupDppMetaobjectDefinition(graphql: any) {
  return await withRetry(async () => {
    logger.info("Setting up DPP Metaobject Definition (ecosync_dpp)...");

    const response = await graphql(`
      #graphql
      mutation CreateDppDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            id
            type
            name
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        definition: {
          name: "Digital Product Passport",
          type: "ecosync_dpp",
          access: {
            // ストアフロント（＝購入者が見る画面）から Liquid 経由で読み取り可能に設定
            storefront: "PUBLIC_READ" 
          },
          fieldDefinitions: [
            {
              name: "Material Composition",
              key: "materials",
              type: "single_line_text_field"
            },
            {
              name: "Carbon Footprint (kg CO2)",
              key: "carbon_footprint",
              type: "number_decimal"
            },
            {
              name: "Recyclability",
              key: "recyclability_percentage",
              type: "number_integer"
            }
          ]
        }
      }
    });

    const data = await response.json();
    const errors = data.data?.metaobjectDefinitionCreate?.userErrors;
    
    // 定義済みの場合はエラー (`Type has already been taken` 等) になるため、ログだけ出して通過させます
    if (errors && errors.length > 0) {
      logger.info("DPP Definition might already exist or setup failed.", { errors });
    } else {
      logger.info("Successfully created DPP Metaobject Definition.");
    }
  }, "Setup DPP Metaobject");
}
