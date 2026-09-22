set inputDeck to POSIX file "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware.pptx"
set outputDeck to POSIX file "/Users/mustafa/paper/.tmp/immobilizer-dealerware/keynote-media-test.pptx"
set heroMovie to POSIX file "/Users/mustafa/paper/.tmp/immobilizer-dealerware/video-assets/immobilizer-hero-wide.mp4"

tell application "Keynote"
  activate
  set importedDocument to open inputDeck
  tell importedDocument
    tell slide 3
      set newMovie to make new image with properties {file:heroMovie}
      tell newMovie
        set position to {90, 332}
        set width to 1100
        set height to 314
        set movie volume to 0
        set repetition method to none
        set locked to true
      end tell
    end tell
  end tell
  export importedDocument to outputDeck as Microsoft PowerPoint
  close importedDocument saving no
end tell
