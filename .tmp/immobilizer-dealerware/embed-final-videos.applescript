set sourceDeckPath to "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware.pptx"
set outputDeckPath to "/Users/mustafa/paper/Mustafa-Portfolio-Deck-Dealerware-Video.pptx"

set heroPath to "/Users/mustafa/paper/.tmp/immobilizer-dealerware/video-assets/immobilizer-hero-final.mp4"
set featureReelPath to "/Users/mustafa/paper/.tmp/immobilizer-dealerware/video-assets/immobilizer-feature-reel.mp4"
set morphPath to "/Users/mustafa/paper/.tmp/immobilizer-dealerware/video-assets/morph-demo.mp4"

tell application "Microsoft PowerPoint"
  activate
  repeat with openPresentation in presentations
    try
      if (full name of openPresentation) is sourceDeckPath then close openPresentation saving no
    end try
  end repeat
  open POSIX file sourceDeckPath
  set targetPresentation to active presentation
end tell

set heroReport to my insertMovieOnSlide(targetPresentation, 3, heroPath, 67.5, 249, 825, 235.5, "Immobilizer Hero Video")
set reelReport to my insertMovieOnSlide(targetPresentation, 6, featureReelPath, 465, 163.5, 442.5, 300, "Immobilizer Feature Reel")
set morphReport to my insertMovieOnSlide(targetPresentation, 23, morphPath, 65.927, 166.942, 826.013, 373.058, "Morph Side Project Video")

tell application "Microsoft PowerPoint"
  save targetPresentation in POSIX file outputDeckPath as save as Open XML presentation
  close targetPresentation
end tell

return heroReport & linefeed & reelReport & linefeed & morphReport

on insertMovieOnSlide(targetPresentation, slideNumber, moviePath, frameLeft, frameTop, frameWidth, frameHeight, movieName)
  tell application "Microsoft PowerPoint"
    activate
    set targetSlide to slide slideNumber of targetPresentation
    set view type of active window to slide view
    set slide of view of active window to targetSlide
    set priorShapeCount to count of shapes of targetSlide
  end tell

  delay 0.8
  tell application "System Events"
    tell process "Microsoft PowerPoint"
      set frontmost to true
      click menu item "Movie from File..." of menu 1 of menu item "Video" of menu "Insert" of menu bar 1
      delay 0.8
      keystroke "g" using {command down, shift down}
      delay 0.5
      keystroke moviePath
      key code 36
      delay 0.7
      key code 36
    end tell
  end tell

  tell application "Microsoft PowerPoint"
    repeat 200 times
      if (count of shapes of targetSlide) is greater than priorShapeCount then exit repeat
      delay 0.2
    end repeat
    if (count of shapes of targetSlide) is not greater than priorShapeCount then error "Video insertion timed out on slide " & slideNumber

    set newMovie to last shape of targetSlide
    tell newMovie
      set lock aspect ratio to false
      set left position to frameLeft
      set top to frameTop
      set width to frameWidth
      set height to frameHeight
      set name to movieName
      set auto shape type to autoshape rounded rectangle
    end tell
    tell animation play settings of animation settings of newMovie
      set play on entry to false
      set loop until stopped to false
      set hide while not playing to false
      set rewind move to true
    end tell

    return "slide " & slideNumber & ": " & movieName & " (" & (width of newMovie as text) & " x " & (height of newMovie as text) & ")"
  end tell
end insertMovieOnSlide
