import { registerFetcher, type FetchResult } from "./registry";

registerFetcher({
  serviceSlug: "openai",
  displayName: "OpenAI",
  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" },
    { key: "organizationId", label: "Organization ID" },
  ],
  async fetch(credentials, year, month): Promise<FetchResult> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const startTime = Math.floor(startDate.getTime() / 1000);
    const endTime = Math.floor(endDate.getTime() / 1000);

    const url = `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&bucket_width=1d`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.apiKey}`,
    };
    if (credentials.organizationId) {
      headers["OpenAI-Organization"] = credentials.organizationId;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${error}`);
    }

    const data = await res.json();
    let totalCost = 0;

    if (data.data) {
      for (const bucket of data.data) {
        if (bucket.results) {
          for (const result of bucket.results) {
            totalCost += result.amount?.value || 0;
          }
        }
      }
    }

    // OpenAI returns costs in cents, convert to dollars
    totalCost = totalCost / 100;

    return { amount: totalCost, currency: "USD", rawData: data };
  },
});
