import { timingSafeEqual } from "node:crypto";
import { getInternalApiKey } from "@/lib/env";
import type { NextRequest } from "next/server";

export function authenticateApiKey(request: NextRequest): boolean {
  const key = getInternalApiKey();
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(key);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
