from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph


RESUME = Path("/Users/mustafa/paper/resume.docx")


def paragraph_text(element, document) -> str | None:
    if element.tag != qn("w:p"):
        return None
    return Paragraph(element, document).text.strip()


document = Document(RESUME)
body = document.element.body
children = list(body.iterchildren())

heading_indices = {}
for index, child in enumerate(children):
    text = paragraph_text(child, document)
    if text in {"EDUCATION", "PROFESSIONAL EXPERIENCE", "SKILLS"}:
        heading_indices[text] = index

missing = {
    "EDUCATION",
    "PROFESSIONAL EXPERIENCE",
    "SKILLS",
} - heading_indices.keys()
if missing:
    raise ValueError(f"Missing section heading(s): {', '.join(sorted(missing))}")

education_index = heading_indices["EDUCATION"]
experience_index = heading_indices["PROFESSIONAL EXPERIENCE"]

if education_index < experience_index:
    # The Education section is the contiguous block from its heading through
    # the element immediately before Professional Experience. Move it intact
    # so every table, spacer, and existing formatting property is preserved.
    education_block = children[education_index:experience_index]
    skills_element = children[heading_indices["SKILLS"]]

    for element in education_block:
        body.remove(element)

    insert_at = list(body.iterchildren()).index(skills_element)
    for offset, element in enumerate(education_block):
        body.insert(insert_at + offset, element)

    document.save(RESUME)
    print(f"Moved Professional Experience above Education in {RESUME}")
else:
    print("Professional Experience is already above Education; no change needed.")
