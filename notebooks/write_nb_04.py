import json
import os

def create_notebook():
    cells = []
    
    # ----------------------------------------------------
    # Cell 1: Markdown Title & Intro
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# NexTwin AI — Industrial Digital Twin Platform\n",
            "## Notebook 04: Machine Health & Failure Prediction Model\n",
            "\n",
            "### Objectives\n",
            "1. **Load Engineered Dataset**: Load `engineered_machine_health.csv` (AI4I dataset).\n",
            "2. **Train Binary Classifiers**: Predict `machine_failure` using:\n",
            "   - Random Forest Classifier\n",
            "   - XGBoost Classifier\n",
            "   - LightGBM Classifier\n",
            "3. **Address Class Imbalance**: Incorporate class weights or scale position weights.\n",
            "4. **Hyperparameter Tuning**: Perform cross-validated search (`GridSearchCV`) for optimal model parameters.\n",
            "5. **Model Evaluation**: Compare models using Accuracy, Precision, Recall, F1-Score, and ROC-AUC.\n",
            "6. **Export Model**: Serialize the best performing classifier as `health_model.pkl`."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 2: Code Imports
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import os\n",
            "import pickle\n",
            "import pandas as pd\n",
            "import numpy as np\n",
            "from sklearn.model_selection import train_test_split, GridSearchCV\n",
            "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n",
            "from sklearn.compose import ColumnTransformer\n",
            "from sklearn.pipeline import Pipeline\n",
            "from sklearn.ensemble import RandomForestClassifier\n",
            "from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, classification_report, confusion_matrix\n",
            "from xgboost import XGBClassifier\n",
            "from lightgbm import LGBMClassifier\n",
            "\n",
            "print(\"Libraries loaded successfully.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 3: Markdown - Loading Data
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 1. Load Dataset & Train-Test Split\n",
            "We load the engineered AI4I machine health dataset and split it into training and testing partitions, ensuring stratification on the target label."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 4: Code - Loading & Splitting Data
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "PROCESSED_DIR = os.path.join(\"..\", \"datasets\", \"processed\")\n",
            "df = pd.read_csv(os.path.join(PROCESSED_DIR, \"engineered_machine_health.csv\"))\n",
            "\n",
            "# Select features and target\n",
            "feature_cols = [\n",
            "    'type', 'air_temperature', 'process_temperature', 'rotational_speed', \n",
            "    'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index'\n",
            "]\n",
            "target_col = 'machine_failure'\n",
            "\n",
            "X = df[feature_cols]\n",
            "y = df[target_col]\n",
            "\n",
            "# Stratified train/test split (80/20)\n",
            "X_train, X_test, y_train, y_test = train_test_split(\n",
            "    X, y, test_size=0.2, stratify=y, random_state=42\n",
            ")\n",
            "\n",
            "print(f\"Training set shape: {X_train.shape}\")\n",
            "print(f\"Test set shape: {X_test.shape}\")\n",
            "print(f\"Failure rate in training: {y_train.mean()*100:.2f}%\")\n",
            "print(f\"Failure rate in test: {y_test.mean()*100:.2f}%\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 5: Markdown - Define Preprocessor Pipeline
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Define Preprocessor Pipeline\n",
            "We build a column transformer to scale numerical variables and encode the categorical machine `type` variable."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - Preprocessor Pipeline
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "num_cols = ['air_temperature', 'process_temperature', 'rotational_speed', 'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index']\n",
            "cat_cols = ['type']\n",
            "\n",
            "preprocessor = ColumnTransformer(transformers=[\n",
            "    ('num', StandardScaler(), num_cols),\n",
            "    ('cat', OneHotEncoder(drop='first'), cat_cols)\n",
            "])\n",
            "\n",
            "print(\"Preprocessor pipeline defined.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - Model Training Section
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Train Base Classifiers\n",
            "We train Random Forest, XGBoost, and LightGBM models. To account for the class imbalance, we adjust class/position weights in all architectures."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - Base Classifier Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Compute scale position weight for XGBoost/LightGBM\n",
            "neg_count = (y_train == 0).sum()\n",
            "pos_count = (y_train == 1).sum()\n",
            "scale_pos_weight = neg_count / pos_count\n",
            "\n",
            "models = {\n",
            "    \"Random Forest\": RandomForestClassifier(class_weight='balanced', random_state=42),\n",
            "    \"XGBoost\": XGBClassifier(scale_pos_weight=scale_pos_weight, random_state=42, eval_metric='logloss'),\n",
            "    \"LightGBM\": LGBMClassifier(class_weight='balanced', random_state=42, verbose=-1)\n",
            "}\n",
            "\n",
            "results = {}\n",
            "\n",
            "for name, model in models.items():\n",
            "    # Create complete training pipeline\n",
            "    clf = Pipeline(steps=[\n",
            "        ('preprocessor', preprocessor),\n",
            "        ('classifier', model)\n",
            "    ])\n",
            "    \n",
            "    # Fit the pipeline\n",
            "    clf.fit(X_train, y_train)\n",
            "    \n",
            "    # Predictions\n",
            "    y_pred = clf.predict(X_test)\n",
            "    y_proba = clf.predict_proba(X_test)[:, 1]\n",
            "    \n",
            "    # Metrics\n",
            "    results[name] = {\n",
            "        \"Accuracy\": accuracy_score(y_test, y_pred),\n",
            "        \"Precision\": precision_score(y_test, y_pred),\n",
            "        \"Recall\": recall_score(y_test, y_pred),\n",
            "        \"F1-Score\": f1_score(y_test, y_pred),\n",
            "        \"ROC-AUC\": roc_auc_score(y_test, y_proba),\n",
            "        \"Pipeline\": clf\n",
            "    }\n",
            "    \n",
            "    print(f\"=== {name} Evaluated ===\")\n",
            "    print(classification_report(y_test, y_pred))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - Hyperparameter Tuning
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Hyperparameter Tuning (XGBoost)\n",
            "Let's perform Grid Search optimization on the XGBoost classifier to fine-tune its performance."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - GridSearchCV
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "xgb_pipeline = Pipeline(steps=[\n",
            "    ('preprocessor', preprocessor),\n",
            "    ('classifier', XGBClassifier(scale_pos_weight=scale_pos_weight, random_state=42, eval_metric='logloss'))\n",
            "])\n",
            "\n",
            "param_grid = {\n",
            "    'classifier__max_depth': [3, 5, 7],\n",
            "    'classifier__learning_rate': [0.05, 0.1, 0.2],\n",
            "    'classifier__n_estimators': [50, 100, 150]\n",
            "}\n",
            "\n",
            "grid_search = GridSearchCV(\n",
            "    xgb_pipeline, param_grid, cv=3, scoring='f1', verbose=1, n_jobs=-1\n",
            ")\n",
            "grid_search.fit(X_train, y_train)\n",
            "\n",
            "print(\"Best parameters found:\", grid_search.best_params_)\n",
            "print(f\"Best CV F1-Score: {grid_search.best_score_:.4f}\")\n",
            "\n",
            "# Evaluate tuned model\n",
            "tuned_model = grid_search.best_estimator_\n",
            "y_pred_tuned = tuned_model.predict(X_test)\n",
            "y_proba_tuned = tuned_model.predict_proba(X_test)[:, 1]\n",
            "\n",
            "results[\"Tuned XGBoost\"] = {\n",
            "    \"Accuracy\": accuracy_score(y_test, y_pred_tuned),\n",
            "    \"Precision\": precision_score(y_test, y_pred_tuned),\n",
            "    \"Recall\": recall_score(y_test, y_pred_tuned),\n",
            "    \"F1-Score\": f1_score(y_test, y_pred_tuned),\n",
            "    \"ROC-AUC\": roc_auc_score(y_test, y_proba_tuned),\n",
            "    \"Pipeline\": tuned_model\n}"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 11: Markdown - Compare Models
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Model Comparison & Leaderboard\n",
            "We summarize performance across all models in a clean tabular layout."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 12: Code - Leaderboard Print
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "metrics_df = pd.DataFrame(results).T.drop(columns=['Pipeline'])\n",
            "print(\"=== Machine Failure Model Leaderboard ===\")\n",
            "display(metrics_df.sort_values(by=\"F1-Score\", ascending=False))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 13: Markdown - Export Model
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 6. Exporting Best Model\n",
            "We pick the best model from the leaderboard and save it as a serialized pickle file for inference."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 14: Code - Pickle Serialization
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Identify best model based on F1-Score\n",
            "best_model_name = metrics_df['F1-Score'].idxmax()\n",
            "best_pipeline = results[best_model_name]['Pipeline']\n",
            "\n",
            "print(f\"Best Model Selected: {best_model_name}\")\n",
            "\n",
            "# Export pipeline\n",
            "model_path = \"health_model.pkl\"\n",
            "with open(model_path, 'wb') as f:\n",
            "    pickle.dump(best_pipeline, f)\n",
            "\n",
            "print(f\"Serialized model successfully exported to: {os.path.abspath(model_path)}\")"
        ]
    })
    
    # Write notebook file
    nb_dict = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }
    
    target_path = os.path.join("notebooks", "04_machine_health_model.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
