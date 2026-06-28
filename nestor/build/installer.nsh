; ── Custom NSIS hooks for Nestor ─────────────────────────────────────────────
; Included automatically by electron-builder via nsis.include in package.json.

; ── Post-install: nothing extra needed ───────────────────────────────────────
!macro customInstall
!macroend

; ── Uninstall: ask whether to keep user data ─────────────────────────────────
!macro customUnInstall
  ; Ask before deleting anything that belongs to the user
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Möchtest du deine Nestor-Einstellungen und Daten behalten?$\n$\n\
Ja  → Einstellungen und Dateipfade bleiben erhalten.$\n\
Nein → Alle Daten werden vollständig gelöscht." \
    IDYES nestor_keep_data

  ; ── Delete user data ──────────────────────────────────────────────────────
  ; App data (electron-store config, onboarding state, history)
  RMDir /r "$APPDATA\nestor"
  ; Local data (logs, caches)
  RMDir /r "$LOCALAPPDATA\Nestor"
  ; Any leftover registry keys written by the app itself
  DeleteRegKey HKCU "Software\nestor"

  nestor_keep_data:
  ; ── Autostart-Eintrag IMMER entfernen (unabhängig von Datenwahl) ─────────────
  ; Wenn der Nutzer Autostart aktiviert hatte, bleibt sonst ein toter Run-Key
  ; in der Registry zurück, der beim Windows-Login eine Fehlermeldung erzeugt.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Nestor"

  ; The NSIS-generated uninstall entry (HKLM\...\Uninstall\Nestor_is1)
  ; is always removed by NSIS automatically — no extra step needed.
!macroend
