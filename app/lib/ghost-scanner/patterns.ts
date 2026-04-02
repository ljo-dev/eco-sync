/**
 * ゴーストコード検出パターン定義
 * - テーマ内に残存する古いアプリの残骸を検出するルール集
 */

export type PatternCategory =
  | "script_tag"      // ScriptTag API由来のスクリプト
  | "liquid_snippet"  // 削除済みアプリのLiquidスニペット
  | "css_class"       // 孤立したCSSクラス
  | "dead_app_block"; // 無効化されたアプリブロック

export interface GhostPattern {
  id: string;
  category: PatternCategory;
  description: string;
  // ファイル内容に対してテストする正規表現
  pattern: RegExp;
  severity: "high" | "medium" | "low";
}

export const GHOST_PATTERNS: GhostPattern[] = [
  // --- ScriptTag API 残骸 ---
  {
    id: "ST001",
    category: "script_tag",
    description: "ScriptTag APIで注入されたレガシースクリプトタグ",
    pattern: /cdn\.shopify\.com\/s\/files\/.*\.js/gi,
    severity: "high",
  },
  {
    id: "ST002",
    category: "script_tag",
    description: "外部アプリCDNからのスクリプト読み込み",
    pattern: /<script[^>]+src=["'][^"']*(?:apps\.shopify|shopifyapps)\.com[^"']*["']/gi,
    severity: "high",
  },

  // --- 削除済みアプリのLiquidスニペット ---
  {
    id: "LQ001",
    category: "liquid_snippet",
    description: "存在しないスニペットへのrenderタグ",
    pattern: /\{%-?\s*render\s+['"]([^'"]+)['"]\s*-?%\}/gi,
    severity: "medium",
  },
  {
    id: "LQ002",
    category: "liquid_snippet",
    description: "削除済みアプリのLiquidコメントブロック",
    pattern: /\{%-?\s*comment\s*-?%\}.*?app.*?\{%-?\s*endcomment\s*-?%\}/gis,
    severity: "low",
  },
  {
    id: "LQ003",
    category: "liquid_snippet",
    description: "孤立したapp_block参照",
    pattern: /\{%-?\s*content_for\s+['"]app_block['"]/gi,
    severity: "medium",
  },

  // --- 孤立CSSクラス ---
  {
    id: "CSS001",
    category: "css_class",
    description: "一般的なサードパーティアプリのCSSクラスパターン",
    pattern: /class=["'][^"']*(?:klaviyo|loox|yotpo|stamped|okendo|gorgias|tidio|crisp|intercom|drift|hotjar|lucky-orange)[^"']*["']/gi,
    severity: "medium",
  },

  // --- 無効アプリブロック ---
  {
    id: "AB001",
    category: "dead_app_block",
    description: "スキーマ未定義のアプリブロック参照",
    pattern: /"type":\s*"@app"/gi,
    severity: "high",
  },
];

export interface GhostFinding {
  patternId: string;
  category: PatternCategory;
  description: string;
  severity: "high" | "medium" | "low";
  assetKey: string;   // 例: "templates/product.liquid"
  lineNumber: number | null;
  matchedText: string;
}
