import { registerFetcher, type FetchResult } from "./registry";

registerFetcher({
  serviceSlug: "tavily",
  displayName: "Tavily",
  credentialFields: [
    { key: "apiKey", label: "API Key", type: "password" },
  ],
  async fetch(credentials): Promise<FetchResult> {
    const res = await fetch("https://api.tavily.com/usage", {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Tavily API error: ${res.status} ${error}`);
    }

    const data = await res.json();
    // Tavily returns credit usage; estimate cost at $0.008 per credit
    const credits = data.total_credits_used || data.credits_used || 0;
    const amount = credits * 0.008;

    return { amount, currency: "USD", rawData: data };
  },
});
