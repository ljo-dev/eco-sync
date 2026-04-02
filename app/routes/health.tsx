import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

/**
 * レンタリングインフラやオーケストレータ（AWS, GCP, Kubernetes等）が
 * アプリの死活監視を行うためのヘルスチェックエンドポイントです。
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
};
