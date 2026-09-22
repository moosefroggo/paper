set sourceDeckPath to "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware.pptx"
set outputDeckPath to "/Users/mustafa/paper/.tmp/immobilizer-dealerware/powerpoint-media-test.pptx"
set moviePath to "/Users/mustafa/paper/.tmp/immobilizer-dealerware/video-assets/immobilizer-hero-wide.mp4"

tell application "Microsoft PowerPoint"
  activate
  open POSIX file sourceDeckPath
  set targetPresentation to active presentation
  set targetSlide to slide 3 of targetPresentation
  set view type of active window to slide view
  set slide of view of active window to targetSlide
  set priorShapeCount to count of shapes of targetSlide
end tell

delay 1
tell application "System Events"
  tell process "Microsoft PowerPoint"
    set frontmost to true
    click menu item "Movie from File..." of menu 1 of menu item "Video" of menu "Insert" of menu bar 1
    delay 1
    keystroke "g" using {command down, shift down}
    delay 1
    keystroke moviePath
    key code 36
    delay 1
    key code 36
  end tell
end tell

tell application "Microsoft PowerPoint"
  repeat 100 times
    if (count of shapes of targetSlide) is greater than priorShapeCount then exit repeat
    delay 0.2
  end repeat
  if (count of shapes of targetSlide) is not greater than priorShapeCount then error "Video insertion timed out"
  set newMovie to last shape of targetSlide
  tell newMovie
    set lock aspect ratio to false
    set left position to 67.5
    set top to 249
    set width to 825
    set height to 235.5
    set name to "Immobilizer Hero Video"
  end tell
  save targetPresentation in POSIX file outputDeckPath as save as Open XML presentation
  set reportText to (name of newMovie) & "; type=" & (shape type of newMovie as text) & "; media=" & (media type of newMovie as text) & "; frame=" & (left position of newMovie as text) & "," & (top of newMovie as text) & "," & (width of newMovie as text) & "," & (height of newMovie as text)
  close targetPresentation
  return reportText
end tell
