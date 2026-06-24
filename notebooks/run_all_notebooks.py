import subprocess
import os
import sys

def run_pipeline():
    notebooks = [
        "01_data_exploration.ipynb",
        "02_data_cleaning.ipynb",
        "03_feature_engineering.ipynb",
        "04_machine_health_model.ipynb",
        "05_bottleneck_model.ipynb",
        "06_energy_model.ipynb",
        "07_anomaly_detection.ipynb",
        "08_forecasting.ipynb",
        "09_model_evaluation.ipynb",
        "10_final_training.ipynb"
    ]
    
    # Change working directory to notebooks/ folder
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Working Directory set to: {os.getcwd()}")
    
    for nb in notebooks:
        print("="*60)
        print(f"Executing: {nb}")
        print("="*60)
        
        # Run nbconvert to execute the notebook in place
        cmd = [
            "jupyter", "nbconvert", 
            "--to", "notebook", 
            "--execute", 
            "--inplace", 
            "--ExecutePreprocessor.timeout=600",
            nb
        ]
        
        # Execute process
        res = subprocess.run(cmd, capture_output=True, text=True)
        
        if res.returncode != 0:
            print(f"Error executing {nb}!")
            print("--- STDOUT ---")
            print(res.stdout)
            print("--- STDERR ---")
            print(res.stderr)
            sys.exit(1)
        
        print(f"Successfully completed: {nb}")
        
    print("="*60)
    print("NexTwin AI - All 10 notebooks executed successfully end-to-end!")
    print("="*60)

if __name__ == "__main__":
    run_pipeline()
