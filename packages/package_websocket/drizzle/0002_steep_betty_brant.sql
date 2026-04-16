ALTER TABLE "shapes" DROP CONSTRAINT "shapes_sessionId_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_sessionId_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;