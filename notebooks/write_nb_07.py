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
            "## Notebook 07: Unsupervised Anomaly & Fault Detection Model\n",
            "\n",
            "### Objectives\n",
            "1. **Load Acoustic & Physical Sensor Logs**: Load `cleaned_synthetic_factory_data.csv`.\n",
            "2. **Implement Unsupervised Anomaly Detectors**:\n",
            "   - **Isolation Forest** (Scikit-Learn)\n",
            "   - **One-Class SVM** (Scikit-Learn)\n",
            "   - **Deep AutoEncoder** (PyTorch reconstruction-based Neural Network)\n",
            "3. **Evaluate Models**: Use precision, recall, and F1-score comparing predictions against the true hidden anomaly labels (`anomaly_label`).\n",
            "4. **Export Best Models**: Export a serialized package containing the models and scaling preprocessors as `anomaly_model.pkl`."
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
            "import torch\n",
            "import torch.nn as nn\n",
            "import torch.optim as optim\n",
            "from torch.utils.data import DataLoader, TensorDataset\n",
            "from sklearn.model_selection import train_test_split\n",
            "from sklearn.preprocessing import StandardScaler\n",
            "from sklearn.ensemble import IsolationForest\n",
            "from sklearn.svm import OneClassSVM\n",
            "from sklearn.metrics import classification_report, accuracy_score, f1_score, roc_auc_score\n",
            "\n",
            "# Ensure reproducibility\n",
            "torch.manual_seed(42)\n",
            "np.random.seed(42)\n",
            "\n",
            "print(\"Libraries loaded. PyTorch is running.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 3: Markdown - Loading Data
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 1. Load Data and Scaling\n",
            "Unsupervised models are highly sensitive to variable scales, so we perform standard scaling. We split the data, keeping normal instances for AutoEncoder training."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 4: Code - Data Loading & Preparation
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "PROCESSED_DIR = os.path.join(\"..\", \"datasets\", \"processed\")\n",
            "df = pd.read_csv(os.path.join(PROCESSED_DIR, \"cleaned_synthetic_factory_data.csv\"))\n",
            "\n",
            "sensor_cols = [\n",
            "    'vibration_mm_s', 'temperature_c', 'pressure_bar', \n",
            "    'noise_level_db', 'sound_frequency_hz', 'sound_amplitude'\n",
            "]\n",
            "\n",
            "X = df[sensor_cols]\n",
            "y = df['anomaly_label']\n",
            "\n",
            "# Train/Test split\n",
            "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)\n",
            "\n",
            "# Fit scaler\n",
            "scaler = StandardScaler()\n",
            "X_train_scaled = scaler.fit_transform(X_train)\n",
            "X_test_scaled = scaler.transform(X_test)\n",
            "\n",
            "# Extract only normal records for AutoEncoder training\n",
            "X_train_normal = X_train_scaled[y_train == 0]\n",
            "\n",
            "print(f\"Total training records: {X_train_scaled.shape[0]}\")\n",
            "print(f\"Normal training records (for AutoEncoder): {X_train_normal.shape[0]}\")\n",
            "print(f\"Testing records: {X_test_scaled.shape[0]} (Anomalies: {y_test.sum()})\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 5: Markdown - Isolation Forest and OCSVM
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 2. Train Isolation Forest and One-Class SVM\n",
            "Let's train classical unsupervised models from Scikit-Learn. We set the contamination parameter to ~0.02 (the expected anomaly rate)."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 6: Code - Classical ML training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# 1. Isolation Forest\n",
            "iforest = IsolationForest(contamination=0.025, random_state=42)\n",
            "iforest.fit(X_train_scaled)\n",
            "\n",
            "# Isolation Forest predicts -1 for anomalies and 1 for normal\n",
            "y_pred_if = iforest.predict(X_test_scaled)\n",
            "y_pred_if = np.where(y_pred_if == -1, 1, 0)\n",
            "if_scores = -iforest.decision_function(X_test_scaled)\n",
            "\n",
            "print(\"=== Isolation Forest Performance ===\")\n",
            "print(classification_report(y_test, y_pred_if))\n",
            "print(f\"ROC-AUC: {roc_auc_score(y_test, if_scores):.4f}\")\n",
            "\n",
            "# 2. One-Class SVM\n",
            "ocsvm = OneClassSVM(nu=0.025, kernel='rbf', gamma='scale')\n",
            "ocsvm.fit(X_train_normal) # fit only on normal data\n",
            "\n",
            "y_pred_oc = ocsvm.predict(X_test_scaled)\n",
            "y_pred_oc = np.where(y_pred_oc == -1, 1, 0)\n",
            "oc_scores = -ocsvm.score_samples(X_test_scaled)\n",
            "\n",
            "print(\"\\n=== One-Class SVM Performance ===\")\n",
            "print(classification_report(y_test, y_pred_oc))\n",
            "print(f\"ROC-AUC: {roc_auc_score(y_test, oc_scores):.4f}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 7: Markdown - PyTorch AutoEncoder Section
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 3. Train PyTorch Deep AutoEncoder\n",
            "We construct a Deep AutoEncoder that compresses the 6 sensor dimensions into a 3-dimensional latent space and reconstructs them back. Since it is trained exclusively on normal sensor data, it will yield low reconstruction errors for normal cycles and high errors for anomalous operations."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 8: Code - AutoEncoder Architecture & Training
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "class AutoEncoder(nn.Module):\n",
            "    def __init__(self, input_dim=6):\n",
            "        super(AutoEncoder, self).__init__()\n",
            "        # Encoder\n",
            "        self.encoder = nn.Sequential(\n",
            "            nn.Linear(input_dim, 4),\n",
            "            nn.ReLU(),\n",
            "            nn.Linear(4, 2),\n",
            "            nn.ReLU()\n",
            "        )\n",
            "        # Decoder\n",
            "        self.decoder = nn.Sequential(\n",
            "            nn.Linear(2, 4),\n",
            "            nn.ReLU(),\n",
            "            nn.Linear(4, input_dim)\n",
            "        )\n",
            "        \n",
            "    def forward(self, x):\n",
            "        latent = self.encoder(x)\n",
            "        reconstructed = self.decoder(latent)\n",
            "        return reconstructed\n",
            "\n",
            "# Prepare PyTorch tensors and Dataloader\n",
            "train_tensor = torch.tensor(X_train_normal, dtype=torch.float32)\n",
            "train_loader = DataLoader(TensorDataset(train_tensor), batch_size=64, shuffle=True)\n",
            "\n",
            "# Model setup\n",
            "device = torch.device(\"cuda\" if torch.cuda.is_available() else \"cpu\")\n",
            "model = AutoEncoder(input_dim=len(sensor_cols)).to(device)\n",
            "criterion = nn.MSELoss()\n",
            "optimizer = optim.Adam(model.parameters(), lr=0.01)\n",
            "\n",
            "# Training loop (15 epochs for quick convergence)\n",
            "print(\"Training PyTorch AutoEncoder...\")\n",
            "model.train()\n",
            "for epoch in range(15):\n",
            "    epoch_loss = 0.0\n",
            "    for batch in train_loader:\n",
            "        x_batch = batch[0].to(device)\n",
            "        \n",
            "        optimizer.zero_grad()\n",
            "        outputs = model(x_batch)\n",
            "        loss = criterion(outputs, x_batch)\n",
            "        loss.backward()\n",
            "        optimizer.step()\n",
            "        \n",
            "        epoch_loss += loss.item() * x_batch.size(0)\n",
            "    print(f\"  Epoch {epoch+1}/15, MSE Loss: {epoch_loss/len(X_train_normal):.5f}\")\n",
            "\n",
            "print(\"AutoEncoder training complete.\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 9: Markdown - AutoEncoder Anomaly Detection
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 4. Evaluate AutoEncoder Reconstruction Error\n",
            "We reconstruct the test set, calculate the mean squared error per sample, and label the top 2.5% highest-loss samples as anomalies."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 10: Code - AutoEncoder evaluation
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "model.eval()\n",
            "with torch.no_grad():\n",
            "    # Reconstruct test data\n",
            "    test_tensor = torch.tensor(X_test_scaled, dtype=torch.float32).to(device)\n",
            "    test_reconstructed = model(test_tensor).cpu().numpy()\n",
            "\n",
            "# Compute MSE reconstruction error per row\n",
            "mse_errors = np.mean((X_test_scaled - test_reconstructed) ** 2, axis=1)\n",
            "\n",
            "# Define threshold as 97.5th percentile of errors\n",
            "threshold = np.percentile(mse_errors, 97.5)\n",
            "y_pred_ae = (mse_errors > threshold).astype(int)\n",
            "\n",
            "print(\"=== AutoEncoder Performance ===\")\n",
            "print(classification_report(y_test, y_pred_ae))\n",
            "print(f\"ROC-AUC: {roc_auc_score(y_test, mse_errors):.4f}\")"
        ]
    })
    
    # ----------------------------------------------------
    # Cell 11: Markdown - Compare and Package
    # ----------------------------------------------------
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## 5. Model Leaderboard & Export\n",
            "We compare F1-scores and select the best model to export as `anomaly_model.pkl` along with the scaler."
        ]
    })
    
    # ----------------------------------------------------
    # Cell 12: Code - Serialization
    # ----------------------------------------------------
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "f1_if = f1_score(y_test, y_pred_if)\n",
            "f1_oc = f1_score(y_test, y_pred_oc)\n",
            "f1_ae = f1_score(y_test, y_pred_ae)\n",
            "\n",
            "print(f\"Isolation Forest F1-Score: {f1_if:.4f}\")\n",
            "print(f\"One-Class SVM F1-Score:    {f1_oc:.4f}\")\n",
            "print(f\"AutoEncoder F1-Score:       {f1_ae:.4f}\")\n",
            "\n",
            "# Export Isolation Forest as base classical, and the AutoEncoder weights/scaler\n",
            "anomaly_package = {\n",
            "    'scaler': scaler,\n",
            "    'iforest': iforest,\n",
            "    'ocsvm': ocsvm,\n",
            "    'autoencoder_state': model.state_dict(),\n",
            "    'ae_threshold': threshold\n",
            "}\n",
            "\n",
            "model_path = \"anomaly_model.pkl\"\n",
            "with open(model_path, 'wb') as f:\n",
            "    pickle.dump(anomaly_package, f)\n",
            "\n",
            "print(f\"Serialized anomaly detection package exported to: {os.path.abspath(model_path)}\")"
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
    
    target_path = os.path.join("notebooks", "07_anomaly_detection.ipynb")
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(nb_dict, f, indent=1)
        
    print(f"Generated {target_path} successfully!")

if __name__ == "__main__":
    create_notebook()
