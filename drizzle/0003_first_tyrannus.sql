CREATE TABLE "finance_document_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_document_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"line_no" integer NOT NULL,
	"description" text NOT NULL,
	"qty" double precision DEFAULT 1 NOT NULL,
	"unit_price" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_no" text NOT NULL,
	"type" text NOT NULL,
	"vendor_name" text NOT NULL,
	"vendor_address" text,
	"vendor_tax_id" text,
	"vendor_branch" text,
	"doc_date" text NOT NULL,
	"credit_days" integer DEFAULT 0 NOT NULL,
	"due_date" text NOT NULL,
	"reference_no" text,
	"price_includes_vat" boolean DEFAULT false NOT NULL,
	"description" text,
	"notes" text,
	"internal_notes" text,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"discount_pct" double precision DEFAULT 0 NOT NULL,
	"discount_amount" double precision DEFAULT 0 NOT NULL,
	"after_discount" double precision DEFAULT 0 NOT NULL,
	"vat_enabled" boolean DEFAULT false NOT NULL,
	"vat_amount" double precision DEFAULT 0 NOT NULL,
	"withholding_enabled" boolean DEFAULT false NOT NULL,
	"withholding_pct" double precision DEFAULT 3 NOT NULL,
	"withholding_amount" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"recorded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_documents_doc_no_unique" UNIQUE("doc_no")
);
--> statement-breakpoint
ALTER TABLE "finance_document_files" ADD CONSTRAINT "finance_document_files_document_id_finance_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."finance_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_document_files" ADD CONSTRAINT "finance_document_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_document_lines" ADD CONSTRAINT "finance_document_lines_document_id_finance_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."finance_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;