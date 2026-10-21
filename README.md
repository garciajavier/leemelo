# EPUB Karaoke (Angular 20)

Lector EPUB sin DRM que lee el libro en voz alta y resalta cada palabra mientras la pronuncia. Diseño mobile-first.

## Funcionalidades

- **Biblioteca local** (IndexedDB): los EPUB importados se guardan en el navegador con título, autor, portada y porcentaje leído.
- **Índice** del libro con el capítulo actual marcado («Estás aquí»), **progreso del libro en %** y deslizador para saltar a cualquier punto.
- **Narración** con la Web Speech API: voz, velocidad (0.5×–2×), pausa y continuar. Cambiar la voz o la velocidad se aplica al momento, desde la palabra actual.
- **Modo karaoke**: resaltado palabra a palabra y paso de página automático.
- **Leer desde clic**: con el modo activo, al tocar una palabra se empieza a leer desde ahí.
- **Marcadores**, posición de lectura y preferencias (voz, velocidad, tamaño de letra, tema y último libro) guardados.
- **Temas** claro, sepia y oscuro; importar arrastrando el fichero; gestos (deslizar para pasar página) y atajos de teclado (`Espacio`, `←` `→`, `Esc`).

## Requisitos

Node.js 22.12+ (o 20.19+) y npm.

## Desarrollo

```bash
npm install
npm start            # http://localhost:4200
npm run build        # build de producción en dist/epub-karaoke-mvp/browser
```

## Publicar en Netlify

El repositorio ya incluye la configuración:

- `netlify.toml`: comando `npm run build`, carpeta `dist/epub-karaoke-mvp/browser` y Node 22.
- `public/_headers`: cabeceras de seguridad (CSP compatible con epub.js, `nosniff`, `Referrer-Policy`, `Permissions-Policy`). Al estar en `public/` se copian al build, así que valen tanto para despliegues desde Git como para arrastrar la carpeta.

Opciones:

1. **Desde Git** (recomendado): sube el proyecto a GitHub/GitLab y en Netlify elige *Add new site → Import an existing project*. Netlify lee `netlify.toml`; cada push a la rama principal publica una versión nueva.
2. **Arrastrar y soltar**: ejecuta `npm run build` y arrastra la carpeta `dist/epub-karaoke-mvp/browser` en *Netlify → Sites → Deploy manually*.

La app es 100 % estática: no tiene backend, funciones ni base de datos. Los libros y preferencias se quedan en el navegador de cada usuario y la voz la genera el propio navegador.

## Arquitectura

Organizada según SOLID: cada servicio tiene una responsabilidad, y la narración depende de abstracciones, no de epub.js ni del navegador.

```text
src/app/
├── app.component.*          Contenedor: layout, tema, arrastrar y soltar, atajos de teclado
├── app.config.ts            Qué implementación usa cada abstracción (InjectionToken)
├── core/
│   ├── storage/             KeyValueStore (localStorage tras una interfaz)
│   ├── preferences/         PreferencesService: voz, velocidad, letra, tema, último libro
│   └── ui/                  LayoutService (panel lateral, ajustes) y ToastService (avisos)
├── library/
│   ├── library.repository   IndexedDB: libros, ficheros EPUB y "locations"
│   ├── book-data.repository Datos de cada libro: posición, marcadores, % leído
│   ├── library.service      Casos de uso: importar, abrir, quitar, restaurar el último libro
│   └── bookmarks.service    Marcadores del libro abierto
├── reader/
│   ├── reader.service       Adaptador de epub.js: render, navegación, temas, progreso
│   ├── toc.ts, reader-themes.ts, locations-cache.ts
├── narration/
│   ├── speech-engine.ts     Puerto de síntesis de voz (SPEECH_ENGINE)
│   ├── web-speech-engine.ts Implementación con la Web Speech API
│   ├── reading-surface.ts   Lo que la narración necesita del lector (READING_SURFACE)
│   ├── text-segmenter.ts    Funciones puras: párrafos, palabras, rangos DOM
│   ├── voices.service       Voces disponibles y voz efectiva
│   └── read-aloud.service   Karaoke: narra, resalta, pasa página y capítulo, leer desde clic
└── ui/                      Componentes standalone con OnPush y signals
    ├── top-bar, sidebar (índice, biblioteca, marcadores), reader-view,
    ├── player-bar, settings-sheet, toast
    └── shared/              icon, cover, import-button
```

- **Abstracciones inyectables:** `SPEECH_ENGINE`, `READING_SURFACE`, `KEY_VALUE_STORE` y `LOCATIONS_CACHE` se pueden sustituir. Por ejemplo, un TTS en la nube o un almacenamiento falso en pruebas, sin tocar a quien los usa.
- **Estado con signals:** no hay `detectChanges()` manual. Los eventos del iframe de epub.js actualizan signals y Angular repinta.
- **Estilos:** `src/styles.css` contiene los tokens de diseño y las piezas comunes (botones, chips, portadas, filas). Cada componente lleva su propia maquetación, mobile-first.
- **Persistencia:** IndexedDB (base `epub-karaoke`) guarda los libros. `localStorage` guarda la posición (`<id>:position`), los marcadores (`<id>:bookmarks`), el progreso (`<id>:progress`) y las preferencias (`epub-karaoke:prefs`).

## Limitaciones conocidas

- El evento `boundary` (palabra a palabra) depende del navegador y de la voz; si no se emite, el resaltado es aproximado. Chrome y Edge de escritorio dan los mejores resultados.
- Las voces disponibles dependen del sistema operativo y del navegador de cada usuario.
- EPUB con maquetación compleja (tablas, diseño fijo) pueden narrarse incompletos o en otro orden.
- La biblioteca es local: no se sincroniza entre dispositivos y se pierde si el usuario borra los datos del sitio.
- EPUB con DRM no está soportado.
