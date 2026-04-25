class ReRanker:
    @staticmethod
    def apply_rules(candidates: list, user_allergies: list):
        """
        Lọc dị ứng dựa trên metadata.tags và sắp xếp kết quả.
        """
        # Chuẩn hóa danh sách dị ứng sang chữ thường
        allergies = [a.lower() for a in user_allergies] if user_allergies else []

        for c in candidates:
            # Lấy tags từ metadata (Backend gửi sang)
            dish_tags = c.get('metadata', {}).get('tags', [])
            
            # Nếu có bất kỳ tag nào trùng với dị ứng, trừ điểm nặng
            if any(tag.lower() in allergies for tag in dish_tags):
                c['final_score'] -= 100.0

        # Sắp xếp giảm dần theo điểm cuối cùng
        return sorted(candidates, key=lambda x: x.get('final_score', 0), reverse=True)