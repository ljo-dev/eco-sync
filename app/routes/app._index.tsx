import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineStack,
  Badge,
  Banner
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { handleAppError } from "../lib/errorHandler.server";
import { getTranslations } from "../lib/i18n.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const t = getTranslations(request);
  return json({ t, shop: session.shop });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  try {
    if (intent === "scan") {
      const { processGhostCodePipeline } = await import("../services/scanner.server");
      const results = await processGhostCodePipeline(admin.graphql, session.shop);
      return json({ success: true, intent, results });
    }

    if (intent === "apply") {
      const workThemeId = formData.get("workThemeId") as string;
      if (!workThemeId) throw new Error("No Work Theme ID provided.");
      
      const publishRes = await admin.graphql(`
        #graphql
        mutation publishTheme($id: ID!) {
          themePublish(id: $id) {
            theme { id role }
            userErrors { message }
          }
        }
      `, { variables: { id: workThemeId } });

      const pubData = await publishRes.json();
      const errors = pubData.data?.themePublish?.userErrors;
      if (errors && errors.length > 0) {
        throw new Error(`Failed to publish theme: ${errors[0].message}`);
      }

      return json({ success: true, intent, message: "Successfully applied AST-deleted Workspace Theme to Live Store!" });
    }

    return json({ success: false, error: "Invalid intent" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof Response) throw error;
    handleAppError(error, `Ghost Code Scanner Action [${intent}]`);
    return json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
};

export default function Index() {
  const nav = useNavigation();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const { t, shop } = useLoaderData<typeof loader>();

  const isScanning = nav.state === "submitting" && nav.formData?.get("intent") === "scan";
  const isApplying = nav.state === "submitting" && nav.formData?.get("intent") === "apply";

  const handleScan = () => {
    const formData = new FormData();
    formData.append("intent", "scan");
    submit(formData, { replace: true, method: "POST" });
  };

  const handleApply = (workThemeId: string) => {
    const formData = new FormData();
    formData.append("intent", "apply");
    formData.append("workThemeId", workThemeId);
    submit(formData, { replace: true, method: "POST" });
  };

  return (
    <Page>
      <TitleBar title={t.dashboard.title} />
      <BlockStack gap="500">
        
        {/* Success Banner after Apply */}
        {actionData?.success && actionData.intent === "apply" && (
          <Banner tone="success" title="Publication Successful">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {/* Human-in-the-Loop Diff Viewer */}
        {actionData?.success && actionData.intent === "scan" && actionData.results?.scanFoundIssues && (
          <Banner tone="warning" title="Pending Review: Smoke Test Passed on Workspace Theme" action={{ content: 'Apply to Live Theme', onClick: () => handleApply(actionData.results.workThemeId), loading: isApplying }}>
            <BlockStack gap="300">
              <p>EcoSync detected ghost code, created an isolated Workspace Theme, and performed safe AST Soft-Deletions. The automated Smoke Test verified no pages crashed.</p>
              
              <InlineStack gap="300">
                <Button target="_blank" url={`https://${shop}?preview_theme_id=${actionData.results.workThemeId}`}>
                  View Live Preview URL (Work Theme)
                </Button>
              </InlineStack>

              <Text as="h3" variant="headingSm">Affected Files (Diff summary):</Text>
              <List type="bullet">
                {actionData.results.filesModified.map((f: any, i: number) => (
                  <List.Item key={i}>
                    <strong>{f.fileName}</strong>: Wrapped {f.deletedNodeCount} nodes in EcoSync Soft-Delete comments.
                    <br />
                    <span style={{ color: "#d22d2d" }}>Patterns detected: {f.foundGhosts.join(", ")}</span>
                  </List.Item>
                ))}
              </List>
              
              <p>Click <strong>Apply to Live Theme</strong> to formally replace your live store with this structurally cleaned Work Theme.</p>
            </BlockStack>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t.dashboard.scannerTitle}
                </Text>
                <Text as="p" variant="bodyMd">
                  {t.dashboard.scannerDesc}
                </Text>

                <InlineStack gap="300">
                  <Button loading={isScanning} onClick={handleScan} variant="primary">
                    Start Safe Validation Scan
                  </Button>
                </InlineStack>

                {actionData && (
                  <Box paddingBlockStart="400">
                    {actionData.success && actionData.intent === "scan" && !actionData.results?.scanFoundIssues && (
                        <Text as="p" variant="bodyMd" tone="success">
                          {t.dashboard.scanClean}
                        </Text>
                    )}
                    
                    {!actionData.success && (
                      <Text as="p" variant="bodyMd" tone="critical">
                        Pipeline Error: {actionData.error}
                      </Text>
                    )}
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
