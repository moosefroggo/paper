import fs from "node:fs/promises";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

async function bytes(file) {
  const b = await fs.readFile(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

async function isolate(slide, target, file, alt) {
  const staged = slide.images.add({
    blob: await bytes(file),
    contentType: "image/png",
    alt,
    fit: "cover",
    position: { left: 0, top: 0, width: 1, height: 1 },
  });
  const ref = staged.imageReferenceId;
  target.setImageReference(ref);
  target.alt = alt;
  staged.delete();
  console.log({ slide: slide.index + 1, ref, targetRef: target.imageReferenceId });
}

const p = await PresentationFile.importPptx(await FileBlob.load("template-starter.pptx"));
await isolate(p.slides.items[2], p.slides.items[2].images.items[0], "media-frames/hero.png", "hero");
await isolate(p.slides.items[4], p.slides.items[4].images.items[0], "customer-call-wide.png", "call");
const out = await PresentationFile.exportPptx(p);
await out.save("test-isolate.pptx");
