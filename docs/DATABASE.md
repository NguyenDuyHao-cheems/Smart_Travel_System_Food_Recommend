## Table `dishes`

### Columns

| Name               | Type      | Constraints |
| ------------------ | --------- | ----------- |
| `id`               | `uuid`    | Primary     |
| `res_id`           | `uuid`    | Nullable    |
| `name`             | `varchar` |             |
| `price`            | `int4`    |             |
| `image_url`        | `text`    | Nullable    |
| `allergens`        | `jsonb`   | Nullable    |
| `is_vegetarian`    | `bool`    | Nullable    |
| `embedding_vector` | `halfvec` | Nullable    |

## Table `res_tags`

### Columns

| Name     | Type   | Constraints |
| -------- | ------ | ----------- |
| `id`     | `uuid` | Primary     |
| `res_id` | `uuid` | Nullable    |
| `tag_id` | `uuid` | Nullable    |

## Table `restaurants`

### Columns

| Name                    | Type          | Constraints |
| ----------------------- | ------------- | ----------- |
| `id`                    | `uuid`        | Primary     |
| `name`                  | `varchar`     |             |
| `address`               | `text`        |             |
| `lat`                   | `float8`      | Nullable    |
| `lng`                   | `float8`      | Nullable    |
| `price_range`           | `varchar`     | Nullable    |
| `opening_hours`         | `varchar`     | Nullable    |
| `image_url`             | `text`        | Nullable    |
| `rating_avg`            | `float8`      | Nullable    |
| `sentiment_score`       | `float8`      | Nullable    |
| `is_active`             | `bool`        | Nullable    |
| `embedding_vector`      | `vector`      | Nullable    |
| `total_reviews`         | `int4`        | Nullable    |
| `open_time`             | `time`        | Nullable    |
| `close_time`            | `time`        | Nullable    |
| `timezone`              | `text`        | Nullable    |
| `is_open_now`           | `bool`        | Nullable    |
| `google_maps_url`       | `text`        | Nullable    |
| `top_reviews`           | `jsonb`       | Nullable    |
| `is_vegetarian`         | `bool`        | Nullable    |
| `positive_review_count` | `int4`        | Nullable    |
| `neutral_review_count`  | `int4`        | Nullable    |
| `negative_review_count` | `int4`        | Nullable    |
| `sentiment_updated_at`  | `timestamptz` | Nullable    |
| `price_min`             | `int4`        | Nullable    |
| `price_max`             | `int4`        | Nullable    |

## Table `reviews`

### Columns

| Name                    | Type          | Constraints |
| ----------------------- | ------------- | ----------- |
| `id`                    | `uuid`        | Primary     |
| `res_id`                | `uuid`        | Nullable    |
| `reviewer_name`         | `varchar`     | Nullable    |
| `rating`                | `numeric`     | Nullable    |
| `text`                  | `text`        | Nullable    |
| `date`                  | `timestamptz` | Nullable    |
| `sentiment_label`       | `varchar`     | Nullable    |
| `sentiment_score`       | `float8`      | Nullable    |
| `sentiment_confidence`  | `float8`      | Nullable    |
| `sentiment_model`       | `varchar`     | Nullable    |
| `sentiment_analyzed_at` | `timestamptz` | Nullable    |
| `user_id`               | `uuid`        | Nullable    |
| `is_anonymous`          | `bool`        | Nullable    |
| `anonymous_number`      | `int4`        | Nullable    |

## Table `search_session_results`

### Columns

| Name                | Type          | Constraints |
| ------------------- | ------------- | ----------- |
| `id`                | `uuid`        | Primary     |
| `search_session_id` | `uuid`        |             |
| `res_id`            | `uuid`        | Nullable    |
| `dish_id`           | `uuid`        | Nullable    |
| `rank`              | `int4`        | Nullable    |
| `score`             | `float8`      | Nullable    |
| `reason`            | `text`        | Nullable    |
| `created_at`        | `timestamptz` | Nullable    |

## Table `search_sessions`

### Columns

| Name               | Type          | Constraints |
| ------------------ | ------------- | ----------- |
| `id`               | `uuid`        | Primary     |
| `user_id`          | `uuid`        | Nullable    |
| `query`            | `varchar`     |             |
| `lat`              | `float8`      |             |
| `lng`              | `float8`      |             |
| `budget`           | `int4`        | Nullable    |
| `created_at`       | `timestamptz` | Nullable    |
| `anonymous_id`     | `text`        | Nullable    |
| `normalized_query` | `text`        | Nullable    |
| `filters_json`     | `jsonb`       | Nullable    |
| `result_count`     | `int4`        | Nullable    |
| `response_ms`      | `int4`        | Nullable    |
| `results_json`     | `jsonb`       | Nullable    |

## Table `social_follows`

### Columns

| Name           | Type        | Constraints |
| -------------- | ----------- | ----------- |
| `follower_id`  | `uuid`      | Primary     |
| `following_id` | `uuid`      | Primary     |
| `created_at`   | `timestamp` | Nullable    |

## Table `social_likes`

### Columns

| Name         | Type        | Constraints |
| ------------ | ----------- | ----------- |
| `user_id`    | `uuid`      | Primary     |
| `post_id`    | `varchar`   | Primary     |
| `created_at` | `timestamp` | Nullable    |

## Table `social_notifications`

### Columns

| Name         | Type        | Constraints |
| ------------ | ----------- | ----------- |
| `id`         | `varchar`   | Primary     |
| `user_id`    | `uuid`      |             |
| `actor_id`   | `uuid`      |             |
| `type`       | `varchar`   |             |
| `post_id`    | `varchar`   | Nullable    |
| `is_read`    | `bool`      | Nullable    |
| `created_at` | `timestamp` | Nullable    |

## Table `social_posts`

### Columns

| Name            | Type        | Constraints |
| --------------- | ----------- | ----------- |
| `id`            | `varchar`   | Primary     |
| `user_id`       | `uuid`      |             |
| `content`       | `varchar`   | Nullable    |
| `media_urls`    | `json`      | Nullable    |
| `res_id`        | `uuid`      | Nullable    |
| `parent_id`     | `varchar`   | Nullable    |
| `likes_count`   | `int4`      | Nullable    |
| `replies_count` | `int4`      | Nullable    |
| `created_at`    | `timestamp` | Nullable    |
| `mood`          | `varchar`   | Nullable    |

## Table `social_stories`

### Columns

| Name          | Type        | Constraints |
| ------------- | ----------- | ----------- |
| `id`          | `varchar`   | Primary     |
| `user_id`     | `uuid`      |             |
| `media_url`   | `varchar`   |             |
| `created_at`  | `timestamp` | Nullable    |
| `expires_at`  | `timestamp` |             |
| `overlays`    | `json`      | Nullable    |
| `views_count` | `int4`      | Nullable    |

## Table `social_story_views`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `int4`        | Primary     |
| `story_id`   | `varchar`     |             |
| `user_id`    | `uuid`        |             |
| `reaction`   | `varchar`     | Nullable    |
| `created_at` | `timestamptz` | Nullable    |

## Table `tags`

### Columns

| Name   | Type      | Constraints |
| ------ | --------- | ----------- |
| `id`   | `uuid`    | Primary     |
| `name` | `varchar` | Unique      |

## Table `user_collection_items`

### Columns

| Name            | Type          | Constraints |
| --------------- | ------------- | ----------- |
| `id`            | `uuid`        | Primary     |
| `collection_id` | `uuid`        |             |
| `user_id`       | `uuid`        |             |
| `res_id`        | `uuid`        | Nullable    |
| `dish_id`       | `uuid`        | Nullable    |
| `item_type`     | `varchar`     |             |
| `note`          | `text`        | Nullable    |
| `created_at`    | `timestamptz` | Nullable    |

## Table `user_collections`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `uuid`        | Primary     |
| `user_id`     | `uuid`        |             |
| `name`        | `varchar`     |             |
| `description` | `text`        | Nullable    |
| `created_at`  | `timestamptz` | Nullable    |
| `updated_at`  | `timestamptz` | Nullable    |

## Table `user_favorites`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `uuid`        | Primary     |
| `user_id`    | `uuid`        |             |
| `res_id`     | `uuid`        |             |
| `created_at` | `timestamptz` | Nullable    |

## Table `user_friend_requests`

### Columns

| Name          | Type          | Constraints |
| ------------- | ------------- | ----------- |
| `id`          | `uuid`        | Primary     |
| `sender_id`   | `uuid`        |             |
| `receiver_id` | `uuid`        |             |
| `status`      | `varchar`     |             |
| `created_at`  | `timestamptz` | Nullable    |
| `updated_at`  | `timestamptz` | Nullable    |

## Table `user_friends`

### Columns

| Name         | Type          | Constraints |
| ------------ | ------------- | ----------- |
| `id`         | `uuid`        | Primary     |
| `user_id`    | `uuid`        |             |
| `friend_id`  | `uuid`        |             |
| `created_at` | `timestamptz` | Nullable    |

## Table `user_interactions`

### Columns

| Name                | Type          | Constraints |
| ------------------- | ------------- | ----------- |
| `id`                | `uuid`        | Primary     |
| `anonymous_id`      | `text`        | Nullable    |
| `user_id`           | `uuid`        | Nullable    |
| `res_id`            | `uuid`        | Nullable    |
| `action_type`       | `varchar`     |             |
| `duration_sec`      | `int4`        | Nullable    |
| `created_at`        | `timestamptz` | Nullable    |
| `metadata`          | `jsonb`       | Nullable    |
| `search_session_id` | `uuid`        | Nullable    |

## Table `user_onboardings`

### Columns

| Name                   | Type          | Constraints     |
| ---------------------- | ------------- | --------------- |
| `id`                   | `uuid`        | Primary         |
| `anonymous_id`         | `text`        | Nullable Unique |
| `user_id`              | `uuid`        | Nullable Unique |
| `favorite_dishes`      | `jsonb`       | Nullable        |
| `spicy_level`          | `varchar`     | Nullable        |
| `dietary_restrictions` | `jsonb`       | Nullable        |
| `allergies`            | `jsonb`       | Nullable        |
| `budget`               | `varchar`     | Nullable        |
| `location`             | `varchar`     | Nullable        |
| `age`                  | `int4`        | Nullable        |
| `preferences_vector`   | `vector`      | Nullable        |
| `created_at`           | `timestamptz` | Nullable        |
| `updated_at`           | `timestamptz` | Nullable        |
| `completed_at`         | `timestamptz` | Nullable        |
| `is_vegetarian`        | `bool`        | Nullable        |
| `onboarding_version`   | `varchar`     | Nullable        |

## Table `users`

### Columns

| Name                 | Type          | Constraints |
| -------------------- | ------------- | ----------- |
| `id`                 | `uuid`        | Primary     |
| `username`           | `varchar`     | Unique      |
| `password_hash`      | `varchar`     | Nullable    |
| `preferences_vector` | `vector`      | Nullable    |
| `allergies`          | `jsonb`       | Nullable    |
| `created_at`         | `timestamptz` | Nullable    |
| `updated_at`         | `timestamptz` | Nullable    |
| `full_name`          | `varchar`     | Nullable    |
| `avatar_url`         | `varchar`     | Nullable    |
| `email`              | `varchar`     | Nullable    |
| `status`             | `varchar`     | Nullable    |
| `profile_stats`      | `json`        | Nullable    |
| `cover_url`          | `varchar`     | Nullable    |
