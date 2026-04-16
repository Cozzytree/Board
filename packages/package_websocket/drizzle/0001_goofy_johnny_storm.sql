CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pageId" uuid NOT NULL,
	"ownerId" text NOT NULL,
	"sessionKey" text NOT NULL,
	"isActive" boolean DEFAULT true,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"expiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_sessionKey_unique" UNIQUE("sessionKey")
);
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "isLocked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "isDeleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "sessionId" uuid;--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "createdBy" text;--> statement-breakpoint
ALTER TABLE "shapes" ADD COLUMN "updatedBy" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_pageId_pages_id_fk" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;