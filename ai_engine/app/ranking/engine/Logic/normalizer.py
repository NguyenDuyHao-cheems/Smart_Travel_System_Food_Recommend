import numpy as np

class ScoreNormalizer:
    @staticmethod
    def min_max_scale(scores: list):
        if not scores or len(scores) == 0:
            return []
        
        arr = np.array(scores)
        s_min, s_max = arr.min(), arr.max()
        
        # Tránh lỗi chia cho 0 nếu tất cả điểm bằng nhau
        if s_max == s_min:
            return [0.5] * len(scores)
            
        return ((arr - s_min) / (s_max - s_min)).tolist()