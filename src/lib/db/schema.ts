import { pgTable, text, serial, integer, real, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Service type catalog (read-only after seed)
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  category: text("category").default("other"),
  hasAutoFetch: boolean("has_auto_fetch").default(false),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

// Entities (Projects/Products) that group multiple service accounts
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

// Service accounts - each represents one billable account for a service type
export const serviceAccounts = pgTable("service_accounts", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  entityId: integer("entity_id")
    .references(() => entities.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  fetcherSlug: text("fetcher_slug"),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

export const paymentCards = pgTable("payment_cards", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  last4: text("last4"),
  brand: text("brand"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

export const costRecords = pgTable(
  "cost_records",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").default("USD"),
    source: text("source").default("manual"),
    paymentStatus: text("payment_status").default("pending"),
    cardId: integer("card_id").references(() => paymentCards.id, { onDelete: "set null" }),
    notes: text("notes"),
    fetchedAt: timestamp("fetched_at"),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("cost_account_month_unique").on(table.accountId, table.year, table.month),
  ]
);

export const apiCredentials = pgTable("api_credentials", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => serviceAccounts.id, { onDelete: "cascade" })
    .unique(),
  credentials: text("credentials").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});
