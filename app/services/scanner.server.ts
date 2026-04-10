import { withRetry } from "../lib/retry.server";
import { logger } from "../lib/logger.server";
import { checkThemeLimitAndFork } from "./theme-forker.server";
import { softDeleteGhostNodes } from "./ast-deleter.server";
import { validateWorkTheme } from "./theme-validator.server";

export interface PipelineResult {
  scanFoundIssues: boolean;
  workThemeId?: string;
  filesModified?: {
    fileName: string;
    foundGhosts: string[];
    deletedNodeCount: number;
    originalContent: string;
    modifiedContent: string;
  }[];
}

/**
 * Executes the Phase 2 Pipeline:
 * 1. Scan Live Theme
 * 2. Fork to Workspace Theme
 * 3. Safely Soft Delete nodes via AST
 * 4. Run Smoke Test Validation
 */
export async function processGhostCodePipeline(graphql: any, shopDomain: string): Promise<PipelineResult> {
  return await withRetry(async () => {
    logger.info("Starting Phase 2 Safe Ghost Code Deletion Pipeline...");

    // 1. Fetch Main Theme
    const themesResponse = await graphql(`
      #graphql
      query GetMainTheme {
        themes(first: 10, roles: [MAIN]) {
          edges { node { id name } }
        }
      }
    `);
    const themesData = await themesResponse.json();
    const mainTheme = themesData.data?.themes?.edges?.[0]?.node;
    if (!mainTheme) throw new Error("Main theme not found.");

    // 2. Scan Target Files
    const targetKeys = ["layout/theme.liquid", "templates/product.liquid"];
    const filesToModify = [];

    const ghostPatterns = [
      { name: "Legacy Judgeme Snippet", regex: /{%\s*include\s*['"]judgeme_core['"]\s*%}/g },
      { name: "Legacy Bold App Scripts", regex: /bold-options\.js/g },
      { name: "Global jQuery Injection", regex: /<script.*jquery.*<\/script>/gi },
    ];

    for (const key of targetKeys) {
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
                      ... on OnlineStoreThemeFileBodyText { content } 
                    } 
                  } 
                } 
              }
            }
          }
        }
      `, { variables: { themeId: mainTheme.id, key } });

      const contentData = await assetResponse.json();
      const fileContent = contentData.data?.theme?.files?.edges?.[0]?.node?.body?.content;

      if (fileContent) {
        const foundGhosts = ghostPatterns.filter(p => p.regex.test(fileContent)).map(p => p.name);
        if (foundGhosts.length > 0) {
          const astResult = softDeleteGhostNodes(fileContent, ['judgeme_core', 'bold-options.js', 'jquery']);
          if (astResult.deletedNodeCount > 0) {
              filesToModify.push({
                  fileName: key,
                  foundGhosts,
                  deletedNodeCount: astResult.deletedNodeCount,
                  originalContent: fileContent,
                  modifiedContent: astResult.modifiedContent
              });
          }
        }
      }
    }

    if (filesToModify.length === 0) {
        return { scanFoundIssues: false };
    }

    // 3. Theme Isolation (Fork)
    const workThemeId = await checkThemeLimitAndFork(graphql);

    // 4. Update files on the Work Theme
    const upsertFiles = filesToModify.map(f => ({
        filename: f.fileName,
        body: { type: "TEXT", value: f.modifiedContent }
    }));

    logger.info(`Applying AST modifications to ${upsertFiles.length} files in Work Theme...`);
    const upsertRes = await graphql(`
      #graphql
      mutation themeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
        themeFilesUpsert(themeId: $themeId, files: $files) {
          upsertedThemeFiles { filename }
          userErrors { field message }
        }
      }
    `, { variables: { themeId: workThemeId, files: upsertFiles } });

    const upsertData = await upsertRes.json();
    const errors = upsertData.data?.themeFilesUpsert?.userErrors;
    if (errors && errors.length > 0) {
        throw new Error(`Failed to apply AST modifications to Work Theme: ${errors[0].message}`);
    }

    // 5. Validation Loop & Smoke Test
    const validation = await validateWorkTheme(shopDomain, workThemeId);
    if (!validation.isValid) {
        throw new Error(`Smoke Test failed after AST modifications: ${validation.errors.join(', ')}`);
    }

    logger.info("Pipeline Complete. Pending Human-in-the-loop approval.");

    return {
        scanFoundIssues: true,
        workThemeId,
        filesModified: filesToModify
    };
  }, "Safe Pipeline");
}
