ALTER TABLE "shapes" DROP CONSTRAINT "shapes_page_id_pages_id_fk";
--> statement-breakpoint
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;