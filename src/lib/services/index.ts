export { registerFetcher, getFetcher, getAllFetchers } from "./registry";
export type { FetchResult, CostFetcher } from "./registry";

// Register all fetchers by importing their side effects
import "./openai";
import "./anthropic";
import "./aws";
import "./tavily";
import "./langfuse";
