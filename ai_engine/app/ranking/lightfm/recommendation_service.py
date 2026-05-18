import os
import pickle
import logging
from typing import List

logger = logging.getLogger(__name__)

class LightFMRecommendationService:
    def __init__(self):
        self.model = None
        self.dataset = None
        self.user_map = {}
        self.item_map = {}
        self.inverse_item_map = {}
        
        # Paths to models from central settings config
        from app.core.config import settings
        self.model_path = os.path.abspath(settings.LIGHTFM_MODEL_PATH)
        self.dataset_path = os.path.abspath(settings.LIGHTFM_DATASET_PATH)

    def load_model(self):
        """Loads model and dataset mapping from the models directory."""
        logger.info(f"Loading LightFM model from: {self.model_path}")
        logger.info(f"Loading LightFM dataset from: {self.dataset_path}")
        
        if not os.path.exists(self.model_path) or not os.path.exists(self.dataset_path):
            logger.warning("LightFM model or dataset file not found. System will fallback to popular items.")
            self.model = None
            self.dataset = None
            self.user_map = {}
            self.item_map = {}
            self.inverse_item_map = {}
            return

        try:
            with open(self.model_path, "rb") as f:
                self.model = pickle.load(f)
            with open(self.dataset_path, "rb") as f:
                self.dataset = pickle.load(f)
                
            # Extract mappings
            user_id_map, _, item_id_map, _ = self.dataset.mapping()
            self.user_map = user_id_map
            self.item_map = item_id_map
            # Create inverse map to convert internal LightFM item indices back to real restaurant IDs
            self.inverse_item_map = {v: k for k, v in self.item_map.items()}
            
            logger.info("Successfully loaded LightFM model and mappings into memory!")
        except Exception as e:
            logger.error(f"Error loading LightFM model: {e}", exc_info=True)
            self.model = None
            self.dataset = None
            self.user_map = {}
            self.item_map = {}
            self.inverse_item_map = {}

    def get_recommendations(self, user_id: str, limit: int = 10) -> List[str]:
        """
        Predict top-K recommended restaurant IDs for a user.
        Returns empty list if the user is a Cold-Start user or the model is not loaded.
        """
        if self.model is None or not self.user_map or not self.item_map:
            logger.warning("LightFM model is not loaded or mappings are empty.")
            return []

        user_str = str(user_id)
        if user_str not in self.user_map:
            logger.info(f"User ID {user_id} not found in LightFM user mapping. Triggering Cold Start fallback.")
            return []

        try:
            # Get internal LightFM user index
            user_idx = self.user_map[user_str]
            
            # Predict scores for all items
            # In LightFM, predictions are done for a user index and an array of all item indices
            item_indices = list(self.item_map.values())
            
            # Predict scores using trained model
            scores = self.model.predict(
                user_ids=user_idx,
                item_ids=item_indices
            )
            
            # Pair item indices with their predicted scores, sort by score descending
            ranked_pairs = sorted(zip(item_indices, scores), key=lambda x: x[1], reverse=True)
            
            # Take Top-K
            top_ranked = ranked_pairs[:limit]
            
            # Map back to real restaurant UUID strings
            recommended_ids = [self.inverse_item_map[idx] for idx, _ in top_ranked]
            logger.info(f"Successfully generated {len(recommended_ids)} predictions for user {user_id}")
            return recommended_ids

        except Exception as e:
            logger.error(f"Error predicting recommendations for user {user_id}: {e}", exc_info=True)
            return []

# Singleton instance
recommendation_service = LightFMRecommendationService()
