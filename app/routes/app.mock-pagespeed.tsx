import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

// A simple circular gauge built with CSS
function Gauge({ score, color, label }: { score: number, color: string, label: string }) {
    const strokeDasharray = `${(score / 100) * 283} 283`;
    return (
        <BlockStack gap="400" align="center">
            <div style={{ position: "relative", width: "200px", height: "200px" }}>
                <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" 
                            strokeDasharray={strokeDasharray} style={{ transition: "stroke-dasharray 1s ease" }} />
                </svg>
                <div style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <span style={{ fontSize: "48px", fontWeight: "bold", color: color }}>{score}</span>
                </div>
            </div>
            <Text as="h3" variant="headingLg" alignment="center">{label}</Text>
        </BlockStack>
    );
}

export default function MockPagespeedPage() {
  return (
    <Page title="PageSpeed Assets (Mock Metrics)">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="800" align="center">
                <Text as="h2" variant="headingXl" alignment="center">Mobile Performance Score</Text>
                
                <InlineStack gap="1000" blockAlign="center" align="center">
                    <Box padding="600" background="bg-surface-secondary" borderRadius="300">
                        <Gauge score={42} color="#ff4e42" label="Before EcoSync" />
                        <div style={{ marginTop: "20px", textAlign: "center" }}>
                            <Text as="p" tone="critical" fontWeight="bold">⚠️ Blocked by 14 Ghost Scripts</Text>
                        </div>
                    </Box>

                    <div style={{ fontSize: "40px", color: "#ccc" }}>➡️</div>

                    <Box padding="600" background="bg-surface-secondary" borderRadius="300" borderColor="border-success" borderWidth="050">
                        <Gauge score={99} color="#0cce6b" label="After EcoSync" />
                        <div style={{ marginTop: "20px", textAlign: "center" }}>
                            <Text as="p" tone="success" fontWeight="bold">✨ 0 Render-Blocking Resources</Text>
                        </div>
                    </Box>
                </InlineStack>

                <div style={{ marginTop: "20px", padding: "16px 32px", backgroundColor: "#000", color: "#fff", fontSize: "20px", fontWeight: "bold", borderRadius: "8px", cursor: "pointer" }}>
                    ✨ Clean My Store Now
                </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
