import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const ghostCodeStatsTool = {
  name: "ecosync_ghost_code_stats",
  description:
    "EcoSyncが検出したゴーストコード（削除済みアプリの残骸）の統計を取得します。" +
    "ショップのテーマ健全性スコアと検出されたレガシーコードの数を返します。",
  inputSchema: z.object({
    shop: z.string().describe("Shopifyストアドメイン（例: mystore.myshopify.com）"),
  }),
  handler: async ({ shop }: { shop: string }) => {
    const latest = await db.ghostScanResult.findFirst({
      where: { shop },
      orderBy: { scannedAt: "desc" },
    });

    if (!latest) {
      return {
        shop,
        status: "not_scanned",
        message: "まだスキャンが実行されていません。EcoSyncアプリからスキャンを実行してください。",
      };
    }

    const findings = JSON.parse(latest.findings) as Array<{
      severity: string;
      category: string;
    }>;

    const summary = {
      total: findings.length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      byCategory: findings.reduce(
        (acc, f) => ({ ...acc, [f.category]: (acc[f.category] ?? 0) + 1 }),
        {} as Record<string, number>
      ),
    };

    // 健全性スコア (0-100): 検出数が少ないほど高スコア
    const healthScore = Math.max(0, 100 - summary.high * 10 - summary.medium * 5 - summary.low * 2);

    return {
      shop,
      themeName: latest.themeName,
      lastScannedAt: latest.scannedAt.toISOString(),
      summary,
      healthScore,
      recommendation:
        summary.high > 0
          ? `${summary.high}件の高リスクなゴーストコードを優先的に削除してください。`
          : summary.total > 0
          ? `${summary.total}件の軽微な残骸が見つかりました。定期的なクリーンアップを推奨します。`
          : "テーマはクリーンです。ゴーストコードは検出されませんでした。",
    };
  },
};
