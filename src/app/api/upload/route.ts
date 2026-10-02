// POST /api/upload — proxied to Express backend (multipart upload).

import { NextRequest } from "next/server";
import { proxyToBackend } from "@/app/api/_proxy";

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/upload", { method: "POST" });
}