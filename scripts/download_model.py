import os
import shutil
from pathlib import Path

try:
    from huggingface_hub import snapshot_download
except ImportError as exc:
    raise SystemExit("huggingface_hub not installed. Run: pip install huggingface_hub") from exc

REPO_ID = "Xenova/all-MiniLM-L6-v2"
ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "public" / "models" / "all-MiniLM-L6-v2"
ONNX_DIR = ROOT / "public" / "onnx"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
ONNX_DIR.mkdir(parents=True, exist_ok=True)

snapshot_download(
    repo_id=REPO_ID,
    local_dir=str(MODEL_DIR),
    allow_patterns=[
        "*.json",
        "*.txt",
        "*.model",
        "*.bin",
        "*.onnx",
        "*.safetensors",
    ],
)

onnx_src = ROOT / "node_modules" / "onnxruntime-web" / "dist"
if not onnx_src.exists():
    raise SystemExit("onnxruntime-web not found. Run npm install first.")

for pattern in ("*.wasm", "*.js", "*.mjs"):
    for file in onnx_src.glob(pattern):
        shutil.copy2(file, ONNX_DIR / file.name)

print(f"Model downloaded to {MODEL_DIR}")
print(f"ONNX runtime assets copied to {ONNX_DIR}")
