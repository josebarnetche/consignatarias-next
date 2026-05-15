import pdfplumber
import sys

pdf_path = sys.argv[1] if len(sys.argv) > 1 else 'test.pdf'

with pdfplumber.open(pdf_path) as pdf:
    print(f'Total pages: {len(pdf.pages)}')
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        preview = text[:150].replace('\n', ' | ')
        print(f'Page {i+1}: {preview}...')
    
    print('\n\n=== Looking for daily data ===')
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        # Check if page has what looks like daily entries
        import re
        daily_matches = re.findall(r'(\d{1,2}/\d{2}/\d{4})\s+.*?(\d[\d.,]+)', text)
        if daily_matches:
            print(f'\nPage {i+1} has {len(daily_matches)} potential daily entries:')
            for match in daily_matches[:5]:
                print(f'  {match}')
