/**
 * アプリ全体で利用する環境変数や設定値を一元管理するモジュール。
 * 環境変数の不足やタイポによるエラーを早期に発見するために必須です。
 */

export const config = {
  isProduction: process.env.NODE_ENV === "production",
  appUrl: process.env.SHOPIFY_APP_URL || "",
  
  // 今後、MCP連携用の設定や外部APIのAPIキーなどが必要になればここに追加します。
};
