import { NextResponse } from "next/server";
import { getAllFetchers } from "@/lib/services";

export async function GET() {
  const fetchers = getAllFetchers().map((f) => ({
    serviceSlug: f.serviceSlug,
    displayName: f.displayName,
    credentialFields: f.credentialFields,
  }));

  return NextResponse.json(fetchers);
}
