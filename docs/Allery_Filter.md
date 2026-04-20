# 🚀 Task: Implement Allergy Filtering Module

## 1. 🎯 Objective

Implement a filtering mechanism to **remove unsafe food/restaurant candidates** based on user allergies before ranking.

---

## 2. 📌 Context

This project uses the following pipeline:

```
User Query → NLP → Candidate Generation → Ranking
```

👉 New requirement:

```
User Query → NLP → Candidate Generation → Allergy Filtering → Ranking
```

---

## 3. 🧩 Scope of Work

You need to:

1. Create an **allergy filtering module**
2. Integrate it into the existing pipeline
3. Ensure it runs **before ranking**
4. Support dynamic allergy input from user request

---

## 4. 📁 Files to Create / Modify

### 4.1 Create new module

```
ai_engine/app/core/allergy_filter.py
```

---

### 4.2 Modify pipeline

Update file:

```
ai_engine/app/core/pipeline.py (or equivalent)
```

Add allergy filtering step before ranking.

---

### 4.3 Update API (if needed)

File:

```
core_backend/app/api/recommend.py
```

Ensure request supports:

* `allergies` field

---

## 5. ⚙️ Functional Requirements

### 5.1 Input

* `candidates`: list of food/place objects
* `user_allergies`: list of strings

Example:

```json
{
  "allergies": ["peanut", "milk"]
}
```

---

### 5.2 Output

* Filtered list with **no allergen-containing items**

---

## 6. 🧠 Logic Specification

### 6.1 Core Rule

> Remove any candidate that contains at least one allergen

---

### 6.2 Pseudocode

```python
def filter_allergy(candidates, user_allergies):
    if not user_allergies:
        return candidates

    safe_candidates = []

    for item in candidates:
        ingredients = item.get("ingredients", [])

        if not any(ing in user_allergies for ing in ingredients):
            safe_candidates.append(item)

    return safe_candidates
```

---

## 7. 🔗 Integration Steps

### Step 1: After candidate generation

```python
candidates = generate_candidates(query)
```

---

### Step 2: Apply allergy filter

```python
filtered_candidates = filter_allergy(candidates, user_allergies)
```

---

### Step 3: Send to ranking

```python
ranked = rank(filtered_candidates)
```

---

## 8. 🌐 API Contract Update

### Request

```json
{
  "query": "ăn gì ở Hà Nội",
  "allergies": ["peanut"]
}
```

---

### Behavior

* If `allergies` is empty → skip filtering
* If provided → apply strict filtering

---

## 9. ⚠️ Edge Cases

* Missing `ingredients` field → treat as safe OR configurable
* Case sensitivity → normalize to lowercase
* Synonyms:

  * peanut = groundnut
  * shrimp = prawn

---

## 10. 🧪 Testing Requirements

### Unit Tests

Create:

```
ai_engine/tests/test_allergy_filter.py
```

Test cases:

* No allergies → return all
* Match allergen → removed
* No match → kept
* Empty candidates

---

## 11. 🚀 Optional Enhancements

* Add scoring penalty instead of removal
* NLP extraction of allergies from query
* Configurable strict mode

---

## 12. ✅ Acceptance Criteria

* Filtering runs before ranking
* No unsafe item appears in result
* API accepts allergy input
* Unit tests pass

---

## 13. 🎤 Dev Note

Keep module:

* simple
* stateless
* easily extendable

---
