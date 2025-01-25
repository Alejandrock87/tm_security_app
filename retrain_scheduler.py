
import schedule
import time
from ml_models import train_rnn_model
import logging

logging.basicConfig(level=logging.INFO)

def retrain_model_job():
    logging.info("Starting scheduled model retraining...")
    try:
        model = train_rnn_model()
        if model:
            logging.info("Model retraining completed successfully")
        else:
            logging.error("Model retraining failed - insufficient data")
    except Exception as e:
        logging.error(f"Error during model retraining: {str(e)}")

def run_scheduler():
    schedule.every().day.at("04:30").do(retrain_model_job)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    run_scheduler()
