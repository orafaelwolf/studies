CREATE TYPE "public"."flashcard_status" AS ENUM('draft', 'approved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."knowledge_kind" AS ENUM('correct_rule', 'trap', 'law_reference', 'board_pattern');--> statement-breakpoint
CREATE TYPE "public"."knowledge_status" AS ENUM('draft', 'verified');--> statement-breakpoint
CREATE TABLE "flashcard_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"flashcard_id" text NOT NULL,
	"rating" integer NOT NULL,
	"state" "card_state" NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"knowledge_item_id" text,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"deck" text NOT NULL,
	"topic" text,
	"status" "flashcard_status" DEFAULT 'draft' NOT NULL,
	"content_hash" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"stability" real DEFAULT 0 NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" "card_state" DEFAULT 'new' NOT NULL,
	"last_review" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flashcards_user_hash" UNIQUE("user_id","content_hash")
);
--> statement-breakpoint
CREATE TABLE "knowledge_evidence" (
	"knowledge_item_id" text NOT NULL,
	"question_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_evidence_knowledge_item_id_question_id_pk" PRIMARY KEY("knowledge_item_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "knowledge_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"document" jsonb,
	"subject" text,
	"official_reference" text,
	"status" "knowledge_status" DEFAULT 'draft' NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_items_user_hash" UNIQUE("user_id","content_hash")
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "exam_board" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "exam_name" text;--> statement-breakpoint
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_knowledge_item_id_knowledge_items_id_fk" FOREIGN KEY ("knowledge_item_id") REFERENCES "public"."knowledge_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_evidence" ADD CONSTRAINT "knowledge_evidence_knowledge_item_id_knowledge_items_id_fk" FOREIGN KEY ("knowledge_item_id") REFERENCES "public"."knowledge_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_evidence" ADD CONSTRAINT "knowledge_evidence_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_reviews_card_idx" ON "flashcard_reviews" USING btree ("flashcard_id");--> statement-breakpoint
CREATE INDEX "flashcards_user_due_idx" ON "flashcards" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "flashcards_knowledge_idx" ON "flashcards" USING btree ("knowledge_item_id");--> statement-breakpoint
CREATE INDEX "knowledge_items_user_kind_idx" ON "knowledge_items" USING btree ("user_id","kind");