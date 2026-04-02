/**
 * EcoSync MCP サーバー
 * Shopify Sidekick から EcoSync データを参照できるようにする
 * Model Context Protocol (MCP) 実装
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ghostCodeStatsTool } from "./tools/ghost-code-stats.js";
import { dppCoverageTool } from "./tools/dpp-coverage.js";

const server = new McpServer({
  name: "ecosync-mcp",
  version: "1.0.0",
});

// ---- ツール登録 ----

server.tool(
  ghostCodeStatsTool.name,
  ghostCodeStatsTool.description,
  ghostCodeStatsTool.inputSchema.shape,
  async ({ shop }) => {
    const result = await ghostCodeStatsTool.handler({ shop });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  dppCoverageTool.name,
  dppCoverageTool.description,
  dppCoverageTool.inputSchema.shape,
  async ({ shop, productId }) => {
    const result = await dppCoverageTool.handler({ shop, productId });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ---- EcoSyncサマリツール ----

server.tool(
  "ecosync_store_health",
  "EcoSyncが管理するストアの総合健全性レポートを取得します。ゴーストコード数、DPP充足率、UCP対応状況をまとめて返します。",
  {
    shop: {
      type: "string" as const,
      description: "Shopifyストアドメイン",
    },
  },
  async ({ shop }) => {
    const [ghostResult, dppResult] = await Promise.all([
      ghostCodeStatsTool.handler({ shop }),
      dppCoverageTool.handler({ shop }),
    ]);

    const summary = {
      shop,
      reportGeneratedAt: new Date().toISOString(),
      ghostCode: ghostResult,
      dpp: dppResult,
      overallHealthScore:
        "healthScore" in ghostResult ? ghostResult.healthScore : null,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  }
);

// ---- サーバー起動 ----

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[EcoSync MCP] Server running on stdio");
}

main().catch((err) => {
  console.error("[EcoSync MCP] Fatal error:", err);
  process.exit(1);
});
