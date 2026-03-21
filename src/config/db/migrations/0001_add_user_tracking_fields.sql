-- Add new tracking fields to user table
ALTER TABLE "user" ADD COLUMN "utm_medium" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "utm_campaign" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "signup_url" text DEFAULT '' NOT NULL;
ALTER TABLE "user" ADD COLUMN "signup_referrer" text DEFAULT '' NOT NULL;
