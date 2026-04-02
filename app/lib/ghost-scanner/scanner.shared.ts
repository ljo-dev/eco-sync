import type { GhostFinding } from "./patterns";

/**
 * スキャン結果のサマリを生成（クライアント・サーバー共用）
 */
export function summarizeFindings(findings: GhostFinding[]) {
  return {
    total: findings.length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    byCategory: findings.reduce(
      (acc, f) => {
        acc[f.category] = (acc[f.category] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}
