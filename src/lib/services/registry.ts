export interface FetchResult {
  amount: number;
  currency: string;
  rawData?: unknown;
}

export interface CostFetcher {
  serviceSlug: string;
  displayName: string;
  credentialFields: { key: string; label: string; type?: "text" | "password" | "textarea" }[];
  fetch(credentials: Record<string, string>, year: number, month: number): Promise<FetchResult>;
}

const fetchers = new Map<string, CostFetcher>();

export function registerFetcher(fetcher: CostFetcher) {
  fetchers.set(fetcher.serviceSlug, fetcher);
}

export function getFetcher(slug: string): CostFetcher | undefined {
  return fetchers.get(slug);
}

export function getAllFetchers(): CostFetcher[] {
  return Array.from(fetchers.values());
}
