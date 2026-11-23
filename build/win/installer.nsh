!macro customInstall
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne" "" "Open TypeNoc &here"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne\command" "" `"$appExe" "%V"`

  WriteRegStr HKCU "Software\Classes\Directory\shell\TypewriterNocturne" "" "Open TypeNoc &here"
  WriteRegStr HKCU "Software\Classes\Directory\shell\TypewriterNocturne" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Directory\shell\TypewriterNocturne\command" "" `"$appExe" "%V"`

  WriteRegStr HKCU "Software\Classes\Drive\shell\TypewriterNocturne" "" "Open TypeNoc &here"
  WriteRegStr HKCU "Software\Classes\Drive\shell\TypewriterNocturne" "Icon" `"$appExe"`
  WriteRegStr HKCU "Software\Classes\Drive\shell\TypewriterNocturne\command" "" `"$appExe" "%V"`

  ; [nocturne] "Open TypeNoc here" at the top level of the Windows 11 menu: the signed sparse
  ; package, when this build has one (bin/ci/build-context-menu.ps1). Without it, the entries above
  ; are under "Show more options".
  IfFileExists "$INSTDIR\resources\context-menu\TypeNocContextMenu.msix" 0 +2
    nsExec::Exec `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Add-AppxPackage -Path '$INSTDIR\resources\context-menu\TypeNocContextMenu.msix' -ExternalLocation '$INSTDIR'"`
!macroend

!macro customUnInstall
  nsExec::Exec `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-AppxPackage TypewriterNocturne.ContextMenu | Remove-AppxPackage"`
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\TypewriterNocturne"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\TypewriterNocturne"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\TypewriterNocturne"
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
