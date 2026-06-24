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
            "## Notebook 05: Production Bottleneck Prediction Model\n",
            "\n",
            "### Objectives\n",
            "1. **Load Integrated Dataset**: Load `engineered_mfg_bottleneck.csv` containing blended utilization, production, and sensor logs.\n",
            "2. **Predict Bottleneck Indicators**:\n",
            "   - **Bottleneck Risk Score**: Predict the `bottleneck_severity_index` (Regression).\n",
            "   - **Production Delay**: Predict `production_delay` (Regression, computed as `target_quantity - actual_quantity`).\n",
            "   - **Congestion Risk**: Predict high congestion states (Classification, `utilization_rate > 90%`).\n",
            "3. **Train Models**: Train Random Forest and XGBoost regressor and classifier models.\n",
            "4. **Evaluate Performance**: Compute R2, RMSE for regression targets, and Accuracy/ROC-AUC for classification targets.\n",
            "5. **Export Best Models**: Export a serialized pipeline as `bottleneck_model.pkl` containing the best regression models."
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
            "from sklearn.model_selection import train_test_split\n",
            "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n",
            "from sklearn.compose import ColumnTransformer\n",
            "from sklearn.pipeline import Pipeline\n",
            "from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier\n",
            "from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error, accuracy_score, classification_report, roc_auc_score\n",
            "from xgboost import XGBRegressor, XGBClassifier\n",
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
            "## 1. Load Data & Prepare Targets\n",
            "We load the integrated manufacturing dataset and construct our targets:\n",
            "1. `bottleneck_severity_index` (continuous target)\n",
            "2. `production_delay` = `target_quantity - actual_quantity` (continuous target)\n",
            "3. `congestion_risk` = `1` if `utilization_rate > 90` else `0` (binary classification target)"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 4: Code - Preparing Datasets
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "PROCESSED_DIR = os.path.join(\"..\", \"datasets\", \"processed\")\n",
            "df = pd.read_csv(os.path.join(PROCESSED_DIR, \"engineered_mfg_bottleneck.csv\"))\n",
            "\n",
            "# Calculate production delay\n",
            "df['production_delay'] = df['target_quantity'] - df['actual_quantity']\n",
            "# Define congestion risk binary target\n",
            "df['congestion_risk'] = (df['utilization_rate'] > 90.0).astype(int)\n",
            "\n",
            "# Feature columns\n",
            "feature_cols = [\n",
            "    'machine_id', 'vibration_mm_s', 'temperature_c', 'pressure_bar',\n",
            "    'noise_level_db', 'sound_frequency_hz', 'sound_amplitude',\n",
            "    'defect_count', 'energy_draw_kw'\n",
            "]\n",
            "\n",
            "X = df[feature_cols]\n",
            "y_bottleneck = df['bottleneck_severity_index']\n",
            "y_delay = df['production_delay']\n",
            "y_congestion = df['congestion_risk']\n",
            "\n",
            "# Train-test splits for each target\n",
            "X_train, X_test, y_train_b, y_test_b = train_test_split(X, y_bottleneck, test_size=0.2, random_state=42)\n",
            "_, _, y_train_d, y_test_d = train_test_split(X, y_delay, test_size=0.2, random_state=42)\n",
            "_, _, y_train_c, y_test_c = train_test_split(X, y_congestion, test_size=0.2, random_state=42, stratify=y_congestion)\n",
            "\n",
            "print(\"Train-test splits completed successfully.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 5: Markdown - Define Preprocessing Pipeline
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Define Preprocessing Pipeline\n",
            "We scale continuous variables and one-hot encode `machine_id`."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - Preprocessing Pipeline
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "num_cols = ['vibration_mm_s', 'temperature_c', 'pressure_bar', 'noise_level_db', 'sound_frequency_hz', 'sound_amplitude', 'defect_count', 'energy_draw_kw']\n",
            "cat_cols = ['machine_id']\n",
            "\n",
            "preprocessor = ColumnTransformer(transformers=[\n",
            "    ('num', StandardScaler(), num_cols),\n",
            "    ('cat', OneHotEncoder(drop='first'), cat_cols)\n",
            "])\n",
            "\n",
            "print(\"Preprocessor pipeline ready.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - Model Training Regression
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Train Bottleneck Severity Regressors\n",
            "We train Random Forest and XGBoost regressors to predict the continuous Bottleneck Severity Index."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - Regressor Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "reg_models = {\n",
            "    \"Random Forest Regressor\": RandomForestRegressor(n_estimators=100, random_state=42),\n",
            "    \"XGBoost Regressor\": XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)\n",
            "}\n",
            "\n",
            "reg_results = {}\n",
            "\n",
            "for name, model in reg_models.items():\n",
            "    pipeline = Pipeline(steps=[\n",
            "        ('preprocessor', preprocessor),\n",
            "        ('regressor', model)\n",
            "    ])\n",
            "    \n",
            "    pipeline.fit(X_train, y_train_b)\n",
            "    y_pred = pipeline.predict(X_test)\n",
            "    \n",
            "    rmse = np.sqrt(mean_squared_error(y_test_b, y_pred))\n",
            "    mae = mean_absolute_error(y_test_b, y_pred)\n",
            "    r2 = r2_score(y_test_b, y_pred)\n",
            "    \n",
            "    reg_results[name] = {\n",
            "        \"RMSE\": rmse,\n",
            "        \"MAE\": mae,\n",
            "        \"R2-Score\": r2,\n",
            "        \"Pipeline\": pipeline\n",
            "    }\n",
            "    \n",
            "    print(f\"=== {name} Bottleneck Severity evaluation ===\")\n",
            "    print(f\"  RMSE: {rmse:.4f}\")\n",
            "    print(f\"  MAE:  {mae:.4f}\")\n",
            "    print(f\"  R2:   {r2:.4f}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - Production Delay Regressor
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Train Production Delay Regressors\n",
            "We fit models to predict `production_delay`."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - Delay Regressor Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "delay_results = {}\n",
            "\n",
            "for name, model in reg_models.items():\n",
            "    pipeline = Pipeline(steps=[\n",
            "        ('preprocessor', preprocessor),\n",
            "        ('regressor', model)\n",
            "    ])\n",
            "    \n",
            "    pipeline.fit(X_train, y_train_d)\n",
            "    y_pred = pipeline.predict(X_test)\n",
            "    \n",
            "    rmse = np.sqrt(mean_squared_error(y_test_d, y_pred))\n",
            "    r2 = r2_score(y_test_d, y_pred)\n",
            "    \n",
            "    delay_results[name] = {\n",
            "        \"RMSE\": rmse,\n",
            "        \"R2-Score\": r2,\n",
            "        \"Pipeline\": pipeline\n",
            "    }\n",
            "    print(f\"{name} Production Delay R2: {r2:.4f}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 11: Markdown - Congestion Risk Classifier
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Congestion Risk Classifiers\n",
            "We train XGBoost and Random Forest classifiers to flag high Congestion Risk."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 12: Code - Congestion Classifier Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "clf_models = {\n",
            "    \"Random Forest Classifier\": RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42),\n",
            "    \"XGBoost Classifier\": XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, eval_metric='logloss')\n",
            "}\n",
            "\n",
            "clf_results = {}\n",
            "\n",
            "for name, model in clf_models.items():\n",
            "    pipeline = Pipeline(steps=[\n",
            "        ('preprocessor', preprocessor),\n",
            "        ('classifier', model)\n",
            "    ])\n",
            "    \n",
            "    pipeline.fit(X_train, y_train_c)\n",
            "    y_pred = pipeline.predict(X_test)\n",
            "    y_proba = pipeline.predict_proba(X_test)[:, 1]\n",
            "    \n",
            "    acc = accuracy_score(y_test_c, y_pred)\n",
            "    roc = roc_auc_score(y_test_c, y_proba)\n",
            "    \n",
            "    clf_results[name] = {\n",
            "        \"Accuracy\": acc,\n",
            "        \"ROC-AUC\": roc,\n",
            "        \"Pipeline\": pipeline\n",
            "    }\n",
            "    print(f\"=== {name} Congestion Risk Evaluation ===\")\n",
            "    print(classification_report(y_test_c, y_pred))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 13: Markdown - Saving Model
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 6. Export Serialized Models\n",
            "We group the best performing models into a unified python wrapper dict and export it as `bottleneck_model.pkl`."
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
            "# Find best regressor for Bottleneck Score\n",
            "best_reg_name = max(reg_results, key=lambda k: reg_results[k]['R2-Score'])\n",
            "best_reg_pipeline = reg_results[best_reg_name]['Pipeline']\n",
            "\n",
            "# Find best regressor for Delay\n",
            "best_delay_name = max(delay_results, key=lambda k: delay_results[k]['R2-Score'])\n",
            "best_delay_pipeline = delay_results[best_delay_name]['Pipeline']\n",
            "\n",
            "# Find best classifier for Congestion\n",
            "best_clf_name = max(clf_results, key=lambda k: clf_results[k]['ROC-AUC'])\n",
            "best_clf_pipeline = clf_results[best_clf_name]['Pipeline']\n",
            "\n",
            "print(f\"Selected Bottleneck Regressor: {best_reg_name}\")\n",
            "print(f\"Selected Delay Regressor:      {best_delay_name}\")\n",
            "print(f\"Selected Congestion Classifier: {best_clf_name}\")\n",
            "\n",
            "bottleneck_package = {\n",
            "    'bottleneck_regressor': best_reg_pipeline,\n",
            "    'delay_regressor': best_delay_pipeline,\n",
            "    'congestion_classifier': best_clf_pipeline\n",
            "}\n",
            "\n",
            "model_path = \"bottleneck_model.pkl\"\n",
            "with open(model_path, 'wb') as f:\n",
            "    pickle.dump(bottleneck_package, f)\n",
            "\n",
            "print(f\"Serialized bottleneck package exported to: {os.path.abspath(model_path)}\")"
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
    
    target_path = os.path.join("notebooks", "05_bottleneck_model.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
