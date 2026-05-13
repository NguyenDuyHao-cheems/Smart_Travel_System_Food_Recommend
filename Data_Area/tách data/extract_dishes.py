import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


INPUT_CANDIDATES = "data.json"
OUTPUT_FILE = "dishes.json"


def log(message: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {message}", flush=True)


def pick_input_file() -> str:
    for file_name in INPUT_CANDIDATES:
        if Path(file_name).exists():
            return file_name
    raise FileNotFoundError("Không tìm thấy data.json")


def load_data(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} phải là JSON array")
    return data


def extract_dishes(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    dishes_output: List[Dict[str, Any]] = []
    seen_ids = set()

    for item in data:
        dishes = item.get("dishes") or []
        if not isinstance(dishes, list):
            continue

        for dish in dishes:
            if not isinstance(dish, dict):
                continue

            dish_id = dish.get("id")
            if dish_id in seen_ids:
                continue
            seen_ids.add(dish_id)

            dishes_output.append({
                "id": dish.get("id"),
                "res_id": dish.get("res_id"),
                "name": dish.get("name"),
                "price": dish.get("price"),
                "image_url": dish.get("image_url"),
                "ingredients": dish.get("ingredients"),
                "allergens": dish.get("allergens"),
                "is_vegetarian": dish.get("is_vegetarian"),
                "embedding_vector": dish.get("embedding_vector"),
            })

    return dishes_output


def save_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main() -> None:
    input_file = pick_input_file()
    log(f"Đang đọc dữ liệu từ {input_file} ...")
    data = load_data(input_file)

    log("Đang tách dishes ra file riêng ...")
    dishes = extract_dishes(data)

    save_json(OUTPUT_FILE, dishes)

    log(f"Đã tạo {OUTPUT_FILE}")
    log(f"Tổng số dishes: {len(dishes)}")


if __name__ == "__main__":
    main()
