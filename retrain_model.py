import logging
from ml_models import train_model, get_model_insights
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
import numpy as np

logging.basicConfig(level=logging.INFO)

def retrain_and_analyze():
    # Retrain the model
    logging.info("Retraining the model with new data...")
    model, feature_importance = train_model()

    if model is not None:
        logging.info("Model training completed successfully.")
        
        # Get model insights
        insights = get_model_insights()
        if isinstance(insights, dict):
            logging.info("Model insights generated successfully.")
            logging.info(f"Top predictors: {insights['top_predictors'][:5]}")
            logging.info(f"Mean CV Score: {insights['cross_validation_scores']['mean']:.4f}")
            
            # Additional model performance metrics
            y_true = model.named_steps['classifier'].classes_
            y_pred = model.predict(model.named_steps['preprocessor'].transform(X_test))
            y_pred_proba = model.predict_proba(model.named_steps['preprocessor'].transform(X_test))
            
            accuracy = accuracy_score(y_true, y_pred)
            roc_auc = roc_auc_score(y_true, y_pred_proba, multi_class='ovr')
            
            logging.info(f"Test Set Accuracy: {accuracy:.4f}")
            logging.info(f"ROC AUC Score: {roc_auc:.4f}")
            logging.info("\nClassification Report:")
            logging.info(classification_report(y_true, y_pred))
            logging.info("\nConfusion Matrix:")
            logging.info(confusion_matrix(y_true, y_pred))
            
            # Feature importance analysis
            logging.info("\nTop 10 Most Important Features:")
            for feature, importance in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:10]:
                logging.info(f"{feature}: {importance:.4f}")
            
            # Model parameters
            logging.info("\nBest Model Parameters:")
            for param, value in model.get_params().items():
                logging.info(f"{param}: {value}")
        else:
            logging.warning("Unable to generate model insights.")
    else:
        logging.error("Model training failed.")

    print("Model retraining and insight generation process completed.")

if __name__ == "__main__":
    retrain_and_analyze()
