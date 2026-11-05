!include "LogicLib.nsh"

!macro NSIS_HOOK_POSTINSTALL
  ; $R0 = theme ("dark" or "light")
  ; $R1 = language code ("es", "en", "fr", "de", "it", "pt")
  StrCpy $R0 "dark"

  ${If} $LANGUAGE == 1034
    MessageBox MB_YESNO|MB_ICONQUESTION "¿Desea activar el Tema Oscuro por defecto en Easy Project?$\r$\n$\r$\n(Sí = Tema Oscuro, No = Tema Claro)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${ElseIf} $LANGUAGE == 1036
    MessageBox MB_YESNO|MB_ICONQUESTION "Souhaitez-vous activer le thème sombre par défaut dans Easy Project ?$\r$\n$\r$\n(Oui = Thème sombre, Non = Thème clair)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${ElseIf} $LANGUAGE == 1031
    MessageBox MB_YESNO|MB_ICONQUESTION "Möchten Sie standardmäßig das dunkle Design in Easy Project aktivieren?$\r$\n$\r$\n(Ja = Dunkles Design, Nein = Helles Design)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${ElseIf} $LANGUAGE == 1040
    MessageBox MB_YESNO|MB_ICONQUESTION "Vuoi attivare il tema scuro per impostazione predefinita in Easy Project?$\r$\n$\r$\n(Sì = Tema scuro, No = Tema chiaro)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${ElseIf} $LANGUAGE == 2070
    MessageBox MB_YESNO|MB_ICONQUESTION "Deseja ativar o tema escuro por padrão no Easy Project?$\r$\n$\r$\n(Sim = Tema escuro, Não = Tema claro)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${ElseIf} $LANGUAGE == 1046
    MessageBox MB_YESNO|MB_ICONQUESTION "Deseja ativar o tema escuro por padrão no Easy Project?$\r$\n$\r$\n(Sim = Tema escuro, Não = Tema claro)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${Else}
    MessageBox MB_YESNO|MB_ICONQUESTION "Would you like to enable Dark Theme by default in Easy Project?$\r$\n$\r$\n(Yes = Dark Theme, No = Light Theme)" /SD IDYES IDYES +2
    StrCpy $R0 "light"
  ${EndIf}

  StrCpy $R1 "en"
  ${If} $LANGUAGE == 1034
    StrCpy $R1 "es"
  ${ElseIf} $LANGUAGE == 1036
    StrCpy $R1 "fr"
  ${ElseIf} $LANGUAGE == 1031
    StrCpy $R1 "de"
  ${ElseIf} $LANGUAGE == 1040
    StrCpy $R1 "it"
  ${ElseIf} $LANGUAGE == 2070
    StrCpy $R1 "pt"
  ${ElseIf} $LANGUAGE == 1046
    StrCpy $R1 "pt"
  ${EndIf}

  ; Write initial_config.json to application directory ($INSTDIR)
  FileOpen $0 "$INSTDIR\initial_config.json" w
  FileWrite $0 '{"language":"$R1","theme":"$R0"}'
  FileClose $0

  ; Write initial_config.json to %APPDATA%\es.formatocd.easy-project
  CreateDirectory "$APPDATA\es.formatocd.easy-project"
  FileOpen $0 "$APPDATA\es.formatocd.easy-project\initial_config.json" w
  FileWrite $0 '{"language":"$R1","theme":"$R0"}'
  FileClose $0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$INSTDIR\initial_config.json"
!macroend
