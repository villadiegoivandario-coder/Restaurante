import webview
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
HTML_PATH = BASE_DIR / "frontend" / "index.html"

if not HTML_PATH.exists():
    raise FileNotFoundError(f"No se encontró el archivo del POS: {HTML_PATH}")

window = webview.create_window(
    "Llama's Wings POS",
    str(HTML_PATH),
    width=1280,
    height=800,
    resizable=True,
)

if __name__ == "__main__":
    webview.start()
