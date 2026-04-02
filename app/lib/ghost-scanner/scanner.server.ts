import { shopifyGraphQL } from "../shopify/api-client.server";
import { GHOST_PATTERNS, type GhostFinding } from "./patterns";

// ---- GraphQL クエリ定義 ----

const GET_THEMES = `#graphql
  query GetThemes {
    themes(first: 20) {
      nodes {
        id
        name
        role
        processing
      }
    }
  }
`;

const GET_THEME_FILES = `#graphql
  query GetThemeFiles($themeId: ID!, $after: String) {
    theme(id: $themeId) {
      files(first: 100, after: $after) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

// ---- 型定義 ----

interface ShopifyTheme {
  id: string;
  name: string;
  role: string;
  processing: boolean;
}

interface ThemeFile {
  filename: string;
  body?: { content?: string };
}

interface ThemesQueryResult {
  themes: { nodes: ShopifyTheme[] };
}

interface ThemeFilesQueryResult {
  theme: {
    files: {
      nodes: ThemeFile[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

// ---- スキャン関数 ----

/**
 * スキャン対象のファイル拡張子
 * JSON/Liquidのみ走査（画像等はスキップ）
 */
function isScannable(filename: string): boolean {
  return /\.(liquid|json|css|js)$/.test(filename);
}

/**
 * ファイル内容をパターンでスキャンし、Findingを返す
 */
function scanContent(filename: string, content: string): GhostFinding[] {
  const findings: GhostFinding[] = [];
  const lines = content.split("\n");

  for (const gp of GHOST_PATTERNS) {
    // 各行に対してパターンをテスト
    lines.forEach((line, idx) => {
      // RegExpはgフラグ付きのためlastIndexをリセット
      gp.pattern.lastIndex = 0;
      const match = gp.pattern.exec(line);
      if (match) {
        findings.push({
          patternId: gp.id,
          category: gp.category,
          description: gp.description,
          severity: gp.severity,
          assetKey: filename,
          lineNumber: idx + 1,
          matchedText: match[0].slice(0, 120), // 長すぎる場合は切り捨て
        });
      }
      gp.pattern.lastIndex = 0;
    });
  }

  return findings;
}

/**
 * テーマ一覧を取得
 */
export async function getThemes(
  graphql: Parameters<typeof shopifyGraphQL>[0]
): Promise<ShopifyTheme[]> {
  const data = await shopifyGraphQL<ThemesQueryResult>(graphql, GET_THEMES);
  return data.themes.nodes;
}

/**
 * 指定テーマの全ファイルをページネーションで取得し、ゴーストコードをスキャン
 */
export async function scanTheme(
  graphql: Parameters<typeof shopifyGraphQL>[0],
  themeId: string
): Promise<GhostFinding[]> {
  const allFindings: GhostFinding[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await shopifyGraphQL<ThemeFilesQueryResult>(
      graphql,
      GET_THEME_FILES,
      { themeId, after: cursor }
    );

    const files = data.theme?.files;
    if (!files) break;

    for (const file of files.nodes) {
      if (!isScannable(file.filename)) continue;
      const content = file.body?.content;
      if (!content) continue;

      const findings = scanContent(file.filename, content);
      allFindings.push(...findings);
    }

    hasNextPage = files.pageInfo.hasNextPage;
    cursor = files.pageInfo.endCursor;
  }

  return allFindings;
}

// summarizeFindings は scanner.shared.ts に移動済み
export { summarizeFindings } from "./scanner.shared";
