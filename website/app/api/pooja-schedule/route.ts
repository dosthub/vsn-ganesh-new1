import worker from "@/lib/community-worker.js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return worker.fetch(request, {});
}
