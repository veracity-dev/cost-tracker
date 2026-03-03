import { registerFetcher, type FetchResult } from "./registry";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

registerFetcher({
  serviceSlug: "aws",
  displayName: "AWS",
  credentialFields: [
    { key: "accessKeyId", label: "Access Key ID" },
    { key: "secretAccessKey", label: "Secret Access Key", type: "password" },
    { key: "region", label: "Region (default: us-east-1)" },
  ],
  async fetch(credentials, year, month): Promise<FetchResult> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const client = new CostExplorerClient({
      region: credentials.region || "us-east-1",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
    });

    const response = await client.send(command);
    const amount = parseFloat(
      response.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || "0"
    );

    return { amount, currency: "USD", rawData: response };
  },
});
