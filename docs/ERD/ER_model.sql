CREATE TABLE "users" (
  "id" integer PRIMARY KEY,
  "username" varchar,
  "budget_limit" float,
  "preferences_vector" text
);

CREATE TABLE "restaurants" (
  "id" integer PRIMARY KEY,
  "name" varchar,
  "lat" float,
  "lng" float,
  "price_level" integer,
  "is_open" boolean
);

CREATE TABLE "reviews" (
  "id" integer PRIMARY KEY,
  "user_id" integer,
  "restaurant_id" integer,
  "rating" float,
  "review_text" text,
  "sentiment_score" float
);

CREATE TABLE "tags" (
  "id" integer PRIMARY KEY,
  "tag_name" varchar
);

CREATE TABLE "restaurant_tags" (
  "restaurant_id" integer,
  "tag_id" integer
);

COMMENT ON COLUMN "users"."preferences_vector" IS 'Store user embedding vector';

COMMENT ON COLUMN "reviews"."sentiment_score" IS 'AI generated sentiment score (-1.0 to 1.0)';

ALTER TABLE "reviews" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "reviews" ADD FOREIGN KEY ("restaurant_id") REFERENCES "restaurants" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant_tags" ADD FOREIGN KEY ("restaurant_id") REFERENCES "restaurants" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "restaurant_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") DEFERRABLE INITIALLY IMMEDIATE;
