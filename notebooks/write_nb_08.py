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
            "## Notebook 08: Time-Series Forecasting (30 and 90 Days)\n",
            "\n",
            "### Objectives\n",
            "1. **Aggregate Datasets**: Summarize manufacturing and energy datasets to a daily level to plan 30 and 90-day operational capacity.\n",
            "2. **Implement Timeseries Forecasting Models**:\n",
            "   - **Prophet** (Meta) to forecast daily **Production Throughput** (`actual_quantity`).\n",
            "   - **XGBoost Regressor** (with Auto-regressive Lags) to forecast daily **Energy Load** (`total_load`).\n",
            "   - **Deep LSTM** (PyTorch Recurrent Neural Network) to forecast daily **Machine Utilization** (`utilization_rate`).\n",
            "3. **Forecast Horizon**: Generate 30-day and 90-day future forecasts with uncertainty bounds.\n",
            "4. **Visualizations**: Use Plotly to draw interactive forecasting curves showing trends and projections."
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
            "import torch\n",
            "import torch.nn as nn\n",
            "from prophet import Prophet\n",
            "from xgboost import XGBRegressor\n",
            "from sklearn.preprocessing import MinMaxScaler\n",
            "import plotly.graph_objects as go\n",
            "\n",
            "import logging\n",
            "logging.getLogger('prophet').setLevel(logging.WARNING)\n",
            "logging.getLogger('cmdstanpy').setLevel(logging.WARNING)\n",
            "\n",
            "torch.manual_seed(42)\n",
            "np.random.seed(42)\n",
            "\n",
            "print(\"Timeseries libraries loaded successfully.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 3: Markdown - Data Aggregation
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 1. Load Data & Daily Aggregation\n",
            "To remove hourly noise and align with mid-term factory planning, we aggregate the metrics by day."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 4: Code - Data Aggregation
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "PROCESSED_DIR = os.path.join(\"..\", \"datasets\", \"processed\")\n",
            "df_mfg = pd.read_csv(os.path.join(PROCESSED_DIR, \"engineered_mfg_bottleneck.csv\"))\n",
            "df_energy = pd.read_csv(os.path.join(PROCESSED_DIR, \"engineered_energy.csv\"))\n",
            "\n",
            "# 1. Production Throughput Daily aggregation\n",
            "df_mfg['date'] = pd.to_datetime(df_mfg['timestamp']).dt.date\n",
            "df_daily_prod = df_mfg.groupby('date')['actual_quantity'].sum().reset_index()\n",
            "df_daily_prod.columns = ['ds', 'y']\n",
            "df_daily_prod['ds'] = pd.to_datetime(df_daily_prod['ds'])\n",
            "\n",
            "# 2. Utilization Daily aggregation\n",
            "df_daily_util = df_mfg.groupby('date')['utilization_rate'].mean().reset_index()\n",
            "df_daily_util.columns = ['date', 'utilization']\n",
            "df_daily_util['date'] = pd.to_datetime(df_daily_util['date'])\n",
            "\n",
            "# 3. Energy Daily load\n",
            "# Since the energy efficiency dataset has no implicit date index, we generate a daily date range index for it\n",
            "date_index = pd.date_range(start=\"2026-03-24\", periods=len(df_energy), freq='D')\n",
            "df_energy['ds'] = date_index\n",
            "df_daily_energy = df_energy[['ds', 'total_load']].copy()\n",
            "df_daily_energy.columns = ['date', 'energy']\n",
            "\n",
            "print(f\"Daily Production points: {len(df_daily_prod)}\")\n",
            "print(f\"Daily Utilization points: {len(df_daily_util)}\")\n",
            "print(f\"Daily Energy points:      {len(df_daily_energy)}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 5: Markdown - Prophet Production Forecasting
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Production Throughput Forecasting (Prophet)\n",
            "We fit a Prophet model on the daily production series and predict the next 90 days."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - Prophet Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "m = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=True)\n",
            "m.fit(df_daily_prod)\n",
            "\n",
            "# Predict 90 days ahead\n",
            "future = m.make_future_dataframe(periods=90, freq='D')\n",
            "forecast_prophet = m.predict(future)\n",
            "\n",
            "# Plot results interactively\n",
            "fig = go.Figure()\n",
            "fig.add_trace(go.Scatter(x=df_daily_prod['ds'], y=df_daily_prod['y'], name='Historical Actual', mode='markers+lines', line=dict(color='black')))\n",
            "fig.add_trace(go.Scatter(x=forecast_prophet['ds'], y=forecast_prophet['yhat'], name='Forecasted (Mean)', mode='lines', line=dict(color='blue')))\n",
            "fig.add_trace(go.Scatter(\n",
            "    x=pd.concat([forecast_prophet['ds'], forecast_prophet['ds'][::-1]]),\n",
            "    y=pd.concat([forecast_prophet['yhat_upper'], forecast_prophet['yhat_lower'][::-1]]),\n",
            "    fill='toself',\n",
            "    fillcolor='rgba(0, 0, 255, 0.1)',\n",
            "    line=dict(color='rgba(0,0,0,0)'),\n",
            "    name='Confidence Interval'\n",
            "))\n",
            "fig.update_layout(title=\"90-Day Daily Production Throughput Forecast (Prophet)\", xaxis_title=\"Date\", yaxis_title=\"Units Produced\", template=\"plotly_white\")\n",
            "fig.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - XGBoost Energy Forecasting
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Daily Energy Usage Forecasting (XGBoost with Lags)\n",
            "We construct auto-regressive lags (lag 1, lag 7, lag 14) to predict future energy loads with XGBoost in a recursive fashion."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - XGBoost Training & Recursive Forecasting
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Create copy and generate lag features\n",
            "df_xg = df_daily_energy.copy()\n",
            "df_xg['lag_1'] = df_xg['energy'].shift(1)\n",
            "df_xg['lag_7'] = df_xg['energy'].shift(7)\n",
            "df_xg['lag_14'] = df_xg['energy'].shift(14)\n",
            "df_xg = df_xg.dropna().reset_index(drop=True)\n",
            "\n",
            "X = df_xg[['lag_1', 'lag_7', 'lag_14']]\n",
            "y = df_xg['energy']\n",
            "\n",
            "# Train model\n",
            "xgb_ts = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)\n",
            "xgb_ts.fit(X, y)\n",
            "\n",
            "# Recursive multi-step forecast\n",
            "history = list(df_daily_energy['energy'].values)\n",
            "forecast_xgb = []\n",
            "\n",
            "for i in range(90):\n",
            "    # Extract lags\n",
            "    lag_1 = history[-1]\n",
            "    lag_7 = history[-7]\n",
            "    lag_14 = history[-14]\n",
            "    \n",
            "    pred = xgb_ts.predict(np.array([[lag_1, lag_7, lag_14]]))[0]\n",
            "    forecast_xgb.append(pred)\n",
            "    history.append(pred)\n",
            "\n",
            "# Compile future dates\n",
            "last_date = df_daily_energy['date'].max()\n",
            "future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=90, freq='D')\n",
            "\n",
            "fig = go.Figure()\n",
            "fig.add_trace(go.Scatter(x=df_daily_energy['date'], y=df_daily_energy['energy'], name='Historical Actual', mode='lines', line=dict(color='black')))\n",
            "fig.add_trace(go.Scatter(x=future_dates, y=forecast_xgb, name='XGBoost 90-Day Projections', mode='lines', line=dict(color='orange', dash='dash')))\n",
            "fig.update_layout(title=\"90-Day Daily Energy Usage Forecast (XGBoost)\", xaxis_title=\"Date\", yaxis_title=\"Energy Load\", template=\"plotly_white\")\n",
            "fig.show()"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - LSTM Utilization Forecasting
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Machine Utilization Forecasting (PyTorch LSTM)\n",
            "We train a Long Short-Term Memory recurrent neural network on machine utilization. We scale the series to $[0, 1]$ before sequence generation."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - LSTM Training and Forecasting
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Scale data\n",
            "scaler = MinMaxScaler()\n",
            "util_scaled = scaler.fit_transform(df_daily_util[['utilization']].values)\n",
            "\n",
            "# Prepare supervised sequences (lookback of 7 days)\n",
            "def create_sequences(data, seq_length=7):\n",
            "    xs, ys = [], []\n",
            "    for i in range(len(data) - seq_length):\n",
            "        x = data[i:(i + seq_length)]\n",
            "        y = data[i + seq_length]\n",
            "        xs.append(x)\n",
            "        ys.append(y)\n",
            "    return np.array(xs), np.array(ys)\n",
            "\n",
            "X_seq, y_seq = create_sequences(util_scaled)\n",
            "X_tensor = torch.tensor(X_seq, dtype=torch.float32)\n",
            "y_tensor = torch.tensor(y_seq, dtype=torch.float32)\n",
            "\n",
            "# LSTM Architecture\n",
            "class LSTMForecaster(nn.Module):\n",
            "    def __init__(self, input_dim=1, hidden_dim=32, num_layers=1):\n",
            "        super(LSTMForecaster, self).__init__()\n",
            "        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)\n",
            "        self.fc = nn.Linear(hidden_dim, 1)\n",
            "        \n",
            "    def forward(self, x):\n",
            "        out, _ = self.lstm(x)\n",
            "        # Use the output from the last timestep\n",
            "        pred = self.fc(out[:, -1, :])\n",
            "        return pred\n",
            "\n",
            "model = LSTMForecaster().cpu()\n",
            "criterion = nn.MSELoss()\n",
            "optimizer = torch.optim.Adam(model.parameters(), lr=0.01)\n",
            "\n",
            "# Train LSTM (25 epochs)\n",
            "print(\"Training PyTorch LSTM...\")\n",
            "model.train()\n",
            "for epoch in range(25):\n",
            "    optimizer.zero_grad()\n",
            "    outputs = model(X_tensor)\n",
            "    loss = criterion(outputs, y_tensor)\n",
            "    loss.backward()\n",
            "    optimizer.step()\n",
            "    if (epoch + 1) % 5 == 0:\n",
            "        print(f\"  Epoch {epoch+1}/25, MSE Loss: {loss.item():.5f}\")\n",
            "\n",
            "# Recursive forecasting loop\n",
            "model.eval()\n",
            "current_seq = util_scaled[-7:].reshape(1, 7, 1)\n",
            "forecast_scaled = []\n",
            "\n",
            "with torch.no_grad():\n",
            "    for _ in range(90):\n",
            "        seq_tensor = torch.tensor(current_seq, dtype=torch.float32)\n",
            "        pred = model(seq_tensor).numpy()[0]\n",
            "        forecast_scaled.append(pred[0])\n",
            "        # Slide window\n",
            "        current_seq = np.append(current_seq[0, 1:, :], [[pred]], axis=0).reshape(1, 7, 1)\n",
            "\n",
            "# Inverse transform forecasts\n",
            "forecast_lstm = scaler.inverse_transform(np.array(forecast_scaled).reshape(-1, 1)).flatten()\n",
            "\n",
            "# Compile future dates\n",
            "last_date_util = df_daily_util['date'].max()\n",
            "future_dates_util = pd.date_range(start=last_date_util + pd.Timedelta(days=1), periods=90, freq='D')\n",
            "\n",
            "fig = go.Figure()\n",
            "fig.add_trace(go.Scatter(x=df_daily_util['date'], y=df_daily_util['utilization'], name='Historical Actual', mode='lines', line=dict(color='black')))\n",
            "fig.add_trace(go.Scatter(x=future_dates_util, y=forecast_lstm, name='LSTM 90-Day Projections', mode='lines', line=dict(color='green')))\n",
            "fig.update_layout(title=\"90-Day Machine Utilization Forecast (PyTorch LSTM)\", xaxis_title=\"Date\", yaxis_title=\"Utilization %\", template=\"plotly_white\")\n",
            "fig.show()"
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
    
    target_path = os.path.join("notebooks", "08_forecasting.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
