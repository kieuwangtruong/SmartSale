import os
import subprocess
import pathlib

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(chrome_path):
    chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

html_path = pathlib.Path("SMARTSALE_PROJECT_SHOWCASE.html").resolve()
pdf_path = pathlib.Path("SMARTSALE_PROJECT_SHOWCASE.pdf").resolve()

file_url = html_path.as_uri()

cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--no-margins",
    f"--print-to-pdf={pdf_path}",
    "--no-pdf-header-footer",
    file_url
]

print("Executing Chrome headless PDF render...")
result = subprocess.run(cmd, capture_output=True, text=True)

if pdf_path.exists():
    print(f"SUCCESS: PDF generated at {pdf_path} (Size: {pdf_path.stat().st_size:,} bytes)")
else:
    print(f"FAILED: Return code {result.returncode}")
    print("Stderr:", result.stderr)
