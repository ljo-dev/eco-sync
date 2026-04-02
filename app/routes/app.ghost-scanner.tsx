import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  DataTable,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  Spinner,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  getThemes,
  scanTheme,
} from "../lib/ghost-scanner/scanner.server";
import { summarizeFindings } from "../lib/ghost-scanner/scanner.shared";
import type { GhostFinding } from "../lib/ghost-scanner/patterns";

// ---- Loader ----

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const latest = await db.ghostScanResult.findFirst({
    where: { shop: session.shop },
    orderBy: { scannedAt: "desc" },
  });
  return json({
    lastScan: latest
      ? {
          themeId: latest.themeId,
          themeName: latest.themeName,
          findings: JSON.parse(latest.findings) as GhostFinding[],
          scannedAt: latest.scannedAt.toISOString(),
        }
      : null,
  });
}

// ---- Action ----

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  try {
    // アクティブテーマを取得
    const themes = await getThemes(admin.graphql);
    const liveTheme = themes.find((t) => t.role === "MAIN") ?? themes[0];

    if (!liveTheme) {
      return json({ error: "テーマが見つかりませんでした。" }, { status: 404 });
    }

    if (liveTheme.processing) {
      return json(
        { error: "テーマが処理中です。しばらく待ってから再試行してください。" },
        { status: 409 }
      );
    }

    // スキャン実行
    const findings = await scanTheme(admin.graphql, liveTheme.id);

    // 結果をDB保存（upsert）
    await db.ghostScanResult.create({
      data: {
        shop: session.shop,
        themeId: liveTheme.id,
        themeName: liveTheme.name,
        findings: JSON.stringify(findings),
      },
    });

    return json({
      success: true,
      themeName: liveTheme.name,
      findings,
      summary: summarizeFindings(findings),
    });
  } catch (err) {
    console.error("[GhostScanner] Scan error:", err);
    return json(
      { error: "スキャン中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

// ---- Component ----

const SEVERITY_BADGE: Record<string, "critical" | "warning" | "info"> = {
  high: "critical",
  medium: "warning",
  low: "info",
};

export default function GhostScannerPage() {
  const { lastScan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isScanning = navigation.state === "submitting";

  const findings: GhostFinding[] =
    "findings" in (actionData ?? {})
      ? (actionData as { findings: GhostFinding[] }).findings
      : (lastScan?.findings ?? []);

  const summary =
    "summary" in (actionData ?? {})
      ? (actionData as { summary: ReturnType<typeof summarizeFindings> }).summary
      : findings.length > 0
      ? summarizeFindings(findings)
      : null;

  const rows = findings.map((f) => [
    <Badge tone={SEVERITY_BADGE[f.severity]}>{f.severity.toUpperCase()}</Badge>,
    f.assetKey,
    f.lineNumber?.toString() ?? "-",
    f.description,
    <Text as="span" variant="bodySm" tone="subdued">
      {f.matchedText}
    </Text>,
  ]);

  return (
    <Page
      title="Ghost Code Scanner"
      subtitle="テーマ内の削除済みアプリの残骸を検出します"
    >
      <Layout>
        {"error" in (actionData ?? {}) && (
          <Layout.Section>
            <Banner tone="critical">
              {(actionData as { error: string }).error}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    ライブテーマをスキャン
                  </Text>
                  {lastScan && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      最終スキャン: {new Date(lastScan.scannedAt).toLocaleString("ja-JP")} —{" "}
                      {lastScan.themeName}
                    </Text>
                  )}
                </BlockStack>
                <Form method="post">
                  <Button
                    submit
                    variant="primary"
                    loading={isScanning}
                    disabled={isScanning}
                  >
                    スキャン実行
                  </Button>
                </Form>
              </InlineStack>

              {isScanning && (
                <InlineStack gap="200" blockAlign="center">
                  <Spinner size="small" />
                  <Text as="p">テーマファイルをスキャン中...</Text>
                </InlineStack>
              )}

              {summary && (
                <InlineStack gap="300">
                  <Badge tone="critical">高: {summary.high}</Badge>
                  <Badge tone="warning">中: {summary.medium}</Badge>
                  <Badge tone="info">低: {summary.low}</Badge>
                  <Text as="span" variant="bodySm">
                    合計 {summary.total} 件
                  </Text>
                </InlineStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          {findings.length === 0 && !isScanning ? (
            <EmptyState
              heading="ゴーストコードは見つかりませんでした"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>スキャンを実行してテーマの健全性を確認してください。</p>
            </EmptyState>
          ) : (
            <Card>
              <DataTable
                columnContentTypes={["text", "text", "numeric", "text", "text"]}
                headings={["重要度", "ファイル", "行", "説明", "検出内容"]}
                rows={rows}
                truncate
              />
            </Card>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
