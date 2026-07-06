"""Shared path configuration for the worldcup pipeline."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).parents[3]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
OUTPUT_DIR = DATA_DIR / "output"
