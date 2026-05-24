import os
import sys
import pickle
import logging
import warnings
# Suppress LightFM OpenMP warning
warnings.filterwarnings("ignore", category=UserWarning, module="lightfm")

import httpx
import pandas as pd
from lightfm import LightFM
from lightfm.data import Dataset
from sqlalchemy import create_engine

# Set PYTHONPATH automatically
CURRENT_FILE_PATH = os.path.abspath(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_FILE_PATH, "../../"))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def extract_weight(row):
    action_type = row['action_type']
    metadata = row['metadata']
    if isinstance(metadata, str):
        try:
            import json
            metadata = json.loads(metadata)
        except Exception:
            metadata = {}
    elif not isinstance(metadata, dict):
        metadata = {}

    if action_type == "REVIEW_RESTAURANT":
        try:
            rating = float(metadata.get("rating", 5.0))
            if rating < 3.0:
                return -1.0
            return rating
        except Exception:
            return 5.0
    elif action_type in ("SAVE_RESTAURANT", "LIKE_RESTAURANT"):
        return 5.0
    elif action_type == "REMOVE_RESTAURANT":
        return -1.0
    elif action_type == "VIEW_RESTAURANT":
        return 1.0
    else:
        return 1.0

def train_lightfm_model():
    """CLI Script to train LightFM offline."""
    try:
        logger.info("Connecting to PostgreSQL Database...")
        if not settings.DATABASE_URL:
            logger.error("DATABASE_URL is not set in settings!")
            return
            
        engine = create_engine(settings.DATABASE_URL)
        
        logger.info("Fetching interactions from 'user_interactions'...")
        query_inter = """
            SELECT user_id, res_id, action_type, metadata 
            FROM user_interactions 
            WHERE user_id IS NOT NULL AND res_id IS NOT NULL
        """
        df_inter = pd.read_sql(query_inter, engine)
        
        if df_inter.empty:
            logger.warning("No interactions found in the database. Aborting training.")
            return

        logger.info("Fetching restaurant IDs from 'restaurants'...")
        df_res = pd.read_sql("SELECT id FROM restaurants", engine)
        
        # Cast ids to string
        df_inter['user_id'] = df_inter['user_id'].astype(str)
        df_inter['res_id'] = df_inter['res_id'].astype(str)
        df_res['id'] = df_res['id'].astype(str)
        
        # Process weights and filter out negative interactions
        df_inter['weight'] = df_inter.apply(extract_weight, axis=1)
        
        # Lọc bỏ các tương tác tiêu cực (ví dụ: rating < 3.0)
        df_inter = df_inter[df_inter['weight'] > 0]
        
        # Build user history to filter out seen items during prediction
        user_history = df_inter.groupby('user_id')['res_id'].apply(set).to_dict()
        
        # Build list of all items (database restaurants + any interacted items not in DB)
        all_restaurant_ids = df_res['id'].unique()
        all_items = list(set(all_restaurant_ids) | set(df_inter['res_id'].unique()))
        
        logger.info(f"Loaded {len(df_inter)} interactions, {len(df_inter['user_id'].unique())} users, and {len(all_items)} total restaurants.")

        # Initialize and fit LightFM Dataset mapping
        dataset = Dataset()
        dataset.fit(
            users=df_inter['user_id'].unique(),
            items=all_items
        )

        # Build interaction and weights matrices
        (interactions, weights) = dataset.build_interactions(
            [(x['user_id'], x['res_id'], x['weight']) for _, x in df_inter.iterrows()]
        )

        # Train model using Logistic loss (highly stable and tuned for personalization)
        logger.info("Training LightFM model with Logistic loss...")
        model = LightFM(
            loss='logistic', 
            no_components=15, 
            learning_rate=0.03,
            item_alpha=1e-3,
            user_alpha=1e-4,
            random_state=42
        )
        
        model.fit(
            interactions,
            sample_weight=weights,
            epochs=100
        )
        logger.info("Model training completed successfully.")

        # Ensure output models directory exists
        models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models"))
        os.makedirs(models_dir, exist_ok=True)
        
        model_path = os.path.join(models_dir, "lightfm_model.pkl")
        dataset_path = os.path.join(models_dir, "lightfm_dataset.pkl")
        user_history_path = os.path.join(models_dir, "lightfm_user_history.pkl")

        # Save model, dataset mapping, and user history
        with open(model_path, "wb") as f:
            pickle.dump(model, f)
        with open(dataset_path, "wb") as f:
            pickle.dump(dataset, f)
        with open(user_history_path, "wb") as f:
            pickle.dump(user_history, f)
            
        logger.info(f"Successfully saved trained model to: {model_path}")
        logger.info(f"Successfully saved dataset mapping to: {dataset_path}")
        logger.info(f"Successfully saved user history to: {user_history_path}")

        # Trigger Hot-Reload API
        try:
            reload_url = f"http://localhost:{settings.AI_SERVICE_PORT}/api/v1/admin/recommendations/reload"
            logger.info(f"Triggering hot-reload API: {reload_url}...")
            res = httpx.post(reload_url, json={}, timeout=5)
            if res.status_code == 200:
                logger.info("Successfully triggered server hot-reload!")
            else:
                logger.warning(f"Server reload returned status code {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Could not trigger hot-reload on FastAPI server (is it running?): {e}")

    except Exception as e:
        logger.error(f"Error during training process: {e}", exc_info=True)

if __name__ == "__main__":
    train_lightfm_model()
