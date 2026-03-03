import { registerFetcher, type FetchResult } from "./registry";

registerFetcher({
  serviceSlug: "langfuse",
  displayName: "Langfuse",
  credentialFields: [
    { key: "publicKey", label: "Public Key" },
    { key: "secretKey", label: "Secret Key", type: "password" },
    { key: "host", label: "Host (default: https://cloud.langfuse.com)" },
  ],
  async fetch(credentials, year, month): Promise<FetchResult> {
    const host = credentials.host || "https://cloud.langfuse.com";
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const url = `${host}/api/public/metrics/daily?traceName=&fromTimestamp=${startDate}T00:00:00Z&toTimestamp=${endDate}T00:00:00Z`;

    const token = Buffer.from(`${credentials.publicKey}:${credentials.secretKey}`).toString("base64");

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${token}`,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Langfuse API error: ${res.status} ${error}`);
    }

    const data = await res.json();
    let totalCost = 0;

    if (data.data) {
      for (const day of data.data) {
        totalCost += day.totalCost || 0;
      }
    }

    return { amount: totalCost, currency: "USD", rawData: data };
  },
});
