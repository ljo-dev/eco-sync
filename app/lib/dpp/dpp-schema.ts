/**
 * Digital Product Passport (DPP) スキーマ定義
 * EU ESPR (Ecodesign for Sustainable Products Regulation) 準拠
 */

export const DPP_METAOBJECT_TYPE = "ecosync_dpp";

export interface DppLifecycleData {
  // 原材料・素材
  materials: string[];           // 例: ["オーガニックコットン 80%", "リサイクルポリエステル 20%"]
  materialOrigin: string;        // 例: "インド、バングラデシュ"

  // 環境負荷
  co2EmissionKg: number;         // 製品1個あたりのCO₂排出量（kg）
  co2CalculationMethod: string;  // 例: "ISO 14067:2018"
  waterUsageLiter: number;       // 水使用量（リットル）

  // リサイクル・廃棄
  recyclability: "high" | "medium" | "low" | "not_recyclable";
  recycledContentPercent: number; // リサイクル素材の割合（0-100）
  endOfLifeInstructions: string; // 廃棄方法

  // 製造・サプライチェーン
  manufacturingCountry: string;
  manufacturerName: string;
  supplierAuditStatus: "audited" | "pending" | "not_audited";

  // 認証
  certifications: string[]; // 例: ["GOTS", "OEKO-TEX", "Fair Trade"]

  // 修理・耐久性
  repairabilityScore: number;   // 1-10
  warrantyYears: number;
  sparePartsAvailable: boolean;

  // デジタル識別
  productPassportId: string;    // DPP固有ID
  issuedAt: string;             // ISO 8601
  validUntil: string;           // ISO 8601
}

/** Metaobjectに保存するフィールドのキーマッピング */
export const DPP_FIELD_MAP: Record<keyof DppLifecycleData, { type: string }> = {
  materials:                { type: "list.single_line_text_field" },
  materialOrigin:           { type: "single_line_text_field" },
  co2EmissionKg:            { type: "number_decimal" },
  co2CalculationMethod:     { type: "single_line_text_field" },
  waterUsageLiter:          { type: "number_decimal" },
  recyclability:            { type: "single_line_text_field" },
  recycledContentPercent:   { type: "number_integer" },
  endOfLifeInstructions:    { type: "multi_line_text_field" },
  manufacturingCountry:     { type: "single_line_text_field" },
  manufacturerName:         { type: "single_line_text_field" },
  supplierAuditStatus:      { type: "single_line_text_field" },
  certifications:           { type: "list.single_line_text_field" },
  repairabilityScore:       { type: "number_integer" },
  warrantyYears:            { type: "number_integer" },
  spareParts:               { type: "boolean" },
  sparePartsAvailable:      { type: "boolean" },
  productPassportId:        { type: "single_line_text_field" },
  issuedAt:                 { type: "date_time" },
  validUntil:               { type: "date_time" },
};

/** DPP補完率スコアを計算（0.0〜1.0） */
export function calcCoverageScore(data: Partial<DppLifecycleData>): {
  score: number;
  missingFields: string[];
} {
  const requiredFields: (keyof DppLifecycleData)[] = [
    "materials",
    "co2EmissionKg",
    "recyclability",
    "manufacturingCountry",
    "certifications",
    "productPassportId",
  ];

  const missingFields = requiredFields.filter((f) => {
    const v = data[f];
    if (v === undefined || v === null) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });

  return {
    score: (requiredFields.length - missingFields.length) / requiredFields.length,
    missingFields: missingFields as string[],
  };
}
