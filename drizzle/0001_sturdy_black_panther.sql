CREATE TABLE "material_withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"qty" double precision NOT NULL,
	"dept" text NOT NULL,
	"withdrawn_by" integer NOT NULL,
	"order_id" integer,
	"note" text,
	"withdrawn_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_withdrawals" ADD CONSTRAINT "material_withdrawals_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_withdrawals" ADD CONSTRAINT "material_withdrawals_withdrawn_by_users_id_fk" FOREIGN KEY ("withdrawn_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_withdrawals" ADD CONSTRAINT "material_withdrawals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;