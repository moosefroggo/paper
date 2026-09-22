#!/bin/zsh
set -euo pipefail

source_deck="/Users/mustafa/Downloads/Mustafa-Portfolio-Deck-Rebuilt.pptx"
edited_deck="/Users/mustafa/paper/Mustafa-Portfolio-Deck-Separate-Screens.pptx"
work_dir="$(mktemp -d /private/tmp/pptx-video-preserve.XXXXXX)"
final_dir="$work_dir/final"
source_dir="$work_dir/source"
patched_deck="$work_dir/patched.pptx"

mkdir -p "$final_dir" "$source_dir"

unzip -q "$edited_deck" -d "$final_dir"
unzip -q "$source_deck" \
  "ppt/slides/slide15.xml" \
  "ppt/slides/_rels/slide15.xml.rels" \
  "ppt/media/media1.mov" \
  -d "$source_dir"

cp "$source_dir/ppt/slides/slide15.xml" \
  "$final_dir/ppt/slides/slide18.xml"
cp "$source_dir/ppt/slides/_rels/slide15.xml.rels" \
  "$final_dir/ppt/slides/_rels/slide18.xml.rels"
cp "$source_dir/ppt/media/media1.mov" \
  "$final_dir/ppt/media/media1.mov"

sed -i '' \
  "s#notesSlide15.xml#notesSlide18.xml#g" \
  "$final_dir/ppt/slides/_rels/slide18.xml.rels"

if ! rg -q 'Extension="mov"' "$final_dir/[Content_Types].xml"; then
  perl -0pi -e \
    's#</Types>#<Default Extension="mov" ContentType="video/quicktime"/></Types>#' \
    "$final_dir/[Content_Types].xml"
fi

(
  cd "$final_dir"
  zip -qr "$patched_deck" .
)

mv "$patched_deck" "$edited_deck"

print "$edited_deck"
