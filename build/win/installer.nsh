!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne" "" "Open in &Typewriter Nocturne"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne\command" "" `"$appExe" "%V"`

  WriteRegStr HKCU "Software\Classes\Directory\shell\TypewriterNocturne" "" "Open in &Typewriter Nocturne"
  WriteRegStr HKCU "Software\Classes\Directory\shell\TypewriterNocturne" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Directory\shell\TypewriterNocturne\command" "" `"$appExe" "%V"`

  WriteRegStr HKCU "Software\Classes\Drive\shell\TypewriterNocturne" "" "Open in &Typewriter Nocturne"
  WriteRegStr HKCU "Software\Classes\Drive\shell\TypewriterNocturne" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Drive\shell\TypewriterNocturne\command" "" `"$appExe" "%V"`
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\TypewriterNocturne"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\TypewriterNocturne"
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
