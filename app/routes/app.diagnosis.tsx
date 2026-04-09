import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Icon,
  Badge,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({
    stats: {
      ghostCodeCount: 14,
      revenueImpact: "-7.4%",
      speedScore: 68,
      speedDrop: "-15 pts",
      dppCoverage: "12%",
    },
  });
}

export default function DiagnosisPage() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Store Health & AI Readiness Report"
      subtitle="EcoSync analyzed your store's backend environment."
      primaryAction={{ content: "Full Cleanup & Optimization" }}
    >
      <Layout>
        {/* Critical Alert Banner */}
        <Layout.Section>
          <Banner tone="critical">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              Critical issues detected. 14 items are currently slowing down your store and impacting AI discoverability.
            </Text>
          </Banner>
        </Layout.Section>

        {/* Top Stats: Revenue & Speed */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="headingSm" tone="subdued">Estimated Revenue Loss</Text>
              <div style={{ color: "#d72c0d", fontSize: "3rem", fontWeight: "900", textAlign: "center", lineHeight: "1" }}>
                {stats.revenueImpact}
              </div>
              <Text as="p" variant="bodySm" tone="critical" fontWeight="bold">
                Impacted by theme bloat
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="headingSm" tone="subdued">Mobile Performance</Text>
              <div style={{ color: "#e65100", fontSize: "3rem", fontWeight: "900", textAlign: "center", lineHeight: "1" }}>
                {stats.speedScore}
              </div>
              <Text as="p" variant="bodySm" tone="critical" fontWeight="bold">
                {stats.speedDrop} (Legacy Scripts)
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="headingSm" tone="subdued">AI Discoverability</Text>
              <div style={{ color: "#2e7d32", fontSize: "3rem", fontWeight: "900", textAlign: "center", lineHeight: "1" }}>
                {stats.dppCoverage}
              </div>
              <Text as="p" variant="bodySm" tone="success" fontWeight="bold">
                DPP Data Incomplete
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Detailed Findings */}
        <Layout.Section>
          <Card padding="0">
            <Box padding="400">
                <Text as="h2" variant="headingMd">Ghost Code Scan - Primary Findings</Text>
            </Box>
            <Divider />
            <Box padding="400">
                <BlockStack gap="400">
                    <FindingItem 
                        icon="🔍"
                        title="Orphaned ScriptTags (3rd-party leftovers)"
                        description="Tracking scripts from 4 uninstalled apps are still loading on every page visit."
                        severity="High"
                    />
                    <FindingItem 
                         icon="⚠️"

                         title="Redundant Tracking Scripts Found"
                         description="8 references to non-existent 'product-wishlist' and 'currency-converter' files detected."
                         severity="Medium"
                    />
                    <FindingItem 
                         icon="🔍"
                         title="Missing AI Meta-Tags (GEO Optimization)"
                         description="Your sustainable attributes are not visible to AI Crawlers & Shopify Sidekick."
                         severity="High"
                    />
                </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Call to action footer */}
        <Layout.Section>
            <Card>
               <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingMd">Ready to boost your conversion?</Text>
                    <Text as="p" variant="bodyMd" tone="subdued">Everything can be fixed in 1-click without technical knowledge.</Text>
                  </BlockStack>
                  <Button variant="primary" size="large">Clean My Store Now</Button>
               </InlineStack>
            </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function FindingItem({ icon, title, description, severity }: { icon: string, title: string, description: string, severity: "High" | "Medium" | "Low" }) {
    return (
        <InlineStack gap="400" wrap={false} blockAlign="start">
            <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <div style={{ fontSize: "20px" }}>{icon}</div>
            </Box>
            <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodyMd" fontWeight="bold">{title}</Text>
                    <Badge tone={severity === "High" ? "critical" : "warning"}>{severity}</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">{description}</Text>
            </BlockStack>
        </InlineStack>
    );
}
