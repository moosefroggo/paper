import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const source =
  "/Users/mustafa/Downloads/Mustafa-Portfolio-Deck-Rebuilt.pptx";

const presentation = await PresentationFile.importPptx(
  await FileBlob.load(source),
);

const snapshot = await presentation.inspect({
  kind: "slide,textbox,image",
  search:
    "While working with multiple engineering and product teams, I shipped pretty much everything",
  maxChars: 12000,
});

console.log(snapshot.ndjson);
console.log(
  JSON.stringify(
    presentation.help("delete or remove a shape or image from a slide", {
      include: ["index", "examples", "notes"],
      maxChars: 10000,
    }),
    null,
    2,
  ),
);
