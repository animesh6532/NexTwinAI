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
            "## Notebook 03: Industrial Feature Engineering & Health Scores\n",
            "\n",
            "### Objectives\n",
            "1. **Load Cleaned Datasets**: Load processed datasets from `datasets/processed/`.\n",
            "2. **Calculate Core Industrial Features**:\n",
            "   - **Machine Health Score**: Normalized composite health index (0 to 100).\n",
            "   - **Failure Risk Index**: Logistic stress-based failure probability (0 to 1).\n",
            "   - **Energy Efficiency Score**: Ratio of workload throughput to energy drawn.\n",
            "   - **Operational Efficiency Score**: Combination of availability, performance, and quality.\n",
            "   - **Downtime Risk**: Predictive risk indicator of sudden maintenance shutdown.\n",
            "   - **Remaining Useful Life (RUL) Indicators**: Engine degradation tracking for NASA Turbofan.\n",
            "   - **Bottleneck Severity Index**: Detect production line congestion points.\n",
            "   - **Throughput Efficiency**: Work order compliance metric.\n",
            "   - **Factory Health Score**: Unified enterprise-level dashboard health index.\n",
            "3. **Export Engineered Datasets**: Save data to `datasets/processed/` for model training."
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
            "import pandas as pd\n",
            "import numpy as np\n",
            "\n",
            "print(\"Libraries loaded successfully.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 3: Markdown - Loading Processed Data
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 1. Load Processed Datasets\n",
            "We load our cleaned files from `datasets/processed/`."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 4: Code - Loading Data
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "PROCESSED_DIR = os.path.join(\"..\", \"datasets\", \"processed\")\n",
            "\n",
            "df_pm = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_ai4i_predictive_maintenance.csv\"))\n",
            "df_energy = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_energy_consumption.csv\"))\n",
            "df_util = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_machine_utilization.csv\"))\n",
            "df_prod = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_production_metrics.csv\"))\n",
            "df_factory = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_synthetic_factory_data.csv\"))\n",
            "df_nasa_train = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_nasa_train_fd001.csv\"))\n",
            "\n",
            "print(\"Processed datasets loaded.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 5: Markdown - Machine Health Features
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Machine Health & Failure Risk Features (AI4I)\n",
            "We calculate the **Machine Health Score** and **Failure Risk Index** for the AI4I predictive maintenance dataset.\n",
            "\n",
            "- **Machine Health Score (MHS)**: Normal operating values are mapped between 0 and 100. Lower score means higher wear or thermal/torque stress.\n",
            "  $$MHS = 100 - \\left(0.3 \\times \\frac{\\text{tool\\_wear}}{240} + 0.4 \\times \\frac{|\\text{torque} - 40|}{40} + 0.3 \\times \\frac{\\text{process\\_temperature} - \\text{air\\_temperature}}{15}\\right) \\times 100$$\n",
            "  Values are clipped to range $[0, 100]$.\n",
            "\n",
            "- **Failure Risk Index (FRI)**: Sigmoid function mapping cumulative stress:\n",
            "  $$\\text{Stress} = 2.0 \\times \\text{wear\\_ratio} + 1.5 \\times \\text{torque\\_dev} + 3.0 \\times \\text{temp\\_diff}$$\n",
            "  $$FRI = \\frac{1}{1 + e^{-(\\text{Stress} - 2.5)}}$$"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - AI4I Feature Calculation
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# 1. Tool wear ratio\n",
            "tool_wear_ratio = np.clip(df_pm['tool_wear'] / 240.0, 0, 1)\n",
            "# 2. Torque deviation from ideal mean of 40\n",
            "torque_dev = np.clip(np.abs(df_pm['torque'] - 40.0) / 40.0, 0, 1)\n",
            "# 3. Process vs Air Temperature difference deviation (target differential is 10K)\n",
            "temp_diff = df_pm['process_temperature'] - df_pm['air_temperature']\n",
            "temp_diff_dev = np.clip(np.abs(temp_diff - 10.0) / 10.0, 0, 1)\n",
            "\n",
            "# Composite Health Score\n",
            "df_pm['machine_health_score'] = 100.0 - (0.3 * tool_wear_ratio + 0.4 * torque_dev + 0.3 * temp_diff_dev) * 100.0\n",
            "df_pm['machine_health_score'] = np.clip(df_pm['machine_health_score'], 0.0, 100.0)\n",
            "\n",
            "# Failure Risk Index\n",
            "stress = 2.0 * tool_wear_ratio + 1.5 * torque_dev + 3.0 * temp_diff_dev\n",
            "df_pm['failure_risk_index'] = 1.0 / (1.0 + np.exp(-stress + 2.5))\n",
            "\n",
            "print(\"AI4I Health Features calculated. Samples:\")\n",
            "display(df_pm[['machine_health_score', 'failure_risk_index', 'machine_failure']].head(5))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - Energy Efficiency features
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Energy Efficiency and Waste Features\n",
            "We construct metrics for the Energy Consumption dataset:\n",
            "- **Energy Efficiency Score**: Ratio of inverse thermal load, scaled 0 to 100.\n",
            "- **Energy Waste %**: Relative heat/cooling load deviation above the baseline efficient envelope (25th percentile of load)."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - Energy calculations
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Combined Thermal Load\n",
            "total_load = df_energy['heating_load'] + df_energy['cooling_load']\n",
            "df_energy['total_load'] = total_load\n",
            "\n",
            "# Energy Efficiency Score\n",
            "df_energy['energy_efficiency_score'] = 100.0 * (total_load.min() / total_load)\n",
            "\n",
            "# Energy Waste %\n",
            "baseline_load = total_load.quantile(0.25)\n",
            "df_energy['energy_waste_pct'] = np.clip(((total_load - baseline_load) / baseline_load) * 100.0, 0.0, 500.0)\n",
            "\n",
            "# Energy Optimization Score (inverse of waste)\n",
            "df_energy['energy_optimization_score'] = 100.0 - df_energy['energy_waste_pct']\n",
            "df_energy['energy_optimization_score'] = np.clip(df_energy['energy_optimization_score'], 0.0, 100.0)\n",
            "\n",
            "print(\"Energy metrics generated. Samples:\")\n",
            "display(df_energy[['total_load', 'energy_efficiency_score', 'energy_waste_pct', 'energy_optimization_score']].head(5))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - NASA Turbofan RUL Indicators
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Remaining Useful Life (RUL) Indicators (NASA Turbofan)\n",
            "For time-to-failure prediction on the NASA C-MAPSS dataset, we calculate the remaining useful life (in cycles) for each engine at each time index:\n",
            "$$RUL_{t, u} = MaxCycles_u - t$$\n",
            "We also build rolling sensor statistics (rolling mean and rolling standard deviation) to capture deterioration trends."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - NASA Turbofan Feature engineering
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Calculate max cycles for each unit\n",
            "max_cycles = df_nasa_train.groupby('unit_number')['time_in_cycles'].max().reset_index()\n",
            "max_cycles.columns = ['unit_number', 'max_cycles']\n",
            "\n",
            "# Merge back and calculate RUL\n",
            "df_nasa_train = df_nasa_train.merge(max_cycles, on='unit_number', how='left')\n",
            "df_nasa_train['rul'] = df_nasa_train['max_cycles'] - df_nasa_train['time_in_cycles']\n",
            "df_nasa_train = df_nasa_train.drop(columns=['max_cycles'])\n",
            "\n",
            "# Add rolling metrics for trending sensors (sensor_2, sensor_7, sensor_11)\n",
            "rolling_cols = ['sensor_2', 'sensor_7', 'sensor_11']\n",
            "for col in rolling_cols:\n",
            "    # Rolling mean (window of 5 cycles)\n",
            "    df_nasa_train[f'{col}_roll_mean_5'] = df_nasa_train.groupby('unit_number')[col].transform(lambda x: x.rolling(window=5, min_periods=1).mean())\n",
            "    # Rolling standard deviation\n",
            "    df_nasa_train[f'{col}_roll_std_5'] = df_nasa_train.groupby('unit_number')[col].transform(lambda x: x.rolling(window=5, min_periods=1).std().fillna(0))\n",
            "\n",
            "print(\"NASA Turbofan RUL features engineered. Samples:\")\n",
            "display(df_nasa_train[['unit_number', 'time_in_cycles', 'rul', 'sensor_2_roll_mean_5', 'sensor_2_roll_std_5']].head(5))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 11: Markdown - Manufacturing and Bottleneck Features
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Manufacturing Operations, Bottlenecks, & Factory Health Scores\n",
            "Here we combine the utilization and production logs, map machines to production lines, and calculate industrial operational efficiency, bottlenecks, and downtime risks:\n",
            "- **Machine to Line Mapping**:\n",
            "  - Machine `M_001` and `M_002` map to `Line_A`.\n",
            "  - Machine `M_003` maps to `Line_B`.\n",
            "- **Throughput Efficiency**: $\\text{Actual Quantity} / \\text{Target Quantity}$.\n",
            "- **Operational Efficiency Score**: $\\text{OEE} \\times \\text{Throughput Efficiency} \\times \\text{Utilization}$.\n",
            "- **Bottleneck Severity Index**: Scale of 0-100 indicating congestion based on high utilization, low operational efficiency, and high defect rate.\n",
            "- **Downtime Risk**: Risk of unexpected machine failure due to stress.\n",
            "- **Factory Health Score**: Combined corporate score aggregating machine health and operational efficiency."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 12: Code - Manufacturing merging and calculations
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Create machine to line mapping\n",
            "m_to_l = {\"M_001\": \"Line_A\", \"M_002\": \"Line_A\", \"M_003\": \"Line_B\"}\n",
            "df_util['line_id'] = df_util['machine_id'].map(m_to_l)\n",
            "\n",
            "# Merge utilization and production metrics on timestamp and line_id\n",
            "df_mfg = pd.merge(df_util, df_prod, on=['timestamp', 'line_id'], how='inner')\n",
            "\n",
            "# Merge factory acoustic/physical sensor logs as well\n",
            "df_mfg = pd.merge(df_mfg, df_factory, on=['timestamp', 'machine_id'], how='inner')\n",
            "\n",
            "# Calculate Throughput Efficiency\n",
            "df_mfg['throughput_efficiency'] = df_mfg['actual_quantity'] / df_mfg['target_quantity']\n",
            "df_mfg['throughput_efficiency'] = np.clip(df_mfg['throughput_efficiency'], 0.0, 2.0)\n",
            "\n",
            "# Calculate Operational Efficiency Score (OES)\n",
            "df_mfg['operational_efficiency_score'] = df_mfg['oee'] * df_mfg['throughput_efficiency'] * (df_mfg['utilization_rate'] / 100.0) * 100.0\n",
            "df_mfg['operational_efficiency_score'] = np.clip(df_mfg['operational_efficiency_score'], 0.0, 100.0)\n",
            "\n",
            "# Calculate Downtime Risk (probability 0 to 1 based on stress indicators)\n",
            "# Stress increases with high temperature, vibration, and low cycle time\n",
            "mfg_stress = (df_mfg['vibration_mm_s'] / 4.0) + (df_mfg['temperature_c'] - 60.0) / 15.0 + (df_mfg['defect_count'] / 5.0)\n",
            "df_mfg['downtime_risk'] = 1.0 / (1.0 + np.exp(-mfg_stress + 2.0))\n",
            "\n",
            "# Calculate Bottleneck Severity Index (0 to 100)\n",
            "# Higher when utilization is high but OEE is low and defects are high\n",
            "df_mfg['bottleneck_severity_index'] = (df_mfg['utilization_rate'] / 100.0) * (1.0 - df_mfg['oee']) * (1.0 + df_mfg['defect_count'] / (df_mfg['actual_quantity'] + 1)) * 100.0\n",
            "df_mfg['bottleneck_severity_index'] = np.clip(df_mfg['bottleneck_severity_index'], 0.0, 100.0)\n",
            "\n",
            "# Calculate Machine-level Health Score (simulated dynamically using sensor readings)\n",
            "sensor_health_ratio = 1.0 - (0.4 * (df_mfg['vibration_mm_s'] / 5.0) + 0.3 * (df_mfg['temperature_c'] / 90.0) + 0.3 * (df_mfg['noise_level_db'] / 95.0))\n",
            "df_mfg['machine_health_score'] = np.clip(sensor_health_ratio * 100.0, 0.0, 100.0)\n",
            "\n",
            "# Calculate Factory Health Score (FHS) - aggregated over time\n",
            "# FHS = mean(Machine Health) * mean(Throughput Efficiency) * (1 - mean(Downtime Risk))\n",
            "# For timeseries representation, we make a rolling factory-wide health score\n",
            "df_mfg['factory_health_score'] = df_mfg['machine_health_score'] * df_mfg['throughput_efficiency'] * (1.0 - df_mfg['downtime_risk'])\n",
            "df_mfg['factory_health_score'] = np.clip(df_mfg['factory_health_score'], 0.0, 100.0)\n",
            "\n",
            "print(\"Manufacturing integrated features engineered. Shape:\", df_mfg.shape)\n",
            "display(df_mfg[['machine_id', 'throughput_efficiency', 'operational_efficiency_score', 'downtime_risk', 'bottleneck_severity_index', 'factory_health_score']].head(5))"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 13: Markdown - Saving Engineered Datasets
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 6. Save Engineered Datasets\n",
            "We export the final datasets with all engineered industrial features."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 14: Code - Saving files
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "df_pm.to_csv(os.path.join(PROCESSED_DIR, \"engineered_machine_health.csv\"), index=False)\n",
            "df_energy.to_csv(os.path.join(PROCESSED_DIR, \"engineered_energy.csv\"), index=False)\n",
            "df_mfg.to_csv(os.path.join(PROCESSED_DIR, \"engineered_mfg_bottleneck.csv\"), index=False)\n",
            "df_nasa_train.to_csv(os.path.join(PROCESSED_DIR, \"engineered_nasa_train_fd001.csv\"), index=False)\n",
            "\n",
            "print(\"Engineered datasets saved successfully. Ready for machine learning modeling.\")"
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
    
    target_path = os.path.join("notebooks", "03_feature_engineering.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
