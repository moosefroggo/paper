set inputDeck to POSIX file "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware.pptx"
tell application "Keynote"
  set importedDocument to open inputDeck
  tell importedDocument
    set reportText to "doc=" & (width as text) & "x" & (height as text)
    tell slide 3
      set reportText to reportText & "; images=" & (count of images as text) & "; movies=" & (count of movies as text)
    end tell
  end tell
  close importedDocument saving no
  return reportText
end tell
