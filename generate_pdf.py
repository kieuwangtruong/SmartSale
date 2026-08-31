import os
import subprocess
import pathlib
import sys

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(chrome_path):
    chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

files_to_compile = [
    ("SMARTSALE_PROJECT_SHOWCASE.html", "SMARTSALE_PROJECT_SHOWCASE.pdf")
]

for html_name, pdf_name in files_to_compile:
    html_path = pathlib.Path(html_name).resolve()
    pdf_path = pathlib.Path(pdf_name).resolve()
    
    if not html_path.exists():
        print(f"Skipping {html_name} (Not found)")
        continue

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

    print(f"Compiling {html_name} -> {pdf_name}...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if pdf_path.exists():
        print(f"SUCCESS: {pdf_name} (Size: {pdf_path.stat().st_size:,} bytes)")
    else:
        print(f"FAILED: {pdf_name}, return code {result.returncode}")
        print("Stderr:", result.stderr)
