# Fuentes originales del libro 2019 (no se versionan)

El libro 2019 usó tres fuentes comerciales. Su licencia no permite
redistribuirlas, así que git ignora todo lo que se copie en esta carpeta
salvo este archivo.

| Familia | Archivos que hacen falta | Dónde está |
|---|---|---|
| Nirmala UI | Regular **y** Bold: `Nirmala.ttf` + `NirmalaB.ttf` (Windows 10) o `Nirmala.ttc` (Windows 11) | `C:\Windows\Fonts` |
| Minion Pro | `MinionPro-Regular.otf` | Adobe Fonts / Creative Cloud |
| Modernica | `Modernica-Bold.otf` | licencia comercial |

Con los archivos aquí (o en otra carpeta pasada con `--fuentes`), el script
usa la fuente original a su tamaño real. Si falta la regular o la negrita
de una familia, avisa y usa la sustituta libre de `../fonts/` con el factor
de cuerpo que iguala el ancho del texto.
