import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/mustafa/paper/.deck-build/pitch-rebuild";
const ASSETS = path.join(ROOT, "assets");
const RENDERED = path.join(ROOT, "rendered");
const FINAL = "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Rebuilt.pptx";

const W = 1280;
const H = 720;
const M = 72;

const C = {
  white: "#F7F8F7",
  blush: "#F7EDEF",
  blushStrong: "#F1DFE4",
  green: "#061D16",
  green2: "#0A2B22",
  ink: "#151716",
  muted: "#6F716E",
  line: "#DDE2DF",
  soft: "#EFF1EF",
  orange: "#B65327",
  paleGreen: "#B9CBB8",
  whiteText: "#F7F8F7",
};

const F = {
  serif: "GT Sectra Fine",
  sans: "GT Haptik",
};

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

const imageCache = new Map();
async function imageBytes(name) {
  if (!imageCache.has(name)) {
    const bytes = await fs.readFile(path.join(ASSETS, name));
    imageCache.set(
      name,
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
  }
  return imageCache.get(name);
}

function addText(slide, text, x, y, w, h, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontFamily: options.fontFamily ?? F.sans,
    fontSize: options.fontSize ?? 20,
    color: options.color ?? C.ink,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    alignment: options.alignment ?? "left",
    verticalAlignment: options.verticalAlignment ?? "top",
  };
  return shape;
}

function addRect(slide, x, y, w, h, fill, options = {}) {
  return slide.shapes.add({
    geometry: options.geometry ?? "rect",
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: {
      style: "solid",
      fill: options.lineFill ?? fill,
      width: options.lineWidth ?? 0,
    },
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
  });
}

function addRule(slide, x, y, w, color = C.line, height = 1) {
  return addRect(slide, x, y, w, height, color);
}

async function addImage(slide, name, x, y, w, h, options = {}) {
  return slide.images.add({
    blob: await imageBytes(name),
    contentType: "image/png",
    alt: options.alt ?? name.replace(/[-.]/g, " "),
    fit: options.fit ?? "cover",
    position: { left: x, top: y, width: w, height: h },
    geometry: options.geometry ?? "roundRect",
    borderRadius: options.borderRadius ?? "rounded-xl",
  });
}

function addEyebrow(slide, text, color = C.muted, x = M, y = 48) {
  addText(slide, text.toUpperCase(), x, y, 460, 26, {
    fontFamily: F.sans,
    fontSize: 14,
    bold: true,
    color,
  });
}

function addTitle(slide, text, options = {}) {
  return addText(
    slide,
    text,
    options.x ?? M,
    options.y ?? 88,
    options.w ?? 1070,
    options.h ?? 132,
    {
      fontFamily: F.serif,
      fontSize: options.fontSize ?? 50,
      color: options.color ?? C.ink,
      bold: options.bold ?? false,
      name: options.name ?? "slide-title",
    },
  );
}

function addBody(slide, text, x, y, w, h, options = {}) {
  return addText(slide, text, x, y, w, h, {
    fontFamily: F.sans,
    fontSize: options.fontSize ?? 20,
    color: options.color ?? C.muted,
    bold: options.bold ?? false,
    name: options.name,
  });
}

function addBulletList(slide, items, x, y, w, options = {}) {
  const gap = options.gap ?? 44;
  const fontSize = options.fontSize ?? 20;
  items.forEach((item, index) => {
    addText(slide, "•", x, y + index * gap, 20, 28, {
      fontSize,
      bold: true,
      color: options.bulletColor ?? C.ink,
    });
    addBody(slide, item, x + 28, y + index * gap, w - 28, gap, {
      fontSize,
      color: options.color ?? C.ink,
    });
  });
}

function addNotes(slide, sourceSlides, presenter = "") {
  const sources = sourceSlides
    .map(
      (slideNumber) =>
        `- User-provided Pitch deck, slide ${slideNumber}: https://pitch.com/v/slide-deck-jq3j7w`,
    )
    .join("\n");
  const noteText = `${presenter ? `${presenter}\n\n` : ""}[Sources]\n${sources}`;
  slide.speakerNotes.textFrame.setText(noteText);
  slide.speakerNotes.setVisible(true);
}

function newSlide(presentation, background = C.white) {
  const slide = presentation.slides.add();
  slide.background.fill = background;
  return slide;
}

async function build() {
  await fs.mkdir(RENDERED, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Positioning
  {
    const slide = newSlide(deck, C.white);
    addText(slide, "Mustafa", M, 54, 500, 92, {
      fontFamily: F.serif,
      fontSize: 72,
      color: C.ink,
      name: "mustafa-title",
    });
    addText(slide, "Product designer who codes.", M, 150, 500, 42, {
      fontSize: 28,
      bold: true,
    });
    addBody(
      slide,
      "I design systems, products, and interfaces, then stay close enough to the code to help ship them.",
      M,
      212,
      500,
      84,
      { fontSize: 22 },
    );
    addRule(slide, 650, 62, 1, C.line, 230);
    addBulletList(
      slide,
      [
        "Built the core platform for Educative’s B2B offerings",
        "Shipped a FERPA-compliant recruitment platform in under two weeks",
        "Led Educative’s first design system across B2C and B2B",
      ],
      690,
      72,
      500,
      { fontSize: 19, gap: 62, bulletColor: C.paleGreen },
    );
    await addImage(slide, "photo-collage.png", 0, 408, 860, 312, {
      fit: "cover",
      borderRadius: 0,
      geometry: "rect",
      alt: "Mustafa’s personal photography collage",
    });
    addRect(slide, 860, 408, 420, 312, C.green);
    addText(slide, "Design\nResearch\nSystems\nCode", 914, 452, 270, 210, {
      fontFamily: F.serif,
      fontSize: 35,
      color: C.whiteText,
    });
    addNotes(
      slide,
      [1, 19, 24],
      "Open with the throughline: product design depth plus the ability to ship in code.",
    );
  }

  // 2. Overview
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "Selected work");
    addTitle(slide, "Three projects, one throughline", { w: 850 });
    const rows = [
      ["01", "Workflows", "Product strategy and interaction design"],
      ["02", "Capstone Matchmaker", "Design and full-stack development"],
      ["03", "Design System + Motion", "Foundations, components, and behavior"],
    ];
    rows.forEach((row, index) => {
      const y = 258 + index * 124;
      addRule(slide, M, y - 22, 1136, index === 0 ? C.ink : C.line, 1);
      addText(slide, row[0], M, y, 70, 44, {
        fontFamily: F.serif,
        fontSize: 28,
        color: C.muted,
      });
      addText(slide, row[1], 180, y - 2, 430, 48, {
        fontFamily: F.serif,
        fontSize: 34,
      });
      addBody(slide, row[2], 670, y + 6, 500, 40, { fontSize: 19 });
    });
    addNotes(slide, [2], "Set expectations without slide numbers or false section parity.");
  }

  // 3. Workflows context
  {
    const slide = newSlide(deck, C.green);
    addEyebrow(slide, "Workflows", C.paleGreen);
    addTitle(slide, "Educative’s growth exposed a coordination problem.", {
      color: C.whiteText,
      w: 920,
      h: 120,
      fontSize: 50,
    });
    addBody(
      slide,
      "The company grew from 50 to 600 people in about two years. PRDs waited on approvals, deadlines slipped, and teams repeated work.",
      M,
      210,
      860,
      82,
      { color: "#D7E0DB", fontSize: 22 },
    );
    await addImage(slide, "workflows-hero.png", 90, 332, 1100, 314, {
      fit: "cover",
      alt: "Workflows product foundations screen",
    });
    addNotes(slide, [3], "Introduce the company scale before the product.");
  }

  // 4. Research
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "Research");
    addTitle(slide, "31 conversations changed the diagnosis.", {
      w: 870,
      h: 154,
      fontSize: 52,
    });
    addBody(
      slide,
      "I spoke with 18 engineering managers and 13 engineers.",
      M,
      236,
      620,
      40,
      { fontSize: 20, color: C.ink, bold: true },
    );
    addRect(slide, M, 300, 535, 350, C.blush);
    addRect(slide, 673, 300, 535, 350, C.soft);
    addText(slide, "Assumption", 104, 330, 300, 34, {
      fontSize: 16,
      bold: true,
      color: C.muted,
    });
    addText(slide, "The tooling was broken.", 104, 378, 420, 80, {
      fontFamily: F.serif,
      fontSize: 38,
    });
    addBulletList(
      slide,
      ["Standardize content", "Fix the journey", "Add more process"],
      104,
      494,
      420,
      { fontSize: 18, gap: 40 },
    );
    addText(slide, "Reality", 705, 330, 300, 34, {
      fontSize: 16,
      bold: true,
      color: C.muted,
    });
    addText(slide, "The workflow broke at handoffs.", 705, 378, 450, 92, {
      fontFamily: F.serif,
      fontSize: 38,
    });
    addBulletList(
      slide,
      ["Content was findable", "Delays exposed the gaps", "Existing tools still worked"],
      705,
      494,
      430,
      { fontSize: 18, gap: 40 },
    );
    addNotes(slide, [6], "State the research insight as a diagnosis, not a list of bullets.");
  }

  // 5. Problem hierarchy
  {
    const slide = newSlide(deck, C.blush);
    addEyebrow(slide, "Problem framing");
    addTitle(slide, "Structure had to come before visibility.", {
      w: 900,
      fontSize: 54,
    });
    addRule(slide, 640, 252, 1, "#CFBEC2", 320);
    addText(slide, "First-order problem", M, 270, 460, 32, {
      fontSize: 16,
      bold: true,
      color: C.muted,
    });
    addText(slide, "How might we organize the work?", M, 330, 480, 150, {
      fontFamily: F.serif,
      fontSize: 45,
    });
    addText(slide, "Second-order problem", 704, 270, 460, 32, {
      fontSize: 16,
      bold: true,
      color: C.muted,
    });
    addText(slide, "How might we make progress visible?", 704, 330, 480, 150, {
      fontFamily: F.serif,
      fontSize: 45,
    });
    addBody(
      slide,
      "The second question only becomes useful once everyone shares the same structure.",
      M,
      612,
      850,
      52,
      { fontSize: 20, color: C.ink },
    );
    addNotes(slide, [5, 7], "Explain the order of operations clearly.");
  }

  // 6. What was built
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "Product direction");
    addTitle(slide, "The product mirrored how Educative already worked.", {
      w: 930,
      fontSize: 48,
    });
    addBulletList(
      slide,
      [
        "A self-contained knowledge base",
        "A multiplayer editor for tasks and comments",
        "A review system modeled on pull requests",
        "A shared hierarchy from groups to subtasks",
      ],
      M,
      278,
      480,
      { fontSize: 20, gap: 58, bulletColor: C.orange },
    );
    await addImage(slide, "workflows-hero.png", 620, 218, 590, 400, {
      fit: "cover",
      alt: "Workflows foundations interface",
    });
    addNotes(slide, [8], "Connect the feature set to the working model uncovered in research.");
  }

  // 7. Timeline
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "Build timeline");
    addTitle(slide, "A one-week MVP became an eight-month platform.", {
      w: 980,
      h: 160,
      fontSize: 51,
    });
    addBody(
      slide,
      "The first release proved the workflow. The following months turned it into a durable product.",
      M,
      260,
      800,
      58,
      { fontSize: 21 },
    );
    addRect(slide, 160, 430, 960, 4, C.line);
    const points = [
      { x: 190, label: "Week 1", title: "MVP shipped", body: "Proved the core workflow" },
      { x: 640, label: "Months 2–4", title: "Learned and rebuilt", body: "Research and feedback reshaped it" },
      { x: 1090, label: "Month 8", title: "Platform shipped", body: "Planning, review, and docs connected" },
    ];
    points.forEach((point, index) => {
      addRect(slide, point.x - 12, 420, 24, 24, index === 2 ? C.green : C.blushStrong, {
        geometry: "ellipse",
      });
      addText(slide, point.label, point.x - 110, 350, 220, 28, {
        fontSize: 15,
        bold: true,
        color: C.muted,
        alignment: "center",
      });
      addText(slide, point.title, point.x - 130, 476, 260, 66, {
        fontFamily: F.serif,
        fontSize: 28,
        alignment: "center",
      });
      addBody(slide, point.body, point.x - 145, 552, 290, 58, {
        fontSize: 17,
        alignment: "center",
      });
    });
    addNotes(slide, [8, 10], "Resolve the apparent conflict between one week and eight months.");
  }

  // 8. Feedback
  {
    const slide = newSlide(deck, C.blush);
    addEyebrow(slide, "Iteration");
    addTitle(slide, "Feedback changed three interaction decisions.", {
      w: 940,
      fontSize: 49,
    });
    const decisions = [
      ["01", "Reading", "Interactive underlines replaced highlighting."],
      ["02", "Coordination", "Tasks and comments moved into one view."],
      ["03", "Action", "Primary CTAs moved forward in the hierarchy."],
    ];
    decisions.forEach((item, index) => {
      const x = M + index * 380;
      addText(slide, item[0], x, 240, 48, 28, {
        fontFamily: F.serif,
        fontSize: 24,
        color: C.muted,
      });
      addText(slide, item[1], x, 286, 300, 38, {
        fontFamily: F.serif,
        fontSize: 31,
      });
      addBody(slide, item[2], x, 340, 325, 72, {
        fontSize: 18,
        color: C.ink,
      });
    });
    await addImage(slide, "workflows-improvements.png", M, 462, 520, 190, {
      fit: "cover",
      alt: "Workflows interaction improvement annotations",
    });
    await addImage(slide, "workflows-feedback.png", 688, 462, 520, 190, {
      fit: "cover",
      alt: "Workflows feedback annotations",
    });
    addNotes(slide, [11, 12, 13], "Make the design decisions the primary read and screenshots the evidence.");
  }

  // 9. Shipped platform
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "What shipped");
    addTitle(slide, "Planning, review, and documentation became one system.", {
      w: 1010,
      fontSize: 47,
    });
    const gallery = [
      ["task-hub.png", "Task hub"],
      ["review-hub.png", "Review hub"],
      ["projects.png", "Projects"],
      ["document-editor.png", "Document editor"],
    ];
    for (let index = 0; index < gallery.length; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? M : 668;
      const labelY = row === 0 ? 238 : 470;
      const imageY = row === 0 ? 272 : 504;
      addText(slide, gallery[index][1], x, labelY, 500, 30, {
        fontSize: 16,
        bold: true,
        color: C.muted,
      });
      await addImage(slide, gallery[index][0], x, imageY, 540, 160, {
        fit: "cover",
        alt: `${gallery[index][1]} product screen`,
      });
    }
    addNotes(slide, [14, 15, 16, 17], "Use this as the product synthesis slide, not four separate reveals.");
  }

  // 10. Impact
  {
    const slide = newSlide(deck, C.green);
    addEyebrow(slide, "Impact", C.paleGreen);
    addText(slide, "Six-figure deal", M, 176, 850, 120, {
      fontFamily: F.serif,
      fontSize: 76,
      color: C.whiteText,
    });
    addText(slide, "closed", M, 292, 500, 100, {
      fontFamily: F.serif,
      fontSize: 76,
      color: C.paleGreen,
    });
    addBody(
      slide,
      "Workflows helped Educative close its biggest customer yet.",
      760,
      240,
      410,
      110,
      { fontSize: 26, color: C.whiteText },
    );
    addRule(slide, M, 600, 1136, "#28483E", 1);
    addBody(
      slide,
      "The outcome tied the product directly to enterprise growth.",
      M,
      626,
      760,
      44,
      { fontSize: 18, color: "#BFD0C8" },
    );
    addNotes(slide, [18], "Be precise about what the source deck claims: a six-figure deal and the biggest customer yet.");
  }

  // 11. Capstone
  {
    const slide = newSlide(deck, C.green);
    addEyebrow(slide, "Capstone Matchmaker", "#D6B09C");
    addTitle(slide, "A FERPA-compliant recruitment platform, shipped in under two weeks.", {
      color: C.whiteText,
      w: 1080,
      h: 150,
      fontSize: 49,
    });
    addBody(
      slide,
      "I designed and built the SaaS product end to end with Next.js, PostgreSQL, and AWS EC2.",
      M,
      220,
      870,
      64,
      { color: "#D5E1DB", fontSize: 21 },
    );
    await addImage(slide, "capstone-hero.png", 90, 334, 1100, 304, {
      fit: "cover",
      alt: "Capstone Matchmaker sponsor landing page",
    });
    addNotes(slide, [1, 19], "Lead with the product and constraint, not the stack or AI credits.");
  }

  // 12. Code-first
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "Build approach");
    addTitle(slide, "Code-first kept the build focused.", {
      w: 520,
      h: 154,
      fontSize: 52,
    });
    addBody(
      slide,
      "I moved from design intent to working components with Radix UI and shadcn/ui, using AI-assisted development to accelerate implementation.",
      M,
      248,
      520,
      124,
      { fontSize: 21, color: C.ink },
    );
    addText(slide, "What stayed mine", M, 390, 300, 34, {
      fontSize: 16,
      bold: true,
      color: C.muted,
    });
    addBulletList(
      slide,
      ["Product decisions", "Information architecture", "Interaction model", "Quality bar"],
      M,
      438,
      430,
      { fontSize: 18, gap: 42, bulletColor: C.orange },
    );
    await addImage(slide, "tech-stack.png", 650, 94, 540, 220, {
      fit: "contain",
      alt: "Capstone Matchmaker technology stack",
    });
    await addImage(slide, "ui-components.png", 650, 350, 540, 280, {
      fit: "cover",
      alt: "Capstone Matchmaker coded UI components",
    });
    addNotes(slide, [20, 21, 22], "Explain code-first as a product decision, not a shortcut.");
  }

  // 13. Dashboards
  {
    const slide = newSlide(deck, C.blush);
    addEyebrow(slide, "Shipped product");
    addTitle(slide, "Five personas received actionable dashboards.", {
      w: 980,
      h: 154,
      fontSize: 49,
    });
    addBody(
      slide,
      "The interface surfaced matching, compliance, and deadline work across mobile and desktop.",
      M,
      246,
      830,
      54,
      { fontSize: 21, color: C.ink },
    );
    await addImage(slide, "dashboard.png", 164, 334, 952, 330, {
      fit: "cover",
      alt: "Capstone Matchmaker mobile and desktop dashboards",
    });
    addNotes(slide, [23], "Show the outcome of the code-first build.");
  }

  // 14. Design system
  {
    const slide = newSlide(deck, C.green);
    addEyebrow(slide, "Design System", C.paleGreen);
    addTitle(slide, "Educative’s first design system unified B2C and B2B products.", {
      color: C.whiteText,
      w: 1050,
      h: 140,
      fontSize: 48,
    });
    addBody(
      slide,
      "I led the design and implementation from foundations through reusable patterns.",
      M,
      212,
      840,
      56,
      { color: "#D7E0DB", fontSize: 21 },
    );
    await addImage(slide, "design-system-palettes.png", 72, 318, 1136, 314, {
      fit: "cover",
      alt: "Educative design system color palettes and accessibility checks",
    });
    addNotes(slide, [24], "State the system’s scope without the redundant phrase 'first design system redesigned.'");
  }

  // 15. Foundations
  {
    const slide = newSlide(deck, C.white);
    addEyebrow(slide, "Foundations");
    addTitle(slide, "The system documented the decisions every product shared.", {
      w: 970,
      h: 160,
      fontSize: 48,
    });
    addBulletList(
      slide,
      ["Type hierarchy", "Color and contrast", "Accessibility", "Elevation and shadows"],
      M,
      350,
      380,
      { fontSize: 20, gap: 58, bulletColor: C.paleGreen },
    );
    await addImage(slide, "foundations.png", 520, 312, 670, 360, {
      fit: "cover",
      alt: "Educative design system typography, color, and shadow foundations",
    });
    addNotes(slide, [25], "Describe what the foundation artifact contains before moving to motion.");
  }

  // 16. Motion
  {
    const slide = newSlide(deck, C.blush);
    addEyebrow(slide, "Motion");
    addTitle(slide, "The motion library extended the system beyond static components.", {
      w: 1010,
      h: 160,
      fontSize: 47,
    });
    addBody(
      slide,
      "Reusable controls gave teams a shared way to tune material, movement, and speed.",
      M,
      252,
      750,
      60,
      { fontSize: 21, color: C.ink },
    );
    await addImage(slide, "motion-library.png", 200, 354, 880, 310, {
      fit: "cover",
      alt: "Motion library with color and animation controls",
    });
    addNotes(slide, [26], "Connect motion back to the design system rather than presenting it as a separate gallery.");
  }

  // 17. Close
  {
    const slide = newSlide(deck, C.green);
    addEyebrow(slide, "Mustafa", C.paleGreen);
    addText(slide, "Questions?", M, 142, 820, 116, {
      fontFamily: F.serif,
      fontSize: 78,
      color: C.whiteText,
    });
    addBody(
      slide,
      "Product design, systems, and code.",
      M,
      280,
      660,
      54,
      { fontSize: 25, color: "#D7E0DB" },
    );
    addRule(slide, M, 430, 1136, "#28483E", 1);
    addText(slide, "Email", M, 470, 180, 28, {
      fontSize: 15,
      bold: true,
      color: C.paleGreen,
    });
    addText(slide, "hello@mstf.work", M, 510, 430, 42, {
      fontSize: 24,
      color: C.whiteText,
    });
    addText(slide, "Phone", 650, 470, 180, 28, {
      fontSize: 15,
      bold: true,
      color: C.paleGreen,
    });
    addText(slide, "+1 737 389 0364", 650, 510, 430, 42, {
      fontSize: 24,
      color: C.whiteText,
    });
    addNotes(slide, [27], "Close by returning to the positioning from slide one.");
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(
      path.join(RENDERED, `${stem}.png`),
      await deck.export({ slide, format: "png", scale: 1 }),
    );
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(RENDERED, `${stem}.layout.json`), await layout.text());
  }

  await writeBlob(
    path.join(ROOT, "deck-montage.webp"),
    await deck.export({ format: "webp", montage: true, scale: 1 }),
  );

  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(FINAL);

  console.log(JSON.stringify({ output: FINAL, slides: deck.slides.items.length }));
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
