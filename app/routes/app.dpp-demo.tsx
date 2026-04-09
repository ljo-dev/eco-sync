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
  Badge,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export default function DPPDemoPage() {
  return (
    <Page
      title="Digital Product Passport (DPP) Preview"
      subtitle="How customers interact with your sustainability data."
    >
      <Layout>
        <Layout.Section variant="oneHalf">
            <Card>
                <BlockStack gap="400" align="center">
                    <Box padding="600" background="bg-fill-secondary" borderRadius="full">
                        <span style={{ fontSize: "40px" }}>🌿</span>
                    </Box>
                    <Text as="h1" variant="headingLg">Eco-Organic Cotton T-Shirt</Text>
                    <Badge tone="success">Verified Sustainable</Badge>
                    
                    <Divider />
                    
                    <BlockStack gap="300" inlineAlign="stretch">
                        <DPPItem icon="🌍" label="Origin" value="Izmir, Turkey (Fair Trade)" />
                        <DPPItem icon="📜" label="Certification" value="GOTS Organic Cotton" />
                        <DPPItem icon="📦" label="Carbon Footprint" value="2.14 kg CO2e" />
                    </BlockStack>

                    <Box padding="400" background="bg-surface-secondary" borderRadius="200" width="100%">
                        <BlockStack gap="200" align="center">
                            <div style={{ width: "120px", height: "120px", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #ccc" }}>
                                <Text as="span" variant="bodySm" tone="subdued">QR Code Preview</Text>
                            </div>
                            <Text as="p" variant="bodySm" tone="subdued">Scan to view traceability</Text>
                        </BlockStack>
                    </Box>
                </BlockStack>
            </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
            <BlockStack gap="400">
                <Card>
                    <BlockStack gap="200">
                        <Text as="h3" variant="headingMd">Passport Summary</Text>
                        <Text as="p" variant="bodyMd" tone="subdued">This data is automatically generated from your Shopify Metaobjects and synced to the EU-compliant UCP registry.</Text>
                    </BlockStack>
                </Card>
                <Card>
                     <BlockStack gap="200">
                        <Text as="h3" variant="headingMd">Customer Trust Metrics</Text>
                        <Text as="p" variant="bodyMd">Transparency increases conversion by up to <Text as="span" fontWeight="bold" tone="success">18%</Text> for eco-conscious shoppers.</Text>
                    </BlockStack>
                </Card>
            </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function DPPItem({ icon, label, value }: { icon: string, label: string, value: string }) {
    return (
        <InlineStack gap="300" blockAlign="center">
            <div style={{ fontSize: "20px" }}>{icon}</div>
            <Text as="span" variant="bodyMd" fontWeight="bold">{label}:</Text>
            <Text as="span" variant="bodyMd">{value}</Text>
        </InlineStack>
    );
}
