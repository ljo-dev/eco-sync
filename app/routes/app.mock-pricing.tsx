import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export default function MockPricingPage() {
  const data = [
    { sales: "Start", other: 15, eco: 0 },
    { sales: "Level 1", other: 39, eco: 19 },
    { sales: "Level 2", other: 79, eco: 19 },
    { sales: "Level 3", other: 149, eco: 19 },
    { sales: "Scale", other: 299, eco: 19 },
  ];

  return (
    <Page title="Pricing Assets (Mock Graph)">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="800" align="center">
                <Text as="h2" variant="headingXl" alignment="center">Your success shouldn't be penalized.</Text>
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                    Stop paying usage-based fees. Get unlimited optimization for a flat monthly rate.
                </Text>
                
                <Box padding="800" background="bg-surface-secondary" borderRadius="200" width="100%" maxWidth="800px">
                    <InlineStack align="space-around" blockAlign="end">
                        {data.map((col, i) => (
                            <BlockStack key={i} gap="200" align="end">
                                <InlineStack gap="100" blockAlign="end">
                                    {/* Other App Bar */}
                                    <div style={{ width: "40px", height: `${col.other}px`, backgroundColor: "#ff4e42", opacity: 0.8, borderRadius: "4px 4px 0 0" }} />
                                    {/* EcoSync Bar */}
                                    <div style={{ width: "40px", height: `${col.eco}px`, backgroundColor: "#0cce6b", borderRadius: "4px 4px 0 0" }} />
                                </InlineStack>
                                <Text as="p" alignment="center" fontWeight="bold">{col.sales}</Text>
                            </BlockStack>
                        ))}
                    </InlineStack>
                    
                    <Box paddingBlockStart="800">
                        <InlineStack gap="400" align="center">
                            <InlineStack gap="100" blockAlign="center">
                                <div style={{ width: "16px", height: "16px", backgroundColor: "#ff4e42", borderRadius: "4px" }} />
                                <Text as="span">Other Apps (Usage-based)</Text>
                            </InlineStack>
                            <InlineStack gap="100" blockAlign="center">
                                <div style={{ width: "16px", height: "16px", backgroundColor: "#0cce6b", borderRadius: "4px" }} />
                                <Text as="span" fontWeight="bold">EcoSync (Flat $19/mo)</Text>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                </Box>
                
                <div style={{ marginTop: "20px", padding: "16px 48px", backgroundColor: "#000", color: "#fff", fontSize: "20px", fontWeight: "bold", borderRadius: "8px", cursor: "pointer" }}>
                    Start 14-Day Free Trial
                </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
