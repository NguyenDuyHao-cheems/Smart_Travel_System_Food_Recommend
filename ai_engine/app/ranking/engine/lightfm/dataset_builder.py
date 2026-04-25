from lightfm.data import Dataset

class LightFMDatasetBuilder:
    def __init__(self):
        self.dataset = Dataset()

    def build(self, interactions_data):
        """
        interactions_data: List các tuple (user_id, item_id, weight)
        """
        # 1. Thu thập tất cả ID duy nhất để thiết lập mapping
        users = [str(d[0]) for d in interactions_data]
        items = [str(d[1]) for d in interactions_data]

        # 2. Fit dataset để tạo mapping nội bộ (từ ID sang Index 0, 1, 2...)
        self.dataset.fit(users=users, items=items)
        
        # 3. Xây dựng ma trận tương tác
        (interactions, weights) = self.dataset.build_interactions(
            [(str(u), str(i), float(w)) for u, i, w in interactions_data]
        )

        # 4. Lấy bộ mapping để lưu lại phục vụ lúc Predict
        # mapping()[0] -> user_map
        # mapping()[2] -> item_map
        user_id_map = self.dataset.mapping()[0]
        item_id_map = self.dataset.mapping()[2]
        
        return interactions, weights, user_id_map, item_id_map