from pathlib import Path
from pypdf import PdfReader, PdfWriter
import subprocess
import shutil

base = Path('/Users/mustafa/paper')
sources = [base / 'Mustafa Ali Akbar - Chancenkarte Motivation Letter.pdf', base / 'Mustafa Ali Akbar - Chancenkarte CV.pdf']
out = base / 'Mustafa Ali Akbar - Chancenkarte Letter and CV.pdf'
writer = PdfWriter()
for path in sources:
    writer.append(str(path), import_outline=False)
writer.add_metadata({'/Title': 'Mustafa Ali Akbar - Motivation Letter and CV', '/Author': 'Mustafa Ali Akbar'})
writer.write(str(out))
merged = PdfReader(out)
expected = [p for source in sources for p in PdfReader(source).pages]
assert len(merged.pages) == len(expected) == 3
assert all(a.extract_text() == b.extract_text() for a,b in zip(merged.pages, expected))
qa = base / 'tmp/pdfs/chancenkarte-combined'
qa.mkdir(parents=True, exist_ok=True)
subprocess.run([shutil.which('pdftoppm') or '/Users/mustafa/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pdftoppm', '-scale-to', '1600', '-png', str(out), str(qa / 'page')], check=True)
print(out)
print('Verified 3 pages; text matches source PDFs exactly.')
