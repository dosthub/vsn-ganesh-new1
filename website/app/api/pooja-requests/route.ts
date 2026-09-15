import worker from "@/lib/community-worker.js";

export const dynamic = "force-dynamic";

// Local Next.js development uses the same handler as the deployed Worker.
export async function POST(request: Request) {
  const url = new URL(request.url);
  // Next's dev server can use its internal address in request.url.
  // Check Origin against the address the browser actually requested.
  const host = request.headers.get("host");
  if (host) url.host = host;
  return worker.fetch(new Request(url, request), {
    POOJA_SHEET_WEBHOOK_URL: process.env.POOJA_SHEET_WEBHOOK_URL,
    POOJA_WEBHOOK_SECRET: process.env.POOJA_WEBHOOK_SECRET,
  });
}
