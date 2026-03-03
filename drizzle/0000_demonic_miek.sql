CREATE TABLE "api_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"credentials" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "api_credentials_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "cost_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'USD',
	"source" text DEFAULT 'manual',
	"payment_status" text DEFAULT 'pending',
	"card_id" integer,
	"notes" text,
	"fetched_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#6366f1',
	"created_at" timestamp,
	CONSTRAINT "entities_name_unique" UNIQUE("name"),
	CONSTRAINT "entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payment_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"last4" text,
	"brand" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "service_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"entity_id" integer,
	"label" text NOT NULL,
	"fetcher_slug" text,
	"color" text DEFAULT '#6366f1',
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'other',
	"has_auto_fetch" boolean DEFAULT false,
	"created_at" timestamp,
	CONSTRAINT "services_name_unique" UNIQUE("name"),
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_account_id_service_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."service_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_account_id_service_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."service_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_card_id_payment_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."payment_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_accounts" ADD CONSTRAINT "service_accounts_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_accounts" ADD CONSTRAINT "service_accounts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cost_account_month_unique" ON "cost_records" USING btree ("account_id","year","month");