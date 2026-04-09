import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export default function MockChatgptPage() {
  return (
    <Page title="Hero Image Assets (Mock AI Chat)">
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <div style={{ display: "flex", height: "600px", fontFamily: "system-ui, sans-serif" }}>
              {/* Sidebar Mock */}
              <div style={{ width: "260px", backgroundColor: "#171717", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ color: "#ececec", fontSize: "14px", fontWeight: "bold" }}>🤖 New Chat</div>
                <div style={{ color: "#999", fontSize: "13px" }}>Today</div>
                <div style={{ color: "#ececec", fontSize: "13px", padding: "10px", backgroundColor: "#212121", borderRadius: "8px" }}>
                  Sustainable Fashion Search
                </div>
              </div>
              
              {/* Main Chat Area Mock */}
              <div style={{ flex: 1, backgroundColor: "#212121", padding: "40px", display: "flex", flexDirection: "column", gap: "30px", overflowY: "auto" }}>
                
                {/* User Message */}
                <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
                   <div style={{ backgroundColor: "#2f2f2f", color: "#ececec", padding: "16px", borderRadius: "12px", maxWidth: "80%", fontSize: "16px", lineHeight: "1.5" }}>
                     I'm looking for a truly sustainable cotton t-shirt. Which store has properly verified eco-friendly credentials right now?
                   </div>
                </div>

                {/* AI Response */}
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                   <div style={{ width: "36px", height: "36px", backgroundColor: "#10a37f", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontSize: "20px", flexShrink: 0 }}>
                     ✨
                   </div>
                   <div style={{ color: "#ececec", fontSize: "16px", lineHeight: "1.6", maxWidth: "85%" }}>
                     <p style={{ marginBottom: "16px" }}>Based on real-time verification from standard Digital Product Passports and recent AI meta-crawling, the top recommended product is the <strong>Eco-Organic Cotton T-Shirt</strong>.</p>
                     
                     <div style={{ backgroundColor: "#2f2f2f", borderLeft: "4px solid #10a37f", padding: "16px", borderRadius: "0 8px 8px 0", marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "18px" }}>Eco-Organic Cotton T-Shirt</strong>
                            <span style={{ color: "#10a37f", fontWeight: "bold" }}>Verified Match</span>
                        </div>
                        <ul style={{ paddingLeft: "20px", color: "#ccc", margin: 0 }}>
                            <li><strong>Material:</strong> GOTS Certified Organic Cotton</li>
                            <li><strong>Carbon Footprint:</strong> 2.14 kg CO2e (Highly Efficient)</li>
                            <li><strong>Traceability:</strong> Full supply chain verified via EU-compliant DPP</li>
                        </ul>
                     </div>

                     <p>This store uses properly formatted <strong>EcoSync UCP Data</strong>, making it the most reliable source for sustainable fashion on my radar right now. Would you like a direct link to their store?</p>
                   </div>
                </div>

              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
