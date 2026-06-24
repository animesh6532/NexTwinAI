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
            "## Notebook 06: Energy Consumption & Optimization Model\n",
            "\n",
            "### Objectives\n",
            "1. **Load Engineered Dataset**: Load `engineered_energy.csv`.\n",
            "2. **Predict Thermal Loads & Waste**:\n",
            "   - Predict `heating_load` and `cooling_load` (Multi-output Regression).\n",
            "   - Predict `energy_waste_pct` and `energy_optimization_score`.\n",
            "3. **Train Models**: Train XGBoost and LightGBM regressors.\n",
            "4. **Build Recommendation Engine**: Formulate rules to suggest building attribute modifications that lower heating/cooling load.\n",
            "5. **Export Best Models**: Export serialized pipeline as `energy_model.pkl`."
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
            "from sklearn.preprocessing import StandardScaler\n",
            "from sklearn.pipeline import Pipeline\n",
            "from sklearn.multioutput import MultiOutputRegressor\n",
            "from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error\n",
            "from xgboost import XGBRegressor\n",
            "from lightgbm import LGBMRegressor\n",
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
            "## 1. Load Data & Prepare Splits\n",
            "We load the energy efficiency dataset and divide it into features and multi-output/single-output regression targets."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 4: Code - Data Loading
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "PROCESSED_DIR = os.path.join(\"..\", \"datasets\", \"processed\")\n",
            "df = pd.read_csv(os.path.join(PROCESSED_DIR, \"engineered_energy.csv\"))\n",
            "\n",
            "# Define features\n",
            "feature_cols = [\n",
            "    'relative_compactness', 'surface_area', 'wall_area', 'roof_area', \n",
            "    'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'\n",
            "]\n",
            "\n",
            "X = df[feature_cols]\n",
            "# Multi-output targets: heating and cooling loads\n",
            "y_loads = df[['heating_load', 'cooling_load']]\n",
            "# Optimization target\n",
            "y_waste = df['energy_waste_pct']\n",
            "y_opt = df['energy_optimization_score']\n",
            "\n",
            "# Split data (80/20)\n",
            "X_train, X_test, y_train_loads, y_test_loads = train_test_split(X, y_loads, test_size=0.2, random_state=42)\n",
            "_, _, y_train_waste, y_test_waste = train_test_split(X, y_waste, test_size=0.2, random_state=42)\n",
            "_, _, y_train_opt, y_test_opt = train_test_split(X, y_opt, test_size=0.2, random_state=42)\n",
            "\n",
            "print(f\"Training features shape: {X_train.shape}\")\n",
            "print(f\"Testing features shape: {X_test.shape}\")"
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
            "We scale continuous variables to ensure stable convergence."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - Preprocessing Setup
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "preprocessor = StandardScaler()\n",
            "print(\"Scaler pipeline initialized.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - Model Training Section
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Train Multi-Output Thermal Load Models\n",
            "We train XGBoost and LightGBM wrapper pipelines to predict both heating and cooling load simultaneously."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - Multi-Output Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "models = {\n",
            "    \"XGBoost Multi-Output\": MultiOutputRegressor(XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)),\n",
            "    \"LightGBM Multi-Output\": MultiOutputRegressor(LGBMRegressor(n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1))\n",
            "}\n",
            "\n",
            "load_results = {}\n",
            "\n",
            "for name, model in models.items():\n",
            "    pipeline = Pipeline(steps=[\n",
            "        ('preprocessor', preprocessor),\n",
            "        ('regressor', model)\n",
            "    ])\n",
            "    \n",
            "    pipeline.fit(X_train, y_train_loads)\n",
            "    y_pred = pipeline.predict(X_test)\n",
            "    \n",
            "    # Metrics for heating load (col 0) and cooling load (col 1)\n",
            "    rmse_y1 = np.sqrt(mean_squared_error(y_test_loads.iloc[:, 0], y_pred[:, 0]))\n",
            "    rmse_y2 = np.sqrt(mean_squared_error(y_test_loads.iloc[:, 1], y_pred[:, 1]))\n",
            "    r2_y1 = r2_score(y_test_loads.iloc[:, 0], y_pred[:, 0])\n",
            "    r2_y2 = r2_score(y_test_loads.iloc[:, 1], y_pred[:, 1])\n",
            "    \n",
            "    load_results[name] = {\n",
            "        \"Heating R2\": r2_y1,\n",
            "        \"Cooling R2\": r2_y2,\n",
            "        \"Mean R2\": (r2_y1 + r2_y2)/2,\n",
            "        \"Pipeline\": pipeline\n",
            "    }\n",
            "    \n",
            "    print(f\"=== {name} ===\")\n",
            "    print(f\"  Heating Load: R2 = {r2_y1:.4f}, RMSE = {rmse_y1:.4f}\")\n",
            "    print(f\"  Cooling Load: R2 = {r2_y2:.4f}, RMSE = {rmse_y2:.4f}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - Predict Waste & Optimization Score
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Train Energy Waste & Optimization Score Regressors\n",
            "We fit models to predict `energy_waste_pct` and `energy_optimization_score` directly."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - Waste Regressor Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "waste_models = {\n",
            "    \"XGBoost Waste\": XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42),\n",
            "    \"LightGBM Waste\": LGBMRegressor(n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1)\n",
            "}\n",
            "\n",
            "waste_results = {}\n",
            "for name, model in waste_models.items():\n",
            "    pipeline_w = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', model)])\n",
            "    pipeline_w.fit(X_train, y_train_waste)\n",
            "    y_pred_w = pipeline_w.predict(X_test)\n",
            "    r2_w = r2_score(y_test_waste, y_pred_w)\n",
            "    \n",
            "    pipeline_o = Pipeline(steps=[('preprocessor', preprocessor), ('regressor', model)])\n",
            "    pipeline_o.fit(X_train, y_train_opt)\n",
            "    y_pred_o = pipeline_o.predict(X_test)\n",
            "    r2_o = r2_score(y_test_opt, y_pred_o)\n",
            "    \n",
            "    waste_results[name] = {\n",
            "        \"Waste R2\": r2_w,\n",
            "        \"Optimization Score R2\": r2_o,\n",
            "        \"Pipeline_Waste\": pipeline_w,\n",
            "        \"Pipeline_Opt\": pipeline_o\n",
            "    }\n",
            "    print(f\"{name} - Waste R2: {r2_w:.4f}, Optimization R2: {r2_o:.4f}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 11: Markdown - Recommendation Engine Section
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Industrial Optimization Recommendation Engine\n",
            "We construct a recommendation class that evaluates building characteristics and suggests parameter adjustments (e.g. lowering glazing area or changing compactness/height ratio) to reduce energy loads."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 12: Code - Recommendation Class
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "class EnergyOptimizationAdvisor:\n",
            "    def __init__(self, load_model):\n",
            "        self.model = load_model\n",
            "        \n",
            "    def advise(self, building_features):\n",
            "        # Predict baseline loads\n",
            "        input_df = pd.DataFrame([building_features])\n",
            "        pred_loads = self.model.predict(input_df)[0]\n",
            "        base_heating, base_cooling = pred_loads[0], pred_loads[1]\n",
            "        base_total = base_heating + base_cooling\n",
            "        \n",
            "        recommendations = []\n",
            "        \n",
            "        # Rule 1: High Glazing\n",
            "        if building_features['glazing_area'] > 0.25:\n",
            "            # Simulate lowering glazing to 0.1\n",
            "            sim_features = building_features.copy()\n",
            "            sim_features['glazing_area'] = 0.1\n",
            "            sim_df = pd.DataFrame([sim_features])\n",
            "            sim_loads = self.model.predict(sim_df)[0]\n",
            "            savings = base_total - (sim_loads[0] + sim_loads[1])\n",
            "            if savings > 0:\n",
            "                recommendations.append({\n",
            "                    \"action\": \"Reduce glazing area window ratio from current value to 10%\",\n",
            "                    \"estimated_thermal_load_savings_kw\": round(savings, 2),\n",
            "                    \"priority\": \"High\" if savings > 5 else \"Medium\"\n",
            "                })\n",
            "                \n",
            "        # Rule 2: Large Roof Area / Height\n",
            "        if building_features['overall_height'] > 5.0 and building_features['roof_area'] > 200.0:\n",
            "            sim_features = building_features.copy()\n",
            "            sim_features['overall_height'] = 3.5\n",
            "            sim_features['roof_area'] = 150.0\n",
            "            sim_df = pd.DataFrame([sim_features])\n",
            "            sim_loads = self.model.predict(sim_df)[0]\n",
            "            savings = base_total - (sim_loads[0] + sim_loads[1])\n",
            "            if savings > 0:\n",
            "                recommendations.append({\n",
            "                    \"action\": \"Redesign layout for a lower height profile (3.5m) and optimized roof span\",\n",
            "                    \"estimated_thermal_load_savings_kw\": round(savings, 2),\n",
            "                    \"priority\": \"Medium\"\n",
            "                })\n",
            "                \n",
            "        if len(recommendations) == 0:\n",
            "            recommendations.append({\n",
            "                \"action\": \"No immediate building layout modification required. Maintain current thermal envelope.\",\n",
            "                \"estimated_thermal_load_savings_kw\": 0.0,\n",
            "                \"priority\": \"Low\"\n",
            "            })\n",
            "            \n",
            "        return {\n",
            "            \"baseline_heating_load\": round(base_heating, 2),\n",
            "            \"baseline_cooling_load\": round(base_cooling, 2),\n",
            "            \"baseline_total_load\": round(base_total, 2),\n",
            "            \"recommendations\": recommendations\n",
            "        }\n",
            "\n",
            "# Instantiate advisor\n",
            "best_load_model_name = max(load_results, key=lambda k: load_results[k]['Mean R2'])\n",
            "best_load_pipeline = load_results[best_load_model_name]['Pipeline']\n",
            "\n",
            "advisor = EnergyOptimizationAdvisor(best_load_pipeline)\n",
            "sample_building = X_test.iloc[0].to_dict()\n",
            "advice = advisor.advise(sample_building)\n",
            "print(\"Sample building optimization analysis:\")\n",
            "import pprint\n",
            "pprint.pprint(advice)"
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
            "We bundle the best load, waste, and optimization score pipelines into a wrapper dict and export it."
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
            "best_waste_model_name = max(waste_results, key=lambda k: waste_results[k]['Waste R2'])\n",
            "best_waste_pipeline = waste_results[best_waste_model_name]['Pipeline_Waste']\n",
            "best_opt_pipeline = waste_results[best_waste_model_name]['Pipeline_Opt']\n",
            "\n",
            "energy_package = {\n",
            "    'load_model': best_load_pipeline,\n",
            "    'waste_model': best_waste_pipeline,\n",
            "    'optimization_model': best_opt_pipeline\n",
            "}\n",
            "\n",
            "model_path = \"energy_model.pkl\"\n",
            "with open(model_path, 'wb') as f:\n",
            "    pickle.dump(energy_package, f)\n",
            "\n",
            "print(f\"Serialized energy models package exported to: {os.path.abspath(model_path)}\")"
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
    
    target_path = os.path.join("notebooks", "06_energy_model.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
