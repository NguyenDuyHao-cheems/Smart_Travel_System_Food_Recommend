-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.dishes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  res_id uuid,
  name character varying NOT NULL,
  price integer NOT NULL,
  image_url text,
  ingredients jsonb DEFAULT '[]'::jsonb,
  allergens jsonb DEFAULT '[]'::jsonb,
  is_vegetarian boolean DEFAULT false,
  embedding_vector USER-DEFINED,
  CONSTRAINT dishes_pkey PRIMARY KEY (id),
  CONSTRAINT dishes_res_id_fkey FOREIGN KEY (res_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.res_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  res_id uuid,
  tag_id uuid,
  CONSTRAINT res_tags_pkey PRIMARY KEY (id),
  CONSTRAINT res_tags_res_id_fkey FOREIGN KEY (res_id) REFERENCES public.restaurants(id),
  CONSTRAINT res_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id),
  CONSTRAINT fk_res_tags_res FOREIGN KEY (res_id) REFERENCES public.restaurants(id),
  CONSTRAINT fk_res_tags_tag FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  address text NOT NULL,
  lat double precision,
  lng double precision,
  price_range character varying,
  opening_hours character varying,
  image_url text,
  rating_avg double precision DEFAULT 0.0,
  sentiment_score double precision DEFAULT 0.0,
  top_review_text text,
  is_active boolean DEFAULT true,
  embedding_vector USER-DEFINED,
  total_reviews integer,
  open_time time without time zone,
  close_time time without time zone,
  timezone text DEFAULT 'Asia/Ho_Chi_Minh'::text,
  is_open_now boolean,
  google_maps_url text,
  CONSTRAINT restaurants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  res_id uuid,
  reviewer_name character varying,
  rating numeric CHECK (rating IS NULL OR rating >= 0::numeric AND rating <= 10::numeric),
  text text,
  date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_res_id_fkey FOREIGN KEY (res_id) REFERENCES public.restaurants(id),
  CONSTRAINT fk_reviews_restaurant FOREIGN KEY (res_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anonymous_id text,
  user_id uuid,
  res_id uuid,
  dish_id uuid,
  action_type character varying NOT NULL,
  duration_sec integer,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT user_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT user_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_interactions_res_id_fkey FOREIGN KEY (res_id) REFERENCES public.restaurants(id),
  CONSTRAINT user_interactions_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(id)
);
CREATE TABLE public.user_onboardings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anonymous_id text UNIQUE,
  user_id uuid UNIQUE,
  favorite_dishes jsonb,
  spicy_level character varying,
  dietary_restrictions jsonb,
  allergies jsonb,
  budget character varying,
  location character varying,
  age integer,
  preferences_vector USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT user_onboardings_pkey PRIMARY KEY (id),
  CONSTRAINT user_onboardings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL UNIQUE,
  password_hash character varying,
  preferences_vector USER-DEFINED,
  allergies jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);