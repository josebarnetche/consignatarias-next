#!/usr/bin/env python3
"""
INMAG Historical Data Backfill
Downloads MAGYP monthly PDFs and extracts daily INMAG values.

Usage:
    python scripts/backfill-inmag.py

Output:
    src/lib/data/inmag-historical.json
"""

import json
import re
import os
import sys
from datetime import datetime
from pathlib import Path
import urllib.request
import tempfile

# Try to import PDF libraries
try:
    import pdfplumber
    PDF_LIBRARY = 'pdfplumber'
except ImportError:
    try:
        import PyPDF2
        PDF_LIBRARY = 'PyPDF2'
    except ImportError:
        print("ERROR: Need pdfplumber or PyPDF2")
        print("Run: pip install pdfplumber")
        sys.exit(1)

# MAGYP PDF URL pattern
# https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_sectorial/_archivos//000021_Precios/000001-Mercado%20Agroganadero%20S.A./010001-Informe%20mensual/000009_2024/000012-Resumen%20Mensual%20Mercado%20Agroganadero%20-%20Diciembre%202024.pdf

BASE_URL = "https://www.magyp.gob.ar/sitio/areas/bovinos/informacion_sectorial/_archivos//000021_Precios/000001-Mercado%20Agroganadero%20S.A./010001-Informe%20mensual"

MONTHS_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

MONTH_NUMBERS = {
    1: "000001", 2: "000002", 3: "000003", 4: "000004",
    5: "000005", 6: "000006", 7: "000007", 8: "000008",
    9: "000009", 10: "000010", 11: "000011", 12: "000012"
}

def get_pdf_url(year: int, month: int) -> str:
    """Generate MAGYP PDF URL for a given year/month."""
    year_folder = f"000009_{year}" if year >= 2024 else f"000008_{year}"
    month_num = MONTH_NUMBERS[month]
    month_name = MONTHS_ES[month]
    filename = f"Resumen%20Mensual%20Mercado%20Agroganadero%20-%20{month_name}%20{year}.pdf"
    return f"{BASE_URL}/{year_folder}/{month_num}-{filename}"

def download_pdf(url: str) -> bytes | None:
    """Download PDF from URL."""
    try:
        print(f"  Downloading: {url.split('/')[-1][:50]}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except Exception as e:
        print(f"  Failed: {e}")
        return None

def extract_inmag_from_pdf_pdfplumber(pdf_bytes: bytes) -> list[dict]:
    """Extract INMAG values using pdfplumber."""
    results = []
    
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(pdf_bytes)
        temp_path = f.name
    
    try:
        with pdfplumber.open(temp_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
            
            # Look for INMAG values in the text
            # Pattern: date followed by INMAG value
            # Example: "02/01/2024 4,126.90" or "02-01-2024 4126.90"
            
            # Try to find table with dates and INMAG
            lines = full_text.split('\n')
            for line in lines:
                # Pattern: DD/MM/YYYY ... INMAG value (usually 4 digits with decimals)
                match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4}).*?(\d{1,2}[.,]?\d{3}[.,]\d{2})', line)
                if match:
                    day, month, year = match.groups()[:3]
                    value_str = match.group(4).replace('.', '').replace(',', '.')
                    try:
                        value = float(value_str)
                        if 100 < value < 10000:  # Sanity check for INMAG range
                            date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                            results.append({"date": date, "value": round(value, 2)})
                    except ValueError:
                        pass
    finally:
        os.unlink(temp_path)
    
    return results

def extract_inmag_from_pdf_pypdf2(pdf_bytes: bytes) -> list[dict]:
    """Extract INMAG values using PyPDF2."""
    import io
    results = []
    
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() or ""
    
    # Same extraction logic
    lines = full_text.split('\n')
    for line in lines:
        match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4}).*?(\d{1,2}[.,]?\d{3}[.,]\d{2})', line)
        if match:
            day, month, year = match.groups()[:3]
            value_str = match.group(4).replace('.', '').replace(',', '.')
            try:
                value = float(value_str)
                if 100 < value < 10000:
                    date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    results.append({"date": date, "value": round(value, 2)})
            except ValueError:
                pass
    
    return results

def extract_inmag_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """Extract INMAG values from PDF bytes."""
    if PDF_LIBRARY == 'pdfplumber':
        return extract_inmag_from_pdf_pdfplumber(pdf_bytes)
    else:
        return extract_inmag_from_pdf_pypdf2(pdf_bytes)

def main():
    print("=" * 60)
    print("INMAG Historical Data Backfill")
    print("=" * 60)
    
    all_data = []
    
    # Fetch 2024 and 2025 data (2023 might have different format)
    years_months = []
    
    # 2024: all 12 months
    for month in range(1, 13):
        years_months.append((2024, month))
    
    # 2025: all 12 months
    for month in range(1, 13):
        years_months.append((2025, month))
    
    # 2026: Jan and Feb (March is current)
    for month in range(1, 3):
        years_months.append((2026, month))
    
    print(f"\nFetching {len(years_months)} monthly PDFs...\n")
    
    for year, month in years_months:
        url = get_pdf_url(year, month)
        pdf_bytes = download_pdf(url)
        
        if pdf_bytes:
            data = extract_inmag_from_pdf(pdf_bytes)
            if data:
                print(f"  OK {MONTHS_ES[month]} {year}: {len(data)} entries")
                all_data.extend(data)
            else:
                print(f"  WARN {MONTHS_ES[month]} {year}: no data extracted")
        else:
            print(f"  SKIP {MONTHS_ES[month]} {year}: download failed")
    
    # Deduplicate and sort by date
    seen = set()
    unique_data = []
    for entry in all_data:
        if entry["date"] not in seen:
            seen.add(entry["date"])
            unique_data.append(entry)
    
    unique_data.sort(key=lambda x: x["date"])
    
    print(f"\n{'=' * 60}")
    print(f"Total unique entries: {len(unique_data)}")
    if unique_data:
        print(f"Date range: {unique_data[0]['date']} to {unique_data[-1]['date']}")
    
    # Save to JSON
    output_path = Path(__file__).parent.parent / "src" / "lib" / "data" / "inmag-historical.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    output = {
        "index": "inmag",
        "name": "Índice Novillo Mercado Agroganadero",
        "unit": "$/kg vivo",
        "source": "magyp.gob.ar (Mercado Agroganadero S.A.)",
        "generated": datetime.now().isoformat(),
        "count": len(unique_data),
        "series": unique_data
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to: {output_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()
