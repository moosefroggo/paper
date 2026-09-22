set sourceDeck to POSIX file "/Users/mustafa/paper/.tmp/immobilizer-dealerware/powerpoint-media-test.pptx"
set outputDeck to POSIX file "/Users/mustafa/paper/.tmp/immobilizer-dealerware/powerpoint-roundrect-test.pptx"
tell application "Microsoft PowerPoint"
  open sourceDeck
  set targetPresentation to active presentation
  set targetMovie to shape "Immobilizer Hero Video" of slide 3 of targetPresentation
  set auto shape type of targetMovie to autoshape rounded rectangle
  save targetPresentation in outputDeck as save as Open XML presentation
  close targetPresentation
end tell
