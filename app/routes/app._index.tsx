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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { scanThemeForGhostCode } from "../services/scanner.server";
import { handleAppError } from "../lib/errorHandler.server";
import { getTranslations } from "../lib/i18n.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const t = getTranslations(request);
  return json({ t });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const results = await scanThemeForGhostCode(admin.graphql);
    return json({ success: true, results });
  } catch (error: any) {
    handleAppError(error, "Ghost Code Scanner Action");
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function Index() {
  const nav = useNavigation();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const { t } = useLoaderData<typeof loader>();

  const isScanning = nav.state === "submitting" || nav.state === "loading";

  const handleScan = () => {
    submit({}, { replace: true, method: "POST" });
  };

  return (
    <Page>
      <TitleBar title={t.dashboard.title} />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  📸 App Listing Asset Previews
                </Text>
                <Text as="p" variant="bodyMd">
                  Click the buttons below to open the newly generated screens for taking screenshots.
                </Text>
                <InlineStack gap="300">
                  <Button url="/app/diagnosis">Diagnosis Screen</Button>
                  <Button url="/app/preview">AI Preview Screen</Button>
                  <Button url="/app/dpp-demo">DPP Demo Screen</Button>
                </InlineStack>
                <InlineStack gap="300">
                  <Button url="/app/mock-chatgpt">Mock ChatGPT</Button>
                  <Button url="/app/mock-pagespeed">Mock PageSpeed</Button>
                  <Button url="/app/mock-pricing">Mock Pricing</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
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
                    {t.dashboard.scanButton}
                  </Button>
                </InlineStack>

                {actionData && (
                  <Box paddingBlockStart="400">
                    {actionData.success ? (
                      actionData.results && actionData.results.length > 0 ? (
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm" tone="critical">
                            {t.dashboard.scanFound} ({actionData.results.length} {t.dashboard.files})
                          </Text>
                          <List type="bullet">
                            {actionData.results.map((r: any, i: number) => (
                              <List.Item key={i}>
                                <Text as="strong">{r.fileName} : </Text>
                                <InlineStack gap="200">
                                  {r.foundGhosts.map((g: string, j: number) => (
                                    <Badge key={j} tone="warning">{g}</Badge>
                                  ))}
                                </InlineStack>
                              </List.Item>
                            ))}
                          </List>
                        </BlockStack>
                      ) : (
                        <Text as="p" variant="bodyMd" tone="success">
                          {t.dashboard.scanClean}
                        </Text>
                      )
                    ) : (
                      <Text as="p" variant="bodyMd" tone="critical">
                        {t.dashboard.scanError}{actionData.error}
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
