# Smart Travel System - AI Engine

## Overview

|             |       |
| ----------- | ----- |
| **Version** | 0.1.0 |
| **OpenAPI** | 3.1.0 |

## Endpoints

### POST `/api/v1/nlp/process`

**Process Nlp**

Takes user text, extracts intents and budget, and returns a
PhoBERT vector embedding.

**Tags:** `NLP`
**Operation ID:** `process_nlp_api_v1_nlp_process_post`

**Request Body**

Content-Type: `application/json`

_See [NLPRequest](#schemas)_

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |
| `422` | Validation Error    |

---

### POST `/api/v1/nlp/extract-intent`

**Extract Intent**

**Tags:** `NLP`
**Operation ID:** `extract_intent_api_v1_nlp_extract_intent_post`

**Request Body**

Content-Type: `application/json`

_See [ExtractIntentRequest](#schemas)_

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

### GET `/api/health`

**Get Health Status**

**Operation ID:** `get_health_status_api_health_get`

**Responses**

| Code  | Description         |
| ----- | ------------------- |
| `200` | Successful Response |

---

## Schemas

### ExtractIntentRequest

| Field  | Type     | Required | Description                 |
| ------ | -------- | -------- | --------------------------- |
| `text` | `string` | ✓        | Natural language food query |
| `lat`  | `any`    |          | Optional user latitude      |
| `lng`  | `any`    |          | Optional user longitude     |

### ExtractIntentResponse

| Field          | Type              | Required | Description |
| -------------- | ----------------- | -------- | ----------- |
| `raw_text`     | `string`          | ✓        |             |
| `tags`         | array of `string` | ✓        |             |
| `budget`       | `any`             |          |             |
| `query_vector` | array of `number` | ✓        |             |
| `lat`          | `any`             |          |             |
| `lng`          | `any`             |          |             |

### HTTPValidationError

| Field    | Type                                       | Required | Description |
| -------- | ------------------------------------------ | -------- | ----------- |
| `detail` | array of _See [ValidationError](#schemas)_ |          |             |

### NLPRequest

Schema for the ai_engine to receive raw text from the core_backend.

| Field  | Type     | Required | Description                       |
| ------ | -------- | -------- | --------------------------------- |
| `text` | `string` | ✓        | The raw user text to be processed |

### NLPResponse

Schema representing the structured AI output to be sent back to core_backend.

| Field              | Type              | Required | Description                                              |
| ------------------ | ----------------- | -------- | -------------------------------------------------------- |
| `vector`           | array of `number` | ✓        | The generated embedded vector representation of the text |
| `extracted_budget` | `any`             |          | The budget extracted from the text, if any               |
| `intent`           | `any`             |          | The extracted intent of the user search                  |

### ValidationError

| Field   | Type           | Required | Description |
| ------- | -------------- | -------- | ----------- |
| `loc`   | array of `any` | ✓        |             |
| `msg`   | `string`       | ✓        |             |
| `type`  | `string`       | ✓        |             |
| `input` | `any`          |          |             |
| `ctx`   | `object`       |          |             |
