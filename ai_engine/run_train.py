import logging
import argparse
from scripts.run_train import train_lightfm_model
# Sau này nếu Bảo có thêm LambdaMART train thì import vào đây luôn
# from app.ranking.lambdamart_train import train_lambdamart_model

# Cấu hình log để theo dõi tiến trình khi chạy từ terminal
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("TrainRunner")

def main():
    parser = argparse.ArgumentParser(description="AI Engine Training Runner")
    parser.add_argument(
        "--model", 
        type=str, 
        default="all", 
        help="Model muốn train: lightfm, lambdamart, hoặc all (mặc định: all)"
    )
    
    args = parser.parse_args()

    logger.info(f"🚀 Bắt đầu quy trình huấn luyện: {args.model}")

    if args.model in ["lightfm", "all"]:
        logger.info("--- Đang huấn luyện LightFM ---")
        train_lightfm_model()

    # if args.model in ["lambdamart", "all"]:
    #     logger.info("--- Đang huấn luyện LambdaMART ---")
    #     train_lambdamart_model()

    logger.info("✅ Tất cả quy trình huấn luyện đã hoàn tất!")

if __name__ == "__main__":
    main()