import en from "../locales/en.json";
import ja from "../locales/ja.json";

const translations: Record<string, any> = {
  en,
  ja
};

/**
 * リクエストのヘッダーや環境情報から判断し、
 * 各画面で利用する翻訳辞書オブジェクトを返します。
 */
export function getTranslations(request: Request) {
  const acceptLanguage = request.headers.get("Accept-Language");
  let lng = "en";
  if (acceptLanguage && acceptLanguage.includes("ja")) {
    lng = "ja";
  }
  return translations[lng] || translations["en"];
}
