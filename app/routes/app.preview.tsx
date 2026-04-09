import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  Icon,
  Grid,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export default function AIPreviewPage() {
  return (
    <Page
      title="AI Discoverability & SEO Preview"
      subtitle="Compare how AI scrapers (ChatGPT, Perplexity, Shopify Sidekick) see your store."
    >
      <Layout>
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Card background="bg-surface-secondary">
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingMd" tone="subdued">Standard Shopify (Legacy)</Text>
                  </InlineStack>
                  <Box padding="400" background="bg-surface" borderRadius="200" borderStyle="dashed" borderWidth="025">
                    <pre style={{ fontSize: "11px", color: "#666", whiteSpace: "pre-wrap" }}>
{`{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Eco-Organic Cotton T-Shirt",
  "description": "A nice shirt made of cotton.",
  "offers": {
    "price": "45.00",
    "priceCurrency": "USD"
  }
  // Missing Sustainability Data
  // Missing DPP Links
  // Missing Supply Chain Info
}`}
                    </pre>
                  </Box>
                  <Text as="p" variant="bodySm" tone="critical">
                    AI risk: Limited discoverability for "Sustainable" queries.
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Card background="bg-fill-success-secondary">
                <BlockStack gap="300">
                   <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingMd" tone="success">EcoSync Optimized (UCP)</Text>
                    <span style={{ fontSize: "20px" }}>✅</span>
                  </InlineStack>
                  <Box padding="400" background="bg-surface" borderRadius="200" borderColor="border-success" borderWidth="050">
                    <pre style={{ fontSize: "11px", color: "#1a1a1a", whiteSpace: "pre-wrap", fontWeight: "bold" }}>
{`{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Eco-Organic Cotton T-Shirt",
  "sustainable_attributes": {
    "material": "GOTS Certified Organic Cotton",
    "carbon_footprint": "2.4kg CO2e",
    "origin": "Verified Fair-Trade (Turkey)"
  },
  "digital_passport": "https://ecosync.io/dpp/123",
  "geo_optimized": true,
  "ucp_version": "1.0"
}`}
                    </pre>
                  </Box>
                   <Text as="p" variant="bodySm" tone="success" fontWeight="bold">
                    AI Reward: Ranked #1 for "Sustainability-focused" recommendations.
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        <Layout.Section>
            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Search Engine & AI Crawler Insights</Text>
                    <Divider />
                    <InlineStack gap="400" blockAlign="center">
                        <Box padding="200" background="bg-surface-secondary" borderRadius="full">
                           <span style={{ fontSize: "20px" }}>🔍</span>
                        </Box>
                        <BlockStack gap="100">
                            <Text as="p" variant="bodyMd" fontWeight="bold">Shopify Sidekick Ready</Text>
                            <Text as="p" variant="bodySm" tone="subdued">Direct integration with Shopify's AI assistant is active.</Text>
                        </BlockStack>
                    </InlineStack>
                </BlockStack>
            </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
