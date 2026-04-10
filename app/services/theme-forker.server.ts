import { logger } from "../lib/logger.server";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

/**
 * ライブテーマを作業テーマ（Work Theme）として複製（Fork）する機能群
 */

export async function checkThemeLimitAndFork(graphql: AdminApiContext["graphql"]): Promise<string> {
  // 1. Check current total themes
  const themesResponse = await graphql(`
    #graphql
    query GetThemesCountAndMain {
      themes(first: 250) {
        edges {
          node {
            id
            role
            name
          }
        }
      }
    }
  `);

  const themesData = await themesResponse.json();
  const themesEdges = themesData.data?.themes?.edges || [];
  
  if (themesEdges.length >= 20) {
    throw new Error("Theme limit reached (Max 20/100). Please delete an unused theme from your Shopify admin to allow EcoSync to create a Workspace Theme.");
  }

  const mainThemeNode = themesEdges.find((edge: any) => edge.node.role === "MAIN")?.node;
  if (!mainThemeNode) {
    throw new Error("Could not find the MAIN theme to fork.");
  }

  logger.info(`Initiating Theme Fork from MAIN Theme: ${mainThemeNode.name} (${mainThemeNode.id})`);

  // 2. Duplicate Theme using API Version >= 2025-10
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // safe string
  const duplicateResponse = await graphql(`
    #graphql
    mutation duplicateTheme($id: ID!, $name: String) {
      themeDuplicate(id: $id, name: $name) {
        theme {
          id
          name
          role
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      id: mainThemeNode.id,
      name: `[EcoSync WS] ${timestamp}`
    }
  });

  const dupData = await duplicateResponse.json();
  const userErrors = dupData.data?.themeDuplicate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    logger.error("Error duplicating theme", userErrors);
    throw new Error(`Failed to fork theme: ${userErrors[0].message}`);
  }

  const newTheme = dupData.data?.themeDuplicate?.theme;
  if (!newTheme) {
    throw new Error("Duplicate request succeeded but no new theme ID was returned by Shopify.");
  }

  logger.info(`Successfully created Workspace Theme: ${newTheme.name} (${newTheme.id})`);
  
  return newTheme.id;
}
