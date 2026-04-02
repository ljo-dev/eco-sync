import { withRetry } from "../lib/retry.server";
import { logger } from "../lib/logger.server";

export interface ScanResult {
  fileName: string;
  foundGhosts: string[];
}

/**
 * テーマのコードをスキャンして、過去のアプリの「ゴーストコード」や
 * パフォーマンスを低下させるレガシーなインクルードを検知します。
 */
export async function scanThemeForGhostCode(graphql: any): Promise<ScanResult[]> {
  return await withRetry(async () => {
    logger.info("Starting Ghost Code Scan on the main publish theme...");

    // 1. メインテーマ（公開中のテーマ）のIDを取得
    const themesResponse = await graphql(`
      #graphql
      query GetMainTheme {
        themes(first: 10, roles: [MAIN]) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `);
    
    const themesData = await themesResponse.json();
    const mainTheme = themesData.data?.themes?.edges?.[0]?.node;
    
    if (!mainTheme) {
      throw new Error("Main theme not found.");
    }

    const results: ScanResult[] = [];

    // ゴーストコードの検知パターン（一般的な古いアプリの残骸など）
    const ghostPatterns = [
      { name: "Legacy Judgeme Snippet", regex: /{% include ['"]judgeme_core['"] %}/g },
      { name: "Legacy Bold App Scripts", regex: /bold-options\.js/g },
      { name: "Global jQuery Injection", regex: /<script.*jquery.*<\/script>/gi },
    ];

    // 本来はテーマ内の全 .liquid ファイルを再帰取得しますが、
    // ここでは代表的なレイアウト・テンプレートファイルに絞ってスキャンします
    const targetKeys = ["layout/theme.liquid", "templates/product.liquid"];

    for (const key of targetKeys) {
      // 2. 指定したアセット（ファイル）の内容を取得
      const assetResponse = await graphql(`
        #graphql
        query GetThemeAsset($themeId: ID!, $key: String!) {
          theme(id: $themeId) {
            files(first: 1, filenames: [$key]) {
              edges {
                node {
                  ... on OnlineStoreThemeFile {
                    filename
                    body {
                      ... on OnlineStoreThemeFileBodyText {
                        content
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: {
          themeId: mainTheme.id,
          key: key
        }
      });

      const assetData = await assetResponse.json();
      const assetFile = assetData.data?.theme?.files?.edges?.[0]?.node;

      const fileContent = assetFile?.body?.content;
      if (fileContent) {
        const foundGhosts: string[] = [];
        for (const pattern of ghostPatterns) {
          if (pattern.regex.test(fileContent)) {
            foundGhosts.push(pattern.name);
          }
        }
        
        if (foundGhosts.length > 0) {
          results.push({ fileName: key, foundGhosts });
        }
      }
    }

    logger.info(`Ghost Code Scan completed. Found issues in ${results.length} files.`);
    return results;
  }, "Ghost Code Scanner");
}
