set sourceDeck to POSIX file "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware.pptx"
set outputDeck to POSIX file "/Users/mustafa/paper/.tmp/immobilizer-dealerware/powerpoint-roundtrip.pptx"

tell application "Microsoft PowerPoint"
  activate
  open sourceDeck
  set targetPresentation to active presentation
  save targetPresentation in outputDeck as save as Open XML presentation
  close targetPresentation
end tell
