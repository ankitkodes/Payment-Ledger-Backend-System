CREATE TABLE "idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"request_hash" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'Pending',
	"response_status" integer DEFAULT 200,
	"response_body" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expiry_at" timestamp NOT NULL,
	CONSTRAINT "idempotency_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "idempotency" ADD CONSTRAINT "idempotency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_key" ON "idempotency" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "user_id" ON "idempotency" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "request_hash" ON "idempotency" USING btree ("request_hash");