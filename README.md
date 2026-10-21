# Léemelo

*Escucha tus libros palabra a palabra* · [leemelo.netlify.app](https://leemelo.netlify.app) · Angular 20

Lector EPUB sin DRM que lee el libro en voz alta y resalta cada palabra mientras la pronuncia. Diseño mobile-first.

## Funcionalidades

- **Primer uso en 5 segundos:** «Probar con Don Quijote» y **8 clásicos gratis** de dominio público (5 en español y 3 en inglés).
- **Biblioteca local** (IndexedDB): libros importados y clásicos con portada y % leído. Al quitar un libro se puede **deshacer**.
- **Índice** con «Estás aquí», **progreso del libro** en %, deslizador para saltar y **tiempo restante** estimado del capítulo y del libro.
- **Narración** frase a frase con la Web Speech API: voces «natural» primero, **probar voz**, velocidad de 0.5× a 2× y **frase anterior/siguiente**. Cambiar la voz o la velocidad se aplica al momento.
- **Karaoke a dos niveles:** frase actual en suave y palabra actual en amarillo, con paso de página y de capítulo automático.
- **Leer desde clic:** con el modo activo, al tocar una palabra se lee desde ahí.
- **Temporizador de apagado:** 15, 30 o 60 minutos, o al terminar el capítulo.
- **Lectura cómoda:** tamaño de letra, tipo de letra (del libro, serif, sans, Atkinson Hyperlegible u OpenDyslexic), interlineado y temas automático, claro, sepia y oscuro.
- **PWA:** instalable, funciona sin conexión, aviso de nueva versión y «Abrir con» archivos EPUB en escritorio.
- **Mobile-first:** gestos (deslizar para pasar página), barra inferior y hoja de ajustes. Atajos de teclado (`Espacio`, `←` `→`, `Esc`). Pistas en el primer uso. Accesibilidad: foco dentro de los paneles, anuncio de capítulo y movimiento reducido.

## Requisitos

Node.js 22.12+ (o 20.19+) y npm.

## Desarrollo

```bash
npm install
npm start            # http://localhost:4200
npm run build        # build de producción en dist/leemelo/browser
```

## Publicar en Netlify

El repositorio ya incluye la configuración:

- `netlify.toml`: comando `npm run build`, carpeta `dist/leemelo/browser` y Node 22.
- `public/_headers`: cabeceras de seguridad (CSP compatible con epub.js, `nosniff`, `Referrer-Policy`, `Permissions-Policy`). Al estar en `public/` se copian al build, así que valen tanto para despliegues desde Git como para arrastrar la carpeta.

Opciones (al crear el sitio en Netlify, ponle de nombre **leemelo** para que la dirección sea `leemelo.netlify.app`):

1. **Desde Git** (recomendado): sube el proyecto a GitHub/GitLab y en Netlify elige *Add new site → Import an existing project*. Netlify lee `netlify.toml`; cada push a la rama principal publica una versión nueva.
2. **Arrastrar y soltar**: ejecuta `npm run build` y arrastra la carpeta `dist/leemelo/browser` en *Netlify → Sites → Deploy manually*.

La app es 100 % estática: no tiene backend, funciones ni base de datos. Los libros y preferencias se quedan en el navegador de cada usuario y la voz la genera el propio navegador.

## Arquitectura

Organizada según SOLID: cada servicio tiene una responsabilidad, y la narración depende de abstracciones, no de epub.js ni del navegador.

```text
src/app/
├── app.component.*          Contenedor: layout, tema, arrastrar y soltar, atajos de teclado
├── app.config.ts            Qué implementación usa cada abstracción (InjectionToken)
├── core/
│   ├── storage/             KeyValueStore (localStorage tras una interfaz)
│   ├── preferences/         PreferencesService (voz, velocidad, letra, tipografía, tema, último libro)
│   ├── pwa/                 Aviso de nueva versión y «Abrir con» (file handlers)
│   └── ui/                  Layout, tema efectivo, avisos con acción y pistas de primer uso
├── library/
│   ├── library.repository   IndexedDB: libros, ficheros EPUB y "locations"
│   ├── book-data.repository Datos de cada libro: posición, marcadores, % leído
│   ├── library.service      Casos de uso: importar, abrir (también clásicos), quitar con deshacer, restaurar
│   ├── classics.ts          Catálogo de clásicos incluidos (public/classics)
│   └── bookmarks.service    Marcadores del libro abierto
├── reader/
│   ├── reader.service       Adaptador de epub.js: render, navegación, temas, progreso
│   ├── toc.ts, reader-themes.ts, locations-cache.ts
├── narration/
│   ├── speech-engine.ts     Puerto de síntesis de voz (SPEECH_ENGINE)
│   ├── web-speech-engine.ts Implementación con la Web Speech API
│   ├── reading-surface.ts   Lo que la narración necesita del lector (READING_SURFACE)
│   ├── text-segmenter.ts    Funciones puras: párrafos, palabras, rangos DOM
│   ├── voices.service       Voces disponibles (naturales primero) y voz efectiva
│   ├── read-aloud.service   Karaoke frase a frase: resalta frase y palabra, salta frases, leer desde clic
│   ├── sleep-timer.service  Temporizador de apagado
│   └── reading-time.ts      Estimación de tiempo de escucha
└── ui/                      Componentes standalone con OnPush y signals
    ├── top-bar, sidebar (índice, biblioteca, marcadores), reader-view,
    ├── player-bar, settings-sheet, toast
    └── shared/              icon, cover, import-button, focus-trap
```

- **Abstracciones inyectables:** `SPEECH_ENGINE`, `READING_SURFACE`, `KEY_VALUE_STORE` y `LOCATIONS_CACHE` se pueden sustituir. Por ejemplo, un TTS en la nube o un almacenamiento falso en pruebas, sin tocar a quien los usa.
- **Estado con signals:** no hay `detectChanges()` manual. Los eventos del iframe de epub.js actualizan signals y Angular repinta.
- **Estilos:** `src/styles.css` contiene los tokens de diseño y las piezas comunes (botones, chips, portadas, filas). Cada componente lleva su propia maquetación, mobile-first.
- **Persistencia:** IndexedDB (base `epub-karaoke`, nombre heredado para conservar los datos) guarda los libros. `localStorage` guarda la posición (`<id>:position`), los marcadores (`<id>:bookmarks`), el progreso (`<id>:progress`) y las preferencias (`epub-karaoke:prefs`).

## Limitaciones conocidas

- El evento `boundary` (palabra a palabra) depende del navegador y de la voz; si no se emite, el resaltado es aproximado. Chrome y Edge de escritorio dan los mejores resultados.
- Las voces disponibles dependen del sistema operativo y del navegador de cada usuario.
- EPUB con maquetación compleja (tablas, diseño fijo) pueden narrarse incompletos o en otro orden.
- La biblioteca es local: no se sincroniza entre dispositivos y se pierde si el usuario borra los datos del sitio.
- EPUB con DRM no está soportado.

## Créditos y licencias

- **Clásicos** (`public/classics/`): obras de dominio público de [Project Gutenberg](https://www.gutenberg.org/), sin modificar. Cada EPUB incluye la licencia de Project Gutenberg. Se ofrecen gratis.
- **Fuentes** (`public/fonts/`): Atkinson Hyperlegible (Braille Institute) y OpenDyslexic (Abbie Gonzalez), bajo SIL Open Font License 1.1 (ver `OFL-*.txt`).
- **Librerías:** Angular, epub.js y JSZip (ver `package.json`).
