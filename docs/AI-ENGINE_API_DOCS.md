# Smart Travel System - AI Engine

## Overview

|             |       |
| ----------- | ----- |
| **Version** | 0.1.0 |
| **OpenAPI** | 3.1.0 |

## Endpoints

### POST `/api/v1/nlp/extract-intent`

**Extract Intent**

Unified endpoint to extract budget, intent and generate embeddings.

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

| Field      | Type              | Required | Description                                              |
| ---------- | ----------------- | -------- | -------------------------------------------------------- |
| `raw_text` | `string`          | ✓        |                                                          |
| `budget`   | `any`             |          |                                                          |
| `vector`   | array of `number` | ✓        | The generated embedded vector representation of the text |
| `intent`   | `string`          |          | The extracted intent of the user search                  |
| `lat`      | `any`             |          |                                                          |
| `lng`      | `any`             |          |                                                          |

### HTTPValidationError

| Field    | Type                                       | Required | Description |
| -------- | ------------------------------------------ | -------- | ----------- |
| `detail` | array of _See [ValidationError](#schemas)_ |          |             |

### ValidationError

| Field   | Type           | Required | Description |
| ------- | -------------- | -------- | ----------- |
| `loc`   | array of `any` | ✓        |             |
| `msg`   | `string`       | ✓        |             |
| `type`  | `string`       | ✓        |             |
| `input` | `any`          |          |             |
| `ctx`   | `object`       |          |             |
