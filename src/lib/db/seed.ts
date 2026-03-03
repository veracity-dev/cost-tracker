import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { services, entities, serviceAccounts } from "./schema";
import { eq } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function seed() {
  // Run migrations
  await migrate(db, { migrationsFolder: "./drizzle" });

  // Default service types (catalog)
  const defaultServices = [
    { name: "OpenAI", slug: "openai", category: "ai", hasAutoFetch: true },
    { name: "Anthropic (Claude)", slug: "anthropic", category: "ai", hasAutoFetch: true },
    { name: "Cursor", slug: "cursor", category: "dev-tools", hasAutoFetch: false },
    { name: "AWS", slug: "aws", category: "cloud", hasAutoFetch: true },
    { name: "Google Cloud", slug: "google-cloud", category: "cloud", hasAutoFetch: true },
    { name: "Google Workspace", slug: "google-workspace", category: "productivity", hasAutoFetch: false },
    { name: "Slack", slug: "slack", category: "productivity", hasAutoFetch: false },
    { name: "Figma", slug: "figma", category: "dev-tools", hasAutoFetch: false },
    { name: "Tavily", slug: "tavily", category: "ai", hasAutoFetch: true },
    { name: "Exa", slug: "exa", category: "ai", hasAutoFetch: true },
    { name: "Langfuse", slug: "langfuse", category: "ai", hasAutoFetch: false },
    { name: "Auth0", slug: "auth0", category: "dev-tools", hasAutoFetch: false },
    { name: "LlamaCloud", slug: "llamacloud", category: "ai", hasAutoFetch: false },
    { name: "GitHub", slug: "github", category: "dev-tools", hasAutoFetch: false },
    { name: "Linear", slug: "linear", category: "dev-tools", hasAutoFetch: false },
    { name: "ClickUp", slug: "clickup", category: "productivity", hasAutoFetch: false },
  ];

  // Insert service types (ignore if already exist)
  for (const service of defaultServices) {
    await db.insert(services)
      .values(service)
      .onConflictDoNothing({ target: services.slug });
  }

  // Create "Default" entity if it doesn't exist
  await db.insert(entities)
    .values({ name: "Default", slug: "default", color: "#6366f1" })
    .onConflictDoNothing({ target: entities.slug });

  const defaultEntity = await db.select().from(entities).where(eq(entities.slug, "default")).then(rows => rows[0]);

  // Service account defaults: fetcherSlug + color per service slug
  const accountDefaults: Record<string, { fetcherSlug: string | null; color: string }> = {
    openai: { fetcherSlug: "openai", color: "#10a37f" },
    anthropic: { fetcherSlug: "anthropic", color: "#d97706" },
    cursor: { fetcherSlug: null, color: "#8b5cf6" },
    aws: { fetcherSlug: "aws", color: "#ff9900" },
    "google-cloud": { fetcherSlug: null, color: "#4285f4" },
    "google-workspace": { fetcherSlug: null, color: "#34a853" },
    slack: { fetcherSlug: null, color: "#e01e5a" },
    figma: { fetcherSlug: null, color: "#a259ff" },
    tavily: { fetcherSlug: "tavily", color: "#0ea5e9" },
    exa: { fetcherSlug: null, color: "#6366f1" },
    langfuse: { fetcherSlug: null, color: "#ef4444" },
    auth0: { fetcherSlug: null, color: "#eb5424" },
    llamacloud: { fetcherSlug: null, color: "#7c3aed" },
    github: { fetcherSlug: null, color: "#333333" },
    linear: { fetcherSlug: null, color: "#5e6ad2" },
    clickup: { fetcherSlug: null, color: "#7b68ee" },
  };

  // Create one service_account per service type, linked to Default entity
  const allServices = await db.select().from(services);
  for (const svc of allServices) {
    const existing = await db.select().from(serviceAccounts)
      .where(eq(serviceAccounts.serviceId, svc.id));

    if (existing.length === 0) {
      const defaults = accountDefaults[svc.slug] || { fetcherSlug: null, color: "#6366f1" };
      await db.insert(serviceAccounts).values({
        serviceId: svc.id,
        entityId: defaultEntity?.id || null,
        label: svc.name,
        fetcherSlug: defaults.fetcherSlug,
        color: defaults.color,
      });
    }
  }

  console.log("Seed complete: inserted service types, default entity, and service accounts");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
