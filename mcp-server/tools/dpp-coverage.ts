import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const dppCoverageTool = {
  name: "ecosync_dpp_coverage",
  description:
    "Digital Product Passport (DPP) の充足率を取得します。" +
    "EU ESPR規制への適合状況と、未入力フィールドを報告します。",
  inputSchema: z.object({
    shop: z.string().describe("Shopifyストアドメイン"),
    productId: z
      .string()
      .optional()
      .describe("特定商品のGID（省略時はストア全体のサマリ）"),
  }),
  handler: async ({
    shop,
    productId,
  }: {
    shop: string;
    productId?: string;
  }) => {
    if (productId) {
      // 特定商品のDPP充足率
      const record = await db.dppCoverage.findUnique({
        where: { shop_productId: { shop, productId } },
      });

      if (!record) {
        return {
          productId,
          status: "no_dpp",
          message: "この商品のDPPデータはまだ作成されていません。",
        };
      }

      return {
        productId,
        coverageScore: Math.round(record.coverageScore * 100),
        missingFields: JSON.parse(record.missingFields),
        compliant: record.coverageScore >= 1.0,
        updatedAt: record.updatedAt.toISOString(),
      };
    }

    // ストア全体のサマリ
    const all = await db.dppCoverage.findMany({ where: { shop } });

    if (all.length === 0) {
      return {
        shop,
        totalProducts: 0,
        message: "DPPデータが登録されている商品はありません。",
      };
    }

    const avgScore = all.reduce((sum, r) => sum + r.coverageScore, 0) / all.length;
    const fullyCompliant = all.filter((r) => r.coverageScore >= 1.0).length;
    const partiallyCompliant = all.filter(
      (r) => r.coverageScore >= 0.5 && r.coverageScore < 1.0
    ).length;
    const nonCompliant = all.filter((r) => r.coverageScore < 0.5).length;

    return {
      shop,
      totalProducts: all.length,
      averageCoverageScore: Math.round(avgScore * 100),
      fullyCompliant,
      partiallyCompliant,
      nonCompliant,
      espdReadiness:
        avgScore >= 0.8
          ? "準拠済み（ESPR申告可能）"
          : avgScore >= 0.5
          ? "部分準拠（追加データ入力が必要）"
          : "未準拠（DPPデータの充実が急務）",
    };
  },
};
