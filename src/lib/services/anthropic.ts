import { registerFetcher, type FetchResult } from "./registry";

registerFetcher({
  serviceSlug: "anthropic",
  displayName: "Anthropic (Claude)",
  credentialFields: [
    { key: "adminApiKey", label: "Admin API Key", type: "password" },
  ],
  async fetch(credentials, year, month): Promise<FetchResult> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const url = `https://api.anthropic.com/v1/organizations/usage?start_date=${startDate}&end_date=${endDate}&bucket_width=1d`;

    const res = await fetch(url, {
      headers: {
        "x-api-key": credentials.adminApiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${error}`);
    }

    const data = await res.json();
    let totalCost = 0;

    if (data.data) {
      for (const bucket of data.data) {
        totalCost += bucket.cost_usd || 0;
      }
    }

    return { amount: totalCost, currency: "USD", rawData: data };
  },
});
