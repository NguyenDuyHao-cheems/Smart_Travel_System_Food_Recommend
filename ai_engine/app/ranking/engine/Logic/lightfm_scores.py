import pickle
import numpy as np

class BehaviorScorer:
    def __init__(self, model_path, user_map_path, item_map_path):
        self.model = self._load(model_path)
        self.user_map = self._load(user_map_path)
        self.item_map = self._load(item_map_path)

    def _load(self, path):
        try:
            with open(path, 'rb') as f:
                return pickle.load(f)
        except:
            return None

    def predict_scores(self, user_id, item_ids):
        if not self.model or not self.user_map or not self.item_map:
            return [0.0] * len(item_ids)

        # Ép kiểu string để khớp với lúc train mapping
        u_idx = self.user_map.get(str(user_id))
        if u_idx is None:
            return [0.0] * len(item_ids)

        scores = [0.0] * len(item_ids)
        internal_indices = [self.item_map.get(str(iid)) for iid in item_ids]

        exec_indices = [idx for idx in internal_indices if idx is not None]
        exec_positions = [i for i, idx in enumerate(internal_indices) if idx is not None]

        if exec_indices:
            try:
                preds = self.model.predict(u_idx, np.array(exec_indices))
                for pos, val in zip(exec_positions, preds):
                    scores[pos] = float(val)
            except:
                pass
        return scores