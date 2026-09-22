import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const WORKSPACE = "/Users/mustafa/paper/.tmp/immobilizer-dealerware";
const STARTER = path.join(WORKSPACE, "template-starter.pptx");
const OUTPUT = "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware.pptx";
const PREVIEW_DIR = path.join(WORKSPACE, "final-preview");
const LAYOUT_DIR = path.join(WORKSPACE, "final-layout");
let ANCHOR_MAP = new Map();

async function saveBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function replaceText(presentation, anchorId, oldText, newText) {
  const target = presentation.resolve(mappedAnchor(anchorId));
  target.text.replace(oldText, newText);
}

function mappedAnchor(anchorId) {
  const mapped = ANCHOR_MAP.get(anchorId);
  if (!mapped) throw new Error(`No remapped anchor for ${anchorId}`);
  return mapped;
}

function setImageFrame(presentation, anchorId, frame) {
  presentation.resolve(mappedAnchor(anchorId)).frame = frame;
}

function parseNdjson(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function sameBox(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => Math.abs(Number(value) - Number(b[index])) < 0.05);
}

function buildAnchorMap(oldRecords, currentRecords) {
  const map = new Map();
  for (const old of oldRecords) {
    if (!old.id || !old.kind) continue;
    let current;
    if (["slide", "notes"].includes(old.kind)) {
      current = currentRecords.find((item) => item.kind === old.kind && item.slide === old.slide);
    } else if (old.kind === "textbox") {
      current = currentRecords.find(
        (item) =>
          item.kind === "textbox" &&
          item.slide === old.slide &&
          item.name === old.name &&
          item.text === old.text &&
          sameBox(item.bbox, old.bbox),
      );
      if (!current) {
        current = currentRecords.find(
          (item) => item.kind === "textbox" && item.slide === old.slide && item.name === old.name && item.text === old.text,
        );
      }
    } else if (old.kind === "image") {
      current = currentRecords.find(
        (item) => item.kind === "image" && item.slide === old.slide && item.name === old.name && sameBox(item.bbox, old.bbox),
      );
      if (!current) {
        const oldSlideImages = oldRecords.filter((item) => item.kind === "image" && item.slide === old.slide);
        const currentSlideImages = currentRecords.filter((item) => item.kind === "image" && item.slide === old.slide);
        const index = oldSlideImages.findIndex((item) => item.id === old.id);
        current = currentSlideImages[index];
      }
    }
    if (current?.id) map.set(old.id, current.id);
  }
  return map;
}

async function replaceImagePreserve(presentation, anchorId, imagePath, alt, options = {}) {
  const image = presentation.resolve(mappedAnchor(anchorId));
  const oldFrame = image.frame;
  const oldCrop = image.crop;
  const oldFit = image.fit;
  const oldPrompt = image.prompt;
  const oldGeometry = image.geometry;
  const oldBorderRadius = image.borderRadius;
  const oldRotation = image.rotation;
  const oldFlipHorizontal = image.flipHorizontal;
  const oldFlipVertical = image.flipVertical;
  const oldLockAspectRatio = image.lockAspectRatio;

  image.replace({
    blob: await readImageBlob(imagePath),
    contentType: "image/png",
    alt,
    ...((options.fit ?? oldFit) ? { fit: options.fit ?? oldFit } : {}),
    ...(oldPrompt ? { prompt: oldPrompt } : {}),
  });
  image.frame = oldFrame;
  image.crop = options.resetCrop ? { left: 0, top: 0, right: 0, bottom: 0 } : oldCrop;
  image.geometry = oldGeometry;
  image.borderRadius = oldBorderRadius;
  image.rotation = oldRotation;
  image.flipHorizontal = oldFlipHorizontal;
  image.flipVertical = oldFlipVertical;
  image.lockAspectRatio = oldLockAspectRatio;
}

async function replaceImageIsolated(presentation, anchorId, imagePath, alt, options = {}) {
  const oldImage = presentation.resolve(mappedAnchor(anchorId));
  const slide = presentation.slides.items.find((item) =>
    item.images.items.some((candidate) => candidate.id === oldImage.id),
  );
  if (!slide) throw new Error(`Could not find slide for ${anchorId}`);

  const crop = options.resetCrop
    ? { left: 0, top: 0, right: 0, bottom: 0 }
    : oldImage.crop;
  const fit = options.fit ?? oldImage.fit ?? "cover";

  // Imported clone slides can share one media relationship. Stage a new
  // asset reference, point the inherited image element at it, then remove
  // only the staging element. This preserves the template element and keeps
  // sibling slides' original screenshots untouched.
  const staged = slide.images.add({
    blob: await readImageBlob(imagePath),
    contentType: "image/png",
    alt,
    fit,
    position: { left: 0, top: 0, width: 1, height: 1 },
  });
  oldImage.setImageReference(staged.imageReferenceId);
  oldImage.alt = alt;
  oldImage.fit = fit;
  if (crop) oldImage.crop = crop;
  staged.delete();
}

async function main() {
  const presentation = await PresentationFile.importPptx(await FileBlob.load(STARTER));
  const oldRecords = parseNdjson(
    await fs.readFile(path.join(WORKSPACE, "template-starter.pptx.inspect.ndjson"), "utf8"),
  );
  const currentInspection = await presentation.inspect({
    kind: "deck,slide,textbox,shape,image,table,chart,notes,layout",
    maxChars: 300000,
  });
  const currentRecords = parseNdjson(currentInspection.ndjson);
  ANCHOR_MAP = buildAnchorMap(oldRecords, currentRecords);

  // Opening credentials and selected-work map.
  replaceText(
    presentation,
    "sh/7i9c7el8",
    "Built the core platform for Educative’s B2B offerings",
    "Added $8M ARR with Motive’s Engine Immobilizer",
  );
  replaceText(presentation, "sh/pgbyl8re", "SELECED WORK", "SELECTED WORK");
  replaceText(presentation, "sh/i54r2pg7", "Workflows", "Engine Immobilizer");
  replaceText(
    presentation,
    "sh/5svaxkzi",
    "Product strategy and interaction design",
    "Automotive hardware and fleet safety",
  );
  replaceText(presentation, "sh/y90rqlgn", "Capstone Matchmaker", "Workflows");
  replaceText(
    presentation,
    "sh/griho3ah",
    "Design and full-stack development",
    "Product strategy and interaction design",
  );
  replaceText(presentation, "sh/fq9gfy9w", "Design System + Motion", "Capstone Matchmaker");
  replaceText(
    presentation,
    "sh/4fihs3at",
    "Foundations, components, and behavior",
    "Design and full-stack development",
  );

  // Engine Immobilizer — market blocker.
  replaceText(presentation, "sh/p8bq1cni", "WORKFLOWS", "ENGINE IMMOBILIZER");
  replaceText(
    presentation,
    "sh/eh072x4v",
    "At Educative, the collaboration became a blocker when we scaled.",
    "Remote immobilization was the only core capability missing for Mexico.",
  );
  replaceText(
    presentation,
    "sh/fi98v25g",
    "Pagers waited on approvals, work was getting delayed, and our existing stack didn’t help with that.",
    "Sales Engineers said 90% of prospects asked for it. Motive had already lost a significant prospect, and the Q1 launch was at risk.",
  );
  await replaceImageIsolated(
    presentation,
    "im/falwbu5w",
    path.join(WORKSPACE, "media-frames", "hero.png"),
    "Motive Engine Immobilizer experience in Fleet View",
    { fit: "cover", resetCrop: true },
  );

  // Engine Immobilizer — system complexity.
  replaceText(presentation, "sh/0jepsb6p", "BUILD APPROACH", "SYSTEM COMPLEXITY");
  replaceText(
    presentation,
    "sh/2lwjmdkb",
    "Code-first kept the build focused.",
    "One command. Three systems.",
  );
  replaceText(
    presentation,
    "sh/3m5kvilw",
    "I moved from design intent to working components with Radix UI and shadcn/ui, using AI-assisted development to accelerate implementation.",
    "Admin was moving from 1.0 to 2.0, Fleet View was changing, and Motive was sourcing its first third-party hardware. I designed for launch without creating throwaway work.",
  );
  replaceText(
    presentation,
    "sh/gje1k32l",
    "I owned the design end to end including",
    "The design had to account for",
  );
  replaceText(presentation, "sh/ehwjitkf", "Product decisions", "Legacy and future admin states");
  replaceText(presentation, "sh/sfu1g329", "Information architecture", "Third-party device pairing");
  replaceText(presentation, "sh/98n6pgn6", "Interaction model", "Dead zones and command retries");
  replaceText(presentation, "sh/n65onq50", "Quality bar", "Tamper and jammer alerts");
  await replaceImageIsolated(
    presentation,
    "im/sna14jal",
    "/Users/mustafa/paper/case-media/engine/admin1.0.png",
    "Motive Admin 1.0 vehicle list",
  );
  await replaceImageIsolated(
    presentation,
    "im/to3ixor6",
    "/Users/mustafa/paper/case-media/engine/admin1.0.png",
    "Motive Admin 1.0 vehicle list",
  );
  await replaceImageIsolated(
    presentation,
    "im/yxsjy9sj",
    "/Users/mustafa/paper/case-media/engine/Admin2.0.png",
    "Planned Motive Admin 2.0 vehicle list",
  );
  await replaceImageIsolated(
    presentation,
    "im/jy10re94",
    "/Users/mustafa/paper/case-media/engine/Admin2.0.png",
    "Planned Motive Admin 2.0 vehicle list",
  );

  // Engine Immobilizer — customer research.
  replaceText(presentation, "sh/ix8va1oz", "WORKFLOWS", "CUSTOMER RESEARCH");
  replaceText(
    presentation,
    "sh/t4jepg7m",
    "At Educative, the collaboration became a blocker when we scaled.",
    "Fleet managers—not drivers—owned the action.",
  );
  replaceText(
    presentation,
    "sh/s3qdgv61",
    "Pagers waited on approvals, work was getting delayed, and our existing stack didn’t help with that.",
    "They used it after theft attempts or drunk driving. Dead zones and cut wiring made fallback states essential.",
  );
  await replaceImageIsolated(
    presentation,
    "im/o3u1sn25",
    path.join(WORKSPACE, "customer-call-wide.png"),
    "Customer research call with fleet managers reviewing the Engine Immobilizer experience",
    { fit: "cover", resetCrop: true },
  );

  // Engine Immobilizer — safety model.
  replaceText(presentation, "sh/6p0be9kn", "PRODUCT DIRECTION", "SAFETY MODEL");
  replaceText(
    presentation,
    "sh/98nm18bi",
    "I designed the product according to how we worked",
    "A dangerous action had to be deliberate and recoverable.",
  );
  replaceText(presentation, "sh/vap43ito", "A self-contained knowledge base", "Fleet manager-only control");
  replaceText(
    presentation,
    "sh/xc7m5sbu",
    "A multiplayer editor for tasks and comments",
    "The vehicle had to be stopped",
  );
  replaceText(
    presentation,
    "sh/jyp47itk",
    "A review system modeled on pull requests",
    "Confirmation, command status, and audit trail",
  );
  replaceText(
    presentation,
    "sh/sritgz2t",
    "A shared hierarchy from groups to subtasks",
    "Tamper, jammer, and dead-zone fallbacks",
  );
  await replaceImageIsolated(
    presentation,
    "im/03itgva5",
    "/Users/mustafa/paper/case-media/engine/iteration-final.png",
    "Final Engine Immobilizer interaction with command status and fallback messaging",
    { fit: "cover", resetCrop: true },
  );

  // Engine Immobilizer — impact.
  replaceText(presentation, "sh/ad0nyx4r", "$100k deal closed", "Added $8M\nto ARR");
  replaceText(
    presentation,
    "sh/8bi5wnml",
    "Workflows helped Educative close its biggest customer yet.",
    "Engine Immobilizer gave Sales the last core capability needed for Mexico.",
  );
  replaceText(
    presentation,
    "sh/m90nud4f",
    "The outcome tied the product directly to enterprise growth.",
    "It also supported lower insurance premiums and reduced cargo-theft risk.",
  );

  // Presenter notes and source blocks.
  const slide1 = presentation.resolve(mappedAnchor("sl/ezucze"));
  slide1.speakerNotes.append(
    "\n- User-provided Engine Immobilizer case study: /Users/mustafa/paper/engine-immobilizer.html",
  );
  const slide2 = presentation.resolve(mappedAnchor("sl/3gnkat"));
  slide2.speakerNotes.append(
    "\n- User-provided Engine Immobilizer case study: /Users/mustafa/paper/engine-immobilizer.html",
  );
  presentation.resolve(mappedAnchor("sl/k4lkjs")).speakerNotes.textFrame.setText([
    "Lead with the business constraint: Mexico expansion was blocked by one missing fleet-safety capability.",
    "[Sources]",
    "- User-provided case study: /Users/mustafa/paper/engine-immobilizer.html",
    "- User-provided demo: /Users/mustafa/paper/case-media/engine/hero.mp4",
  ]);
  presentation.resolve(mappedAnchor("sl/0ix6ca")).speakerNotes.textFrame.setText([
    "Explain that the product had to launch across legacy and future admin states, Fleet View, and Motive’s first third-party hardware.",
    "[Sources]",
    "- User-provided case study: /Users/mustafa/paper/engine-immobilizer.html",
    "- User-provided images: /Users/mustafa/paper/case-media/engine/admin1.0.png; /Users/mustafa/paper/case-media/engine/Admin2.0.png",
  ]);
  presentation.resolve(mappedAnchor("sl/bj1i8b")).speakerNotes.textFrame.setText([
    "Emphasize the ownership decision and the reliability constraints learned from fleet managers.",
    "[Sources]",
    "- User-provided case study: /Users/mustafa/paper/engine-immobilizer.html",
    "- User-provided image: /Users/mustafa/paper/case-media/engine/customer-call.png",
  ]);
  presentation.resolve(mappedAnchor("sl/l1fa2d")).speakerNotes.textFrame.setText([
    "Frame the solution as a safety model, not a single button: permission, preconditions, confirmation, status, auditability, and fallback.",
    "[Sources]",
    "- User-provided case study: /Users/mustafa/paper/engine-immobilizer.html",
    "- User-provided image: /Users/mustafa/paper/case-media/engine/iteration-final.png",
  ]);
  presentation.resolve(mappedAnchor("sl/eo2hm6")).speakerNotes.textFrame.setText([
    "Close the case study on business and customer impact before transitioning to Workflows.",
    "[Sources]",
    "- User-provided case study: /Users/mustafa/paper/engine-immobilizer.html",
  ]);

  // Keep every visual element inside the 1280 × 720 canvas. The source deck
  // used oversized image frames as crops; these equivalent in-canvas frames
  // retain the visible composition while avoiding overflow warnings.
  for (const [anchorId, frame] of [
    ["im/sna14jal", { left: 0, top: 356.24, width: 606.73, height: 363.76 }],
    ["im/to3ixor6", { left: 0, top: 372, width: 592, height: 348 }],
    ["im/yxsjy9sj", { left: 625.56, top: 356.24, width: 654.44, height: 363.76 }],
    ["im/jy10re94", { left: 640, top: 372, width: 640, height: 348 }],
    ["im/3m5c3u5w", { left: 74.93, top: 284, width: 1124.16, height: 436 }],
    ["im/2lwva94b", { left: 99.1, top: 306.9, width: 1074.23, height: 413.1 }],
    ["im/twn2pgj2", { left: 0, top: 356.24, width: 606.73, height: 363.76 }],
    ["im/sve1wb2h", { left: 0, top: 372, width: 592, height: 348 }],
    ["im/fipkrq1s", { left: 625.56, top: 356.24, width: 654.44, height: 363.76 }],
    ["im/ehgjylkn", { left: 640, top: 372, width: 640, height: 348 }],
    ["im/vepsfapw", { left: 77.92, top: 250.79, width: 1124.16, height: 469.21 }],
    ["im/utgbm58b", { left: 95.88, top: 272.57, width: 1089.66, height: 447.43 }],
    ["im/9sju9cnm", { left: 0, top: 286.28, width: 1280, height: 433.72 }],
    ["im/ji5o7yd0", { left: 76.44, top: 209.84, width: 1124.16, height: 510.16 }],
    ["im/yhw7ytcf", { left: 87.9, top: 222.59, width: 1101.35, height: 497.41 }],
  ]) {
    setImageFrame(presentation, anchorId, frame);
  }

  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await saveBlob(path.join(PREVIEW_DIR, `${stem}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(
      path.join(LAYOUT_DIR, `${stem}.layout.json`),
      await (await slide.export({ format: "layout" })).text(),
      "utf8",
    );
  }
  await saveBlob(
    path.join(WORKSPACE, "final-montage.webp"),
    await presentation.export({ format: "webp", montage: true, scale: 1 }),
  );
  const inspection = await presentation.inspect({
    kind: "deck,slide,textbox,shape,image,table,chart,notes,layout",
    maxChars: 120000,
  });
  await fs.writeFile(path.join(WORKSPACE, "final-inspect.ndjson"), inspection.ndjson, "utf8");

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUTPUT);
  console.log(JSON.stringify({ output: OUTPUT, slideCount: presentation.slides.items.length }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
