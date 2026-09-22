tell application "Microsoft PowerPoint"
  activate
end tell
delay 2
tell application "System Events"
  tell process "Microsoft PowerPoint"
    set frontmost to true
    set itemNames to name of every menu item of menu of menu item "Video" of menu "Insert" of menu bar 1
  end tell
end tell
return itemNames
