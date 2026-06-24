from ai_engine.data_pipeline import prepare_processed_data
from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR


def test_processed_datasets_are_generated():
    prepare_processed_data()
    expected = [
        "engineered_machine_health.csv",
        "engineered_mfg_bottleneck.csv",
        "engineered_energy.csv",
        "cleaned_synthetic_factory_data.csv",
    ]
    for filename in expected:
        path = PROCESSED_DATA_DIR / filename
        assert path.exists()
        assert path.stat().st_size > 0


def test_model_directories_exist():
    for path in MODEL_PATHS.values():
        assert path.parent.exists()
