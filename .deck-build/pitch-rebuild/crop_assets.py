from pathlib import Path

from PIL import Image


ROOT = Path("/Users/mustafa/paper/.deck-build/pitch-rebuild")
SOURCE = ROOT / "source-slides"
ASSETS = ROOT / "assets"

CROPS = {
    "photo-collage.png": (1, (56, 300, 810, 650)),
    "workflows-hero.png": (3, (280, 125, 1130, 460)),
    "workflows-mvp.png": (10, (140, 110, 1060, 470)),
    "workflows-improvements.png": (11, (170, 110, 810, 470)),
    "workflows-feedback.png": (12, (170, 110, 810, 470)),
    "workflows-variants.png": (13, (56, 150, 810, 500)),
    "task-hub.png": (14, (210, 165, 1060, 470)),
    "review-hub.png": (15, (210, 165, 1060, 470)),
    "projects.png": (16, (120, 160, 1070, 470)),
    "document-editor.png": (17, (200, 155, 1050, 470)),
    "capstone-hero.png": (19, (90, 150, 1180, 470)),
    "tech-stack.png": (21, (280, 100, 1000, 390)),
    "ui-components.png": (22, (56, 300, 800, 650)),
    "dashboard.png": (23, (110, 300, 810, 650)),
    "design-system-palettes.png": (24, (55, 125, 1180, 470)),
    "foundations.png": (25, (90, 150, 810, 650)),
    "motion-library.png": (26, (235, 150, 810, 650)),
}


ASSETS.mkdir(parents=True, exist_ok=True)
for output_name, (slide_number, crop_box) in CROPS.items():
    image = Image.open(SOURCE / f"slide-{slide_number:02d}.png").convert("RGB")
    image.crop(crop_box).save(ASSETS / output_name, quality=95)

print(f"Prepared {len(CROPS)} assets in {ASSETS}")
