import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  TextField,
  Select,
  RangeSlider,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  ProgressBar,
  Checkbox,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { upsertDpp, getDpp } from "../lib/dpp/metaobject-client.server";
import { shopifyGraphQL } from "../lib/shopify/api-client.server";
import { useState } from "react";
import { nanoid } from "nanoid";

// ---- GraphQL ----

const GET_PRODUCT = `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      featuredImage { url altText }
    }
  }
`;

// ---- Loader ----

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const productGid = `gid://shopify/Product/${params.productId}`;

  const productData = await shopifyGraphQL<{
    product: { id: string; title: string; handle: string; featuredImage: { url: string } | null } | null;
  }>(admin.graphql, GET_PRODUCT, { id: productGid });

  const dppFields = await getDpp(admin.graphql, productGid);

  const dppMap: Record<string, string> = {};
  dppFields?.forEach(({ key, value }) => {
    dppMap[key] = value;
  });

  return json({
    product: productData.product,
    dpp: dppMap,
  });
}

// ---- Action ----

export async function action({ request, params }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productGid = `gid://shopify/Product/${params.productId}`;

  const materialsRaw = formData.get("materials") as string;
  const certsRaw = formData.get("certifications") as string;

  try {
    const result = await upsertDpp(admin.graphql, session.shop, productGid, {
      materials: materialsRaw ? materialsRaw.split("\n").filter(Boolean) : [],
      materialOrigin: formData.get("materialOrigin") as string,
      co2EmissionKg: parseFloat(formData.get("co2EmissionKg") as string) || 0,
      co2CalculationMethod: formData.get("co2CalculationMethod") as string,
      waterUsageLiter: parseFloat(formData.get("waterUsageLiter") as string) || 0,
      recyclability: formData.get("recyclability") as "high" | "medium" | "low",
      recycledContentPercent: parseInt(formData.get("recycledContentPercent") as string) || 0,
      endOfLifeInstructions: formData.get("endOfLifeInstructions") as string,
      manufacturingCountry: formData.get("manufacturingCountry") as string,
      manufacturerName: formData.get("manufacturerName") as string,
      supplierAuditStatus: formData.get("supplierAuditStatus") as "audited" | "pending",
      certifications: certsRaw ? certsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
      repairabilityScore: parseInt(formData.get("repairabilityScore") as string) || 0,
      warrantyYears: parseInt(formData.get("warrantyYears") as string) || 0,
      sparePartsAvailable: formData.get("sparePartsAvailable") === "true",
      productPassportId: (formData.get("productPassportId") as string) || nanoid(),
      issuedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return json({ success: true, coverageScore: result.coverageScore });
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
}

// ---- Component ----

export default function DppEditorPage() {
  const { product, dpp } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const [recycledPct, setRecycledPct] = useState(
    parseInt(dpp.recycled_content_percent ?? "0")
  );
  const [repairScore, setRepairScore] = useState(
    parseInt(dpp.repairability_score ?? "5")
  );
  const [sparePartsAvailable, setSparePartsAvailable] = useState(
    dpp.spare_parts_available === "true"
  );

  const coverageScore =
    "coverageScore" in (actionData ?? {})
      ? (actionData as { coverageScore: number }).coverageScore
      : null;

  return (
    <Page
      title={`DPP: ${product?.title ?? "商品"}`}
      subtitle="Digital Product Passport — EU ESPR準拠"
      backAction={{ url: "/app" }}
    >
      <Layout>
        {"error" in (actionData ?? {}) && (
          <Layout.Section>
            <Banner tone="critical">
              {(actionData as { error: string }).error}
            </Banner>
          </Layout.Section>
        )}

        {coverageScore !== null && (
          <Layout.Section>
            <Banner tone={coverageScore >= 1 ? "success" : "warning"}>
              <BlockStack gap="200">
                <Text as="p">
                  DPP補完率: <strong>{Math.round(coverageScore * 100)}%</strong>
                </Text>
                <ProgressBar progress={coverageScore * 100} size="small" />
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        <Form method="post">
          <input type="hidden" name="productPassportId" defaultValue={dpp.product_passport_id} />
          <input type="hidden" name="recycledContentPercent" value={recycledPct} readOnly />
          <input type="hidden" name="repairabilityScore" value={repairScore} readOnly />
          <input type="hidden" name="sparePartsAvailable" value={String(sparePartsAvailable)} readOnly />

          <Layout.Section>
            {/* 素材・原材料 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">素材・原材料</Text>
                <TextField
                  label="使用素材（1行1素材）"
                  name="materials"
                  multiline={4}
                  defaultValue={(dpp.materials ? JSON.parse(dpp.materials) : []).join("\n")}
                  autoComplete="off"
                  helpText="例: オーガニックコットン 80%"
                />
                <TextField
                  label="原材料産地"
                  name="materialOrigin"
                  defaultValue={dpp.material_origin ?? ""}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {/* 環境負荷 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">環境負荷データ</Text>
                <InlineStack gap="400">
                  <TextField
                    label="CO₂排出量（kg/製品）"
                    name="co2EmissionKg"
                    type="number"
                    defaultValue={dpp.co2_emission_kg ?? "0"}
                    autoComplete="off"
                  />
                  <TextField
                    label="水使用量（リットル/製品）"
                    name="waterUsageLiter"
                    type="number"
                    defaultValue={dpp.water_usage_liter ?? "0"}
                    autoComplete="off"
                  />
                </InlineStack>
                <TextField
                  label="CO₂算定手法"
                  name="co2CalculationMethod"
                  defaultValue={dpp.co2_calculation_method ?? "ISO 14067:2018"}
                  autoComplete="off"
                />
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd">リサイクル素材含有率: {recycledPct}%</Text>
                  <RangeSlider
                    label=""
                    min={0}
                    max={100}
                    value={recycledPct}
                    onChange={(v) => setRecycledPct(v as number)}
                  />
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {/* リサイクル・廃棄 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">リサイクル・廃棄</Text>
                <Select
                  label="リサイクル可能性"
                  name="recyclability"
                  options={[
                    { label: "高（ほぼ全素材がリサイクル可）", value: "high" },
                    { label: "中（一部リサイクル可）", value: "medium" },
                    { label: "低（リサイクルが困難）", value: "low" },
                    { label: "不可", value: "not_recyclable" },
                  ]}
                  value={dpp.recyclability ?? "medium"}
                  onChange={() => {}}
                />
                <TextField
                  label="廃棄・リサイクル方法"
                  name="endOfLifeInstructions"
                  multiline={3}
                  defaultValue={dpp.end_of_life_instructions ?? ""}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {/* 製造・サプライチェーン */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">製造・サプライチェーン</Text>
                <InlineStack gap="400">
                  <TextField
                    label="製造国"
                    name="manufacturingCountry"
                    defaultValue={dpp.manufacturing_country ?? ""}
                    autoComplete="off"
                  />
                  <TextField
                    label="製造会社名"
                    name="manufacturerName"
                    defaultValue={dpp.manufacturer_name ?? ""}
                    autoComplete="off"
                  />
                </InlineStack>
                <Select
                  label="サプライヤー監査ステータス"
                  name="supplierAuditStatus"
                  options={[
                    { label: "監査済み", value: "audited" },
                    { label: "審査中", value: "pending" },
                    { label: "未監査", value: "not_audited" },
                  ]}
                  value={dpp.supplier_audit_status ?? "pending"}
                  onChange={() => {}}
                />
                <TextField
                  label="取得認証（カンマ区切り）"
                  name="certifications"
                  defaultValue={
                    dpp.certifications ? JSON.parse(dpp.certifications).join(", ") : ""
                  }
                  helpText="例: GOTS, OEKO-TEX, Fair Trade"
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {/* 修理・耐久性 */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">修理・耐久性</Text>
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd">修理容易性スコア: {repairScore}/10</Text>
                  <RangeSlider
                    label=""
                    min={1}
                    max={10}
                    value={repairScore}
                    onChange={(v) => setRepairScore(v as number)}
                  />
                </BlockStack>
                <TextField
                  label="保証期間（年）"
                  name="warrantyYears"
                  type="number"
                  defaultValue={dpp.warranty_years ?? "2"}
                  autoComplete="off"
                />
                <Checkbox
                  label="交換部品あり"
                  checked={sparePartsAvailable}
                  onChange={setSparePartsAvailable}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Button submit variant="primary" loading={isSaving}>
              DPPを保存
            </Button>
          </Layout.Section>
        </Form>
      </Layout>
    </Page>
  );
}
