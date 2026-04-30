# Smart Travel System - Food Recommend

## Overview

|             |       |
| ----------- | ----- |
| **Version** | 0.1.0 |
| **OpenAPI** | 3.1.0 |

## Endpoints

### GET `/api/health`

**Get Health Status**

**Operation ID:** `get_health_status_api_health_get`

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |

---

### POST `/api/v1/search/process`

**Process Search Query**

Receives a raw text query from the client, forwards it to the ai_engine
to extract intents/embeddings, and then uses that data to perform a search
in PostgreSQL using pgvector (implementation pending).

**Tags:** `Search`
**Operation ID:** `process_search_query_api_v1_search_process_post`

**Request Body**

Content-Type: `application/json`

_See [SearchRequest](#schemas)_

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |
| `422` | Validation Error    |

---

### POST `/api/v1/search/recommend`

**Recommend Food With Gps**

Receives a food requirement and user GPS location (lat, lng),
then returns the recommended food places near that location.

**Tags:** `Search`
**Operation ID:** `recommend_food_with_gps_api_v1_search_recommend_post`

**Request Body**

Content-Type: `application/json`

_See [SearchRecommendRequest](#schemas)_

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |
| `422` | Validation Error    |

---

### POST `/api/v1/users/{user_id}/onboarding`

**Submit user onboarding preferences**

Accepts a user's food preferences, calls the AI engine to generate a preference vector, persists the result, and returns the combined vector. When no prior data exists the response includes a list of popular restaurants as a soft fallback.

**Tags:** `Users`
**Operation ID:** `user_onboarding_api_v1_users__user_id__onboarding_post`

**Parameters**

| Name      | In   | Type     | Required | Description |
| --------- | ---- | -------- | -------- | ----------- |
| `user_id` | path | `string` | ✓        |             |

**Request Body**

Content-Type: `application/json`

_See [OnboardingRequest](#schemas)_

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |
| `422` | Validation Error    |

---

### POST `/api/v1/ml/rank`

**Rank Candidates**

Endpoint thực hiện Pipeline:

1. Retrieval: Lọc thô từ Postgres (tags, budget, location, is_open)
2. Ranking: Xếp hạng bằng NumPy Cosine Similarity

**Tags:** `ML`
**Operation ID:** `rank_candidates_api_v1_ml_rank_candidates_post`

**Request Body**

Content-Type: `application/json`

_See [UserRankRequest](#schemas)_

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |
| `422` | Validation Error    |

---

### GET `/`

**Read Root**

**Operation ID:** `read_root__get`

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |

---

## Schemas

### AIResponseData

Schema representing the structured response returned by the ai_engine.

| Field    | Type              | Required | Description                                              |
| -------- | ----------------- | -------- | -------------------------------------------------------- |
| `vector` | array of `number` | ✓        | The generated embedded vector representation of the text |
| `budget` | `any`             |          | The budget extracted from the text, if any               |
| `intent` | `any`             |          | The extracted intent of the user search                  |

### HTTPValidationError

| Field    | Type                                       | Required | Description |
| -------- | ------------------------------------------ | -------- | ----------- |
| `detail` | array of _See [ValidationError](#schemas)_ |          |             |

### MockRestaurant

A single popular-restaurant entry used in the fallback response.

| Field      | Type     | Required | Description |
| ---------- | -------- | -------- | ----------- |
| `name`     | `string` | ✓        |             |
| `cuisine`  | `string` | ✓        |             |
| `rating`   | `number` | ✓        |             |
| `location` | `string` | ✓        |             |

### OnboardingRequest

Input schema for the user onboarding endpoint.

| Field                  | Type              | Required | Description                                                                      |
| ---------------------- | ----------------- | -------- | -------------------------------------------------------------------------------- |
| `favorite_dishes`      | array of `string` | ✓        | Between 3 and 5 favorite dishes.                                                 |
| `spicy_level`          | `string`          | ✓        | User's preferred spice level. Enum: `none`, `mild`, `medium`, `hot`, `extra_hot` |
| `dietary_restrictions` | array of `string` |          | E.g. vegan, vegetarian, halal.                                                   |
| `allergies`            | array of `string` |          | List of food allergies.                                                          |
| `budget`               | `string`          | ✓        | User's dining budget tier. Enum: `low`, `medium`, `high`                         |
| `location`             | `string`          | ✓        | User's current city or district.                                                 |
| `age`                  | `integer`         | ✓        | User's age.                                                                      |

### OnboardingResponse

Response schema returned after successful onboarding.

| Field                 | Type      | Required | Description                                                                          |
| --------------------- | --------- | -------- | ------------------------------------------------------------------------------------ |
| `status`              | `string`  |          |                                                                                      |
| `message`             | `string`  |          |                                                                                      |
| `preferences_vector`  | `any`     |          | Combined preference vector from AI output + user data.                               |
| `fallback`            | `boolean` |          | True when the response is based on popular restaurants because no prior data exists. |
| `popular_restaurants` | `any`     |          | Populated only when fallback=True.                                                   |

### UserRankRequest

| Field           | Type              | Required | Description                                                                |
| --------------- | ----------------- | -------- | -------------------------------------------------------------------------- |
| `user_id`       | `string`          | ✓        | ID định danh của người dùng                                                |
| `k`             | `integer`         |          | Số lượng kết quả nhà hàng tối đa cần trả về                                |
| `offset`        | `integer`         |          | Vị trí bắt đầu của danh sách kết quả (dùng cho phân trang)                 |
| `tags`          | array of `string` |          | Danh sách các thẻ phân loại (ví dụ: 'đồ ăn chay', 'không gian ngoài trời') |
| `budget`        | `integer`         |          | Mức chi phí tối đa dự kiến của người dùng (VNĐ)                            |
| `user_location` | array of `number` |          | Tọa độ vị trí người dùng dạng [vĩ độ, kinh độ]                             |
| `radius`        | `number`          |          | Bán kính (km) được cho phép tìm kiếm xung quanh vị trí người dùng          |

### RankResponse

| Field     | Type               | Required | Description                                                                  |
| --------- | ------------------ | -------- | ---------------------------------------------------------------------------- |
| `ranked_ids` | array of `string` | ✓        | Danh sách ID các nhà hàng được gợi ý xếp hạng từ cao xuống thấp thông qua AI |
| `scores`     | array of `number` |          | Điểm số tương ứng của các nhà hàng                                           |

### RecommendResult

Schema này định dạng đầu ra bắt buộc của 1 quán ăn để thẻ UI hiển thị trên Frontend không bị vỡ.

| Field    | Type      | Required | Description |
| -------- | --------- | -------- | ----------- |
| `id`     | `integer` | ✓        |             |
| `name`   | `string`  | ✓        |             |
| `match`  | `string`  | ✓        |             |
| `dist`   | `string`  | ✓        |             |
| `price`  | `string`  | ✓        |             |
| `rating` | `string`  | ✓        |             |
| `reason` | `string`  | ✓        |             |
| `img`    | `string`  | ✓        |             |

### SearchRecommendRequest

Schema này dùng để hứng kết quả từ việc bắt GPS bên Frontend đẩy xuống qua API.

| Field   | Type     | Required | Description                          |
| ------- | -------- | -------- | ------------------------------------ |
| `query` | `string` | ✓        | The user's required food and context |
| `lat`   | `number` | ✓        | Current user latitude                |
| `lng`   | `number` | ✓        | Current user longitude               |

### SearchRecommendResponse

Kết quả trả về dạng danh sách (List) đẩy về cho UI Next.js Render.

| Field     | Type                                       | Required | Description |
| --------- | ------------------------------------------ | -------- | ----------- |
| `results` | array of _See [RecommendResult](#schemas)_ | ✓        |             |

### SearchRequest

Schema for the core backend to receive a user search query.

| Field   | Type     | Required | Description                      |
| ------- | -------- | -------- | -------------------------------- |
| `query` | `string` | ✓        | The user's raw text search query |

### ValidationError

| Field   | Type           | Required | Description |
| ------- | -------------- | -------- | ----------- |
| `loc`   | array of `any` | ✓        |             |
| `msg`   | `string`       | ✓        |             |
| `type`  | `string`       | ✓        |             |
| `input` | `any`          |          |             |
| `ctx`   | `object`       |          |             |
