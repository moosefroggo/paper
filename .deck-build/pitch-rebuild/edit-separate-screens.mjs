import fs from "node:fs/promises";
import {
  FileBlob,
  PresentationFile,
} from "@oai/artifact-tool";

const SOURCE =
  "/Users/mustafa/Downloads/Mustafa-Portfolio-Deck-Rebuilt.pptx";
const OUTPUT =
  "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Separate-Screens.pptx";
const QA_DIR =
  "/Users/mustafa/paper/.deck-build/pitch-rebuild/separate-screens-qa";

const screenSlides = [
  {
    title: "Task hub",
    image: "/private/tmp/hello3d-slide8-frames/task-page-0.png",
    alt: "Task hub showing assigned work, project, status, priority, due date, and assignees",
  },
  {
    title: "Review hub",
    image: "/private/tmp/hello3d-slide8-frames/reviews-video-05.png",
    alt: "Review hub showing document review requests and review status",
  },
  {
    title: "Projects",
    image: "/private/tmp/hello3d-slide8-frames/project-video-13.png",
    alt: "Design System project showing nested work, priority, status, due date, and owners",
  },
  {
    title: "Document editor",
    image: "/private/tmp/hello3d-slide8-frames/doc-video-05.png",
    alt: "Document editor showing project context, review controls, content, and activity",
  },
];

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function imageBytes(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function addText(slide, text, position, style, name) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = style;
  return shape;
}

async function populateScreenSlide(slide, spec) {
  slide.shapes.deleteAll();
  for (const image of [...slide.images.items]) {
    image.delete();
  }

  slide.background.fill = "#F7F8F7";

  addText(
    slide,
    "WHAT SHIPPED",
    { left: 72, top: 48, width: 460, height: 26 },
    {
      fontFamily: "GT Haptik",
      fontSize: 14,
      bold: true,
      color: "#6F716E",
      alignment: "left",
      verticalAlignment: "top",
    },
    "what-shipped-eyebrow",
  );

  addText(
    slide,
    spec.title,
    { left: 72, top: 88, width: 1010, height: 64 },
    {
      fontFamily: "GT Haptik",
      fontSize: 47,
      color: "#151716",
      alignment: "left",
      verticalAlignment: "top",
    },
    "screen-title",
  );

  slide.images.add({
    blob: await imageBytes(spec.image),
    contentType: "image/png",
    alt: spec.alt,
    fit: "cover",
    position: { left: 160, top: 165, width: 960, height: 540 },
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
}

await fs.mkdir(QA_DIR, { recursive: true });

const presentation = await PresentationFile.importPptx(
  await FileBlob.load(SOURCE),
);

const sourceSlide = presentation.resolve("sl/fu1gfa1s");
const sourceIndex = sourceSlide.index;

await writeBlob(
  `${QA_DIR}/before-slide-08.png`,
  await sourceSlide.export({ format: "png", scale: 1 }),
);

const replacements = screenSlides.map(() => sourceSlide.duplicate());

for (let index = 0; index < replacements.length; index += 1) {
  const replacement = replacements[index];
  replacement.moveTo(sourceIndex + index + 1);
  await populateScreenSlide(replacement, screenSlides[index]);
}

sourceSlide.delete();

for (let index = 0; index < replacements.length; index += 1) {
  await writeBlob(
    `${QA_DIR}/after-slide-${String(sourceIndex + index + 1).padStart(2, "0")}.png`,
    await replacements[index].export({ format: "png", scale: 1 }),
  );
  await fs.writeFile(
    `${QA_DIR}/after-slide-${String(sourceIndex + index + 1).padStart(2, "0")}.layout.json`,
    await (await replacements[index].export({ format: "layout" })).text(),
  );
}

await writeBlob(
  `${QA_DIR}/after-montage.webp`,
  await presentation.export({
    format: "webp",
    montage: { columns: 4, slideWidth: 320, gap: 12, padding: 12 },
    scale: 1,
  }),
);

const verification = await presentation.inspect({
  kind: "slide,textbox,image",
  search: "WHAT SHIPPED",
  maxChars: 20000,
});
await fs.writeFile(`${QA_DIR}/verification.ndjson`, verification.ndjson);

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUTPUT);

console.log(
  JSON.stringify(
    {
      output: OUTPUT,
      qaDir: QA_DIR,
      slideCount: presentation.slides.items.length,
      replacedSlide: sourceIndex + 1,
      replacementSlides: replacements.map((slide) => slide.index + 1),
    },
    null,
    2,
  ),
);
