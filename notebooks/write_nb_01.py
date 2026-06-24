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
            "## Notebook 01: Exploratory Data Analysis & Industrial Insights\n",
            "\n",
            "### Vision\n",
            "This notebook loads, inspects, and analyzes all the raw datasets for our Industrial Digital Twin platform. We explore schemas, statistics, missing values, and sensor correlation networks to extract actionable industrial insights.\n",
            "\n",
            "### Objectives\n",
            "1. **Load all datasets**: AI4I Predictive Maintenance, NASA Turbofan (C-MAPSS), Energy Consumption, Machine Utilization, Production Metrics, and Synthetic Factory Data.\n",
            "2. **Schema & Statistical Analysis**: Understand variables, types, ranges, and basic summary metrics.\n",
            "3. **Missing Value & Data Integrity Review**: Report null rates and check for duplicate values.\n",
            "4. **Visual Explorations**: Plot feature distributions, sensor correlations, failure distributions, and operational trends.\n",
            "5. **Industrial Insights**: Document key patterns and engineering implications."
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
            "import matplotlib.pyplot as plt\n",
            "import seaborn as sns\n",
            "import plotly.express as px\n",
            "import plotly.graph_objects as go\n",
            "\n",
            "# Configure visualization styles\n",
            "plt.style.use('seaborn-v0_8-whitegrid')\n",
            "sns.set_theme(style=\"whitegrid\", palette=\"muted\")\n",
            "plt.rcParams[\"figure.figsize\"] = (12, 6)\n",
            "plt.rcParams[\"font.size\"] = 10\n",
            "pd.set_option('display.max_columns', None)\n",
            "\n",
            "print(\"Libraries loaded successfully.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 3: Markdown - Data Loading Section
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 1. Data Loading & Verification\n",
            "We verify that the raw data folder exists and load each dataset. If any of the synthetic CSV files are empty, we invoke the `generate_synthetic_data` module to populate them."
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
            "# Check if synthetic data needs generation\n",
            "util_file = os.path.join(\"..\", \"datasets\", \"raw\", \"machine_utilization.csv\")\n",
            "if not os.path.exists(util_file) or os.path.getsize(util_file) == 0:\n",
            "    print(\"Synthetic files are empty or missing. Running generate_synthetic_data.py...\")\n",
            "    import subprocess\n",
            "    subprocess.run([\"python\", \"generate_synthetic_data.py\"], check=True)\n",
            "\n",
            "# Paths definition\n",
            "BASE_PATH = os.path.join(\"..\", \"datasets\", \"raw\")\n",
            "PM_PATH = os.path.join(BASE_PATH, \"ai4i_predictive_maintenance.csv\")\n",
            "NASA_DIR = os.path.join(BASE_PATH, \"nasa_turbofan\")\n",
            "ENERGY_PATH = os.path.join(BASE_PATH, \"energy_consumption.csv\")\n",
            "UTIL_PATH = os.path.join(BASE_PATH, \"machine_utilization.csv\")\n",
            "PROD_PATH = os.path.join(BASE_PATH, \"production_metrics.csv\")\n",
            "FACTORY_PATH = os.path.join(BASE_PATH, \"machine_sounds\", \"synthetic_factory_data.csv\")\n",
            "\n",
            "# Loading datasets\n",
            "print(\"Loading datasets...\")\n",
            "df_pm = pd.read_csv(PM_PATH)\n",
            "df_energy = pd.read_excel(ENERGY_PATH)\n",
            "df_util = pd.read_csv(UTIL_PATH)\n",
            "df_prod = pd.read_csv(PROD_PATH)\n",
            "df_factory = pd.read_csv(FACTORY_PATH)\n",
            "\n",
            "# NASA Turbofan (FD001 as reference)\n",
            "nasa_cols = ['unit_number', 'time_in_cycles', 'setting_1', 'setting_2', 'setting_3'] + [f'sensor_{i}' for i in range(1, 22)]\n",
            "df_nasa_train = pd.read_csv(os.path.join(NASA_DIR, \"train_FD001.txt\"), sep=r\"\\s+\", header=None, names=nasa_cols)\n",
            "df_nasa_test = pd.read_csv(os.path.join(NASA_DIR, \"test_FD001.txt\"), sep=r\"\\s+\", header=None, names=nasa_cols)\n",
            "df_nasa_rul = pd.read_csv(os.path.join(NASA_DIR, \"RUL_FD001.txt\"), sep=r\"\\s+\", header=None, names=['RUL'])\n",
            "\n",
            "print(\"All datasets loaded successfully.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 5: Markdown - Schema Analysis
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Schema and Dimensionality Analysis\n",
            "Let's review the dimensions and column schemas of each dataset in our digital twin architecture."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - Schema Print
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "datasets = {\n",
            "    \"Predictive Maintenance (AI4I)\": df_pm,\n",
            "    \"NASA Turbofan FD001 (Train)\": df_nasa_train,\n",
            "    \"Energy Consumption\": df_energy,\n",
            "    \"Machine Utilization\": df_util,\n",
            "    \"Production Metrics\": df_prod,\n",
            "    \"Synthetic Factory Data (Acoustic)\": df_factory\n",
            "}\n",
            "\n",
            "for name, df in datasets.items():\n",
            "    print(f\"=== {name} ===\")\n",
            "    print(f\"Shape: {df.shape}\")\n",
            "    print(f\"Columns: {list(df.columns)}\")\n",
            "    print(f\"Types: {df.dtypes.to_dict()}\")\n",
            "    print(\"-\" * 50)"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - Missing Value and Duplicate Report
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Data Integrity & Missing Values Report\n",
            "We inspect each dataset for missing values and duplicates to build an integrity report."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - Missing and Duplicates Check
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "for name, df in datasets.items():\n",
            "    nulls = df.isnull().sum()\n",
            "    null_pct = (nulls / len(df)) * 100\n",
            "    duplicates = df.duplicated().sum()\n",
            "    \n",
            "    print(f\"=== Data Integrity Report: {name} ===\")\n",
            "    print(f\"Duplicate Rows: {duplicates}\")\n",
            "    null_df = pd.DataFrame({'Null Count': nulls, 'Null Percentage': null_pct})\n",
            "    null_df = null_df[null_df['Null Count'] > 0]\n",
            "    if len(null_df) > 0:\n",
            "        print(\"Columns with missing values:\")\n",
            "        print(null_df)\n",
            "    else:\n",
            "        print(\"No missing values found.\")\n",
            "    print(\"-\" * 50)"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - Statistical Summary
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Statistical Summary\n",
            "Let's examine the distributions, ranges, and standard deviations of the datasets."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - Describe stats
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "print(\"AI4I Predictive Maintenance Descriptive Stats:\")\n",
            "display(df_pm.describe())\n",
            "\n",
            "print(\"\\nEnergy Efficiency (UCI) Descriptive Stats:\")\n",
            "display(df_energy.describe())\n",
            "\n",
            "print(\"\\nSynthetic Factory Data (Acoustic) Descriptive Stats:\")\n",
            "display(df_factory.describe())"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 11: Markdown - Visualizations Section
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Exploratory Visualizations\n",
            "Let's visualize distributions, target distributions, correlations, and relationships."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 12: Code - Visualizing Machine Failures
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Machine Failure and Modes in AI4I\n",
            "failure_modes = ['TWF', 'HDF', 'PWF', 'OSF', 'RNF']\n",
            "failure_counts = df_pm[failure_modes].sum()\n",
            "\n",
            "plt.figure(figsize=(10, 5))\n",
            "sns.barplot(x=failure_counts.index, y=failure_counts.values, hue=failure_counts.index, legend=False)\n",
            "plt.title('Distribution of Failure Modes (AI4I Dataset)')\n",
            "plt.ylabel('Occurrences')\n",
            "plt.xlabel('Failure Type')\n",
            "for idx, val in enumerate(failure_counts.values):\n",
            "    plt.text(idx, val + 2, str(val), ha='center', fontweight='bold')\n",
            "plt.tight_layout()\n",
            "plt.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 13: Code - Visualizing Correlation Heatmaps
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Correlation Matrix for AI4I continuous features\n",
            "num_cols_pm = ['Air temperature [K]', 'Process temperature [K]', 'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]', 'Machine failure']\n",
            "corr_pm = df_pm[num_cols_pm].corr()\n",
            "\n",
            "plt.figure(figsize=(8, 6))\n",
            "sns.heatmap(corr_pm, annot=True, cmap='coolwarm', fmt='.3f', linewidths=0.5)\n",
            "plt.title('Feature Correlations in AI4I Predictive Maintenance')\n",
            "plt.tight_layout()\n",
            "plt.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 14: Code - Visualizing Energy Features
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Energy Consumption distributions and correlations\n",
            "plt.figure(figsize=(12, 5))\n",
            "plt.subplot(1, 2, 1)\n",
            "sns.histplot(df_energy['Y1'], kde=True, color='blue', label='Heating Load (Y1)')\n",
            "sns.histplot(df_energy['Y2'], kde=True, color='orange', label='Cooling Load (Y2)')\n",
            "plt.title('Energy Load Distributions')\n",
            "plt.xlabel('Load Value')\n",
            "plt.legend()\n",
            "\n",
            "plt.subplot(1, 2, 2)\n",
            "sns.scatterplot(data=df_energy, x='X1', y='Y1', hue='X5', palette='viridis')\n",
            "plt.title('Relative Compactness (X1) vs Heating Load (Y1) by Height (X5)')\n",
            "plt.xlabel('Relative Compactness')\n",
            "plt.ylabel('Heating Load')\n",
            "\n",
            "plt.tight_layout()\n",
            "plt.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 15: Code - NASA Turbofan Sensor Profile
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Plot sample engine trajectories from NASA Turbofan\n",
            "sample_unit = 1\n",
            "df_unit = df_nasa_train[df_nasa_train['unit_number'] == sample_unit]\n",
            "\n",
            "fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)\n",
            "sensors_to_plot = ['sensor_2', 'sensor_7', 'sensor_11']\n",
            "sensor_labels = ['Inlet Temperature (Sensor 2)', 'Outlet Pressure (Sensor 7)', 'HPT Coolant Bleed (Sensor 11)']\n",
            "\n",
            "for idx, sensor in enumerate(sensors_to_plot):\n",
            "    axes[idx].plot(df_unit['time_in_cycles'], df_unit[sensor], color='darkred', lw=1.5)\n",
            "    axes[idx].set_ylabel(sensor_labels[idx])\n",
            "    axes[idx].grid(True)\n",
            "\n",
            "axes[2].set_xlabel('Cycles')\n",
            "plt.suptitle(f'NASA Turbofan C-MAPSS - Engine Unit {sample_unit} Sensor Trajectory', y=0.98, fontsize=14)\n",
            "plt.tight_layout()\n",
            "plt.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 16: Code - Acoustic Sensor Anomalies Plotly
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Plot Interactive Sound Frequency vs Noise Level with Plotly\n",
            "df_sample_fac = df_factory.sample(1000, random_state=42)\n",
            "fig = px.scatter(\n",
            "    df_sample_fac,\n",
            "    x=\"noise_level_db\",\n",
            "    y=\"sound_frequency_hz\",\n",
            "    color=\"anomaly_label\",\n",
            "    symbol=\"machine_id\",\n",
            "    title=\"Factory Acoustic Anomaly Exploration (Sampled)\",\n",
            "    labels={\n",
            "        \"noise_level_db\": \"Noise Level (dB)\",\n",
            "        \"sound_frequency_hz\": \"Dominant Frequency (Hz)\",\n",
            "        \"anomaly_label\": \"Anomaly Indicator\"\n",
            "    },\n",
            "    color_continuous_scale=[\"teal\", \"crimson\"]\n",
            ")\n",
            "fig.update_layout(template=\"plotly_white\")\n",
            "fig.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 17: Markdown - Industrial Insights
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 6. Industrial Insights Summary\n",
            "\n",
            "From our Exploratory Data Analysis, we extract several critical takeaways for the NexTwin AI Industrial Digital Twin system:\n",
            "\n",
            "1. **Predictive Maintenance (AI4I)**:\n",
            "   - Total machine failures occur in ~3.39% of the dataset (339/10000 records). This indicates class imbalance, requiring appropriate handling during modeling (e.g. class weights, SMOTE, or recall-oriented thresholds).\n",
            "   - There is a high correlation between `Torque [Nm]` and `Rotational speed [rpm]` (strong negative correlation, as torque increases, rotational speed drops). This physical relationship is standard in electric motors and can be exploited for feature engineering.\n",
            "\n",
            "2. **NASA Turbofan Degradation (C-MAPSS)**:\n",
            "   - Certain sensors (e.g., `sensor_2`, `sensor_7`, `sensor_11`) show clear trending behavior as the engine approaches its maximum operational cycles, representing useful life consumption. Sensor variance also tends to increase closer to failure, pointing to the value of rolling standard deviation features.\n",
            "\n",
            "3. **Energy Optimization**:\n",
            "   - In the energy dataset, building height (`X5`) splits the dataset into distinct energy profiles. Taller buildings (height = 7) show substantially higher heating (`Y1`) and cooling (`Y2`) loads, and their efficiency behavior changes based on compactness (`X1`).\n",
            "\n",
            "4. **Acoustic Sensor Anomalies**:\n",
            "   - Machine sound frequency and amplitude show visual clustering under normal operations. Anomalies are characterized by elevated noise levels (>90 dB) and sudden shifts in dominant frequency, indicating mechanical friction or component breakage."
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
    
    target_path = os.path.join("notebooks", "01_data_exploration.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
