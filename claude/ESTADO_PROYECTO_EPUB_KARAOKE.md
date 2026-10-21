# Proyecto: Lector EPUB con narración y modo karaoke

**Estado:** arranque verificado (P0 cerrado); flujo con EPUB real y narración pendientes de validación manual.  
**Tecnología:** Angular 20, TypeScript, epub.js y Web Speech API.  
**Fecha del estado:** 21 de octubre de 2026.

## 1. Qué se quería crear

Una **aplicación web Angular** capaz de:

1. Importar y leer libros EPUB desde el equipo.
2. Mostrar el libro con navegación entre páginas y capítulos.
3. Añadir **marcadores** y recuperar el punto donde se dejó la lectura.
4. Leer el contenido en voz alta mediante **texto a voz (TTS)**, sin necesidad de tener un audiolibro grabado.
5. Resaltar la palabra o fragmento que se está pronunciando, como un **karaoke**.
6. Desplazarse o cambiar de página automáticamente para mantener visible el texto que se narra.
7. Permitir controlar reproducción, pausa y velocidad de lectura.

### Alcance acordado

- **Plataforma:** web (Angular), no aplicación móvil nativa ni escritorio.
- **Audio:** síntesis de voz automática del navegador, no sincronización con archivos MP3 externos.
- **Primera versión:** ejecución local, sin backend ni registro de usuarios.
- **Formatos iniciales:** EPUB sin DRM.

## 2. Arquitectura prevista

```text
Aplicación Angular
├── UI del lector y reproductor
├── Motor EPUB (epub.js)
│   ├── Importación y renderizado
│   ├── Navegación / capítulos
│   └── Posiciones EPUB CFI
├── Motor TTS (Web Speech API)
│   ├── Voz y velocidad
│   └── Eventos boundary de palabra
├── Sincronización karaoke
│   ├── Asociación palabra ↔ posición en el DOM/CFI
│   ├── Resaltado visual
│   └── Seguimiento / paso de página
└── Almacenamiento local
    ├── Progreso de lectura
    └── Marcadores
```

En el código inicial, varias de estas responsabilidades siguen juntas en `AppComponent`; la separación en servicios es una **mejora pendiente**, no una arquitectura ya aplicada.

## 3. Qué se ha hecho

### 3.1 Código entregado

Se generó un proyecto inicial `epub-karaoke-mvp.zip` con:

- Configuración Angular y TypeScript.
- Interfaz HTML/CSS del lector y reproductor.
- Importación de un fichero EPUB.
- Visualización mediante `epubjs`.
- Controles de página anterior/siguiente.
- Marcadores y posición de lectura guardados en `localStorage`.
- Narración con `SpeechSynthesisUtterance`.
- Tratamiento de eventos `onboundary` para intentar resaltar las palabras durante el habla.
- Lógica inicial para seguir la posición del texto y avanzar entre páginas/capítulos.

**Importante:** «implementado en código» **no equivale a «probado y funcionando»**. No está confirmado que el flujo completo de EPUB + TTS + karaoke funcione correctamente en tu equipo.

### 3.2 Configuración y puesta en marcha

Durante las pruebas locales se encontraron estos problemas:

| Problema | Diagnóstico | Acción indicada / estado |
|---|---|---|
| `npm ERR! 404` para `@types/epubjs@^0.3.6` | Dependencia de tipos no disponible en esa versión | ✅ Verificado: no aparece en `package.json` ni en `package-lock.json`. |
| Pantalla en blanco | Angular no llegaba a inicializar correctamente | Se pasó a diagnosticar la consola del navegador. |
| Puerto `4200` ocupado | Otro proyecto lo utiliza | Se indicó arrancar en `4300`: `npm start -- --port 4300`. |
| `NG0908: Angular requires Zone.js` | Zone.js no estaba cargado en la configuración efectiva | ✅ Verificado: `zone.js@0.15.1` instalado y declarado en `polyfills` de `angular.json`. |
| `ASSERTION ERROR: Should be run in update mode` | `updateVoices()` llamaba a `this.cd.detectChanges()` desde el constructor | ✅ Corregido: `updateVoices()` ya no llama a `detectChanges()`; solo se redibuja desde el evento `voiceschanged`. `ngOnDestroy()` usa `halt()` para no redibujar una vista destruida. Verificado sin excepciones en consola. |
| `favicon.ico` 404 | Falta un icono de pestaña | No bloquea el lector; pendiente opcional. |

**Última verificación (21/10/2026):** `npm run build` compila sin errores y, con `ng serve` en `http://localhost:4300/`, Chrome headless renderiza la pantalla inicial con la consola limpia (solo mensajes de Vite y «Angular is running in development mode»). **Sigue sin confirmarse que se pueda abrir y narrar un EPUB real**: requiere prueba manual con fichero y audio.

### 3.6 Fase 1 del plan y mejoras de UX/UI (21/10/2026)

- **Clásicos gratis y libro de muestra:** 8 EPUB de dominio público de Project Gutenberg (descargados del espejo oficial, sin modificar) con sus portadas. En el primer uso aparece «Probar con Don Quijote» y una cuadrícula de clásicos; también hay una sección en la biblioteca.
- **Narración frase a frase:** resaltado a dos niveles (frase y palabra) y botones de frase anterior/siguiente mientras se lee. Sin eventos de palabra el resaltado sigue siendo preciso por frase, y se evita que el navegador corte las locuciones largas.
- **Temporizador de apagado** (15/30/60 min o fin del capítulo), **tiempo restante** estimado y **probar voz**, con las voces «natural» primero y un consejo para elegirlas.
- **Deshacer** al quitar un libro (en lugar de `confirm()`); si era el abierto, se reabre.
- **Pistas de primer uso** («Leer desde clic» y deslizar para pasar página).
- **Tema automático** (sigue el sistema), **tipo de letra** (Atkinson Hyperlegible y OpenDyslexic con licencia OFL, servidas desde el propio dominio) e **interlineado**.
- **Accesibilidad:** foco atrapado en el panel lateral y en la hoja de ajustes con devolución al cerrar, y región `aria-live` con el capítulo.
- **PWA:** manifiesto, iconos (incluido maskable y de iOS), service worker de Angular (app precargada; clásicos, portadas y fuentes bajo demanda), aviso «Actualizar» con una versión nueva y `file_handlers` para abrir EPUB desde el sistema.
- **Verificación:** prueba de punta a punta ampliada a 36 comprobaciones (móvil táctil y escritorio, build de producción con CSP). Todo OK, service worker activo y consola limpia.
- **Pendiente de datos del propietario:** dominio propio, aviso legal y privacidad, analítica sin cookies y enlace de donaciones.

### 3.5 Refactor SOLID y control de versiones (21/10/2026)

- **Refactor:** el antiguo `AppComponent` (~600 líneas, con todas las responsabilidades) se ha dividido en servicios por responsabilidad (`core/`, `library/`, `reader/`, `narration/`) y componentes por zona (`ui/`). La estructura está en el README.
- **Abstracciones inyectables:** `SPEECH_ENGINE` (voz), `READING_SURFACE` (lo que la narración necesita del lector), `KEY_VALUE_STORE` (localStorage) y `LOCATIONS_CACHE` (IndexedDB). La narración ya no depende de epub.js.
- **Estado con signals** y componentes `OnPush`: desaparecen todas las llamadas manuales a `detectChanges()`. La lógica de texto está en funciones puras (`text-segmenter.ts`), que se pueden probar con tests unitarios.
- **Cambio de comportamiento menor:** la posición de lectura se guarda también durante la narración, así que se retoma donde iba la voz.
- **Verificación:** la misma prueba de punta a punta (20 comprobaciones en móvil y escritorio, sobre la build de producción con la CSP) pasa entera y la consola queda limpia.
- **Git:** repositorio inicializado en la rama `main` con `.gitignore` y `.gitattributes` (finales de línea LF).
- **Análisis de producto:** ver `claude/ANALISIS_PRODUCTO.md` (funcionalidades, login, UX/UI, monetización, promoción y plan por fases).

### 3.4 Rediseño profesional, mobile-first y preparación para Netlify (21/10/2026)

- **Interfaz rediseñada mobile-first**: barra de reproducción fija abajo (con área segura de iPhone), biblioteca como panel lateral deslizable en móvil y fijo en escritorio, ajustes como hoja inferior en móvil y ventana flotante en escritorio, botones de 44 px mínimo, gesto de deslizar para pasar página.
- **Logo** propio (`public/logo.svg`, también favicon): libro abierto con una palabra resaltada en amarillo.
- **Índice y progreso**: pestaña «Índice» con el capítulo actual marcado («Estás aquí»), % del libro (locations de epub.js generadas una vez y guardadas en IndexedDB), barra de progreso sobre el lector, deslizador para saltar y % leído de cada libro en la biblioteca.
- **Voz**: botón «🎤 Voz» en la barra inferior que abre voz, velocidad, tamaño de letra y tema (claro / sepia / oscuro). Voces agrupadas en «Español» y «Otros idiomas».
- **Otros**: avisos tipo toast, importar arrastrando, marcador de página con un toque, atajos de teclado, estado de carga, accesibilidad (aria, foco visible, `prefers-reduced-motion`).
- **Netlify**: `netlify.toml` (build, carpeta de publicación y Node 22), `public/_headers` con CSP y cabeceras de seguridad, `.gitignore`, build de producción por defecto con hashing (≈162 KB transferidos). Se desactivó el CSS crítico en línea porque usa un `onload` en línea que la CSP bloquearía.
- **Verificación**: build de producción servida con las mismas cabeceras y recorrida en Chrome headless en móvil (390×844, táctil) y escritorio (1440×900): importar, portada y autor, deslizar, ajustes, tema oscuro, recarga con restauración, leer desde clic, índice, salto de capítulo, progreso y Esc. Todas las comprobaciones OK y consola sin errores ni violaciones de CSP. El audio real sigue pendiente de prueba manual.

### 3.3 Cambios aplicados después del MVP

- **Arranque:** corrección del `ASSERTION ERROR` (ver tabla anterior).
- **Cambio de voz o velocidad durante la reproducción:** la Web Speech API no permite modificar un `SpeechSynthesisUtterance` en curso, así que antes el cambio no se notaba hasta el párrafo siguiente. Ahora `applySpeechSettings()` cancela la lectura y la retoma **desde la palabra actual** con la nueva voz o velocidad. Si está en pausa, el cambio se aplica al pulsar «Continuar». Tras `cancel()` se llama a `speechSynthesis.resume()` porque Chrome puede quedarse pausado. **Pendiente de prueba manual.**
- **Velocidades:** selector ampliado de 0.5× a 2× en pasos de 0.1 (antes solo 0.8, 1, 1.25 y 1.5).
- **Biblioteca en IndexedDB** (`src/app/library.service.ts`): cada EPUB importado se guarda con título, autor y portada; se abre desde la barra lateral sin reimportar y se puede quitar (borra también sus marcadores y posición). Se pide `navigator.storage.persist()` para que el navegador no la desaloje.
- **Preferencias en `localStorage`** (`epub-karaoke:prefs`): voz, velocidad, tamaño de letra y último libro abierto, que se reabre automáticamente al cargar la página. Si la voz guardada no existe en el navegador se usa una en español sin perder la preferencia.
- **Leer desde clic:** botón «⌖ Leer desde clic» en el reproductor; con el modo activo el cursor pasa a cruz y un clic en una palabra empieza la narración desde esa palabra.
- **Verificación automática (Chrome headless + DevTools Protocol, TTS simulado):** importar → aparece en la biblioteca → cambiar velocidad → recargar → se reabre el libro con 1.3× → clic en una palabra lee desde ella. Todo OK y consola sin errores. El audio real y el resaltado karaoke siguen pendientes de prueba manual.

**Nota sobre el ZIP original:** la copia inicial conservada puede seguir incluyendo la dependencia de tipos errónea y la llamada problemática a `detectChanges()`. Las modificaciones propuestas se aplicaron de forma guiada en el proyecto local del usuario; no deben suponerse integradas en ese ZIP.

## 4. Qué falta

### Prioridad P0 — Arranque estable

- [x] Verificar que `npm install` termina sin errores.
- [x] Quitar `@types/epubjs` si sigue en el proyecto local.
- [x] Confirmar que `zone.js` está instalado y se carga mediante `polyfills` o un mecanismo de bootstrap equivalente.
- [x] Eliminar la llamada prematura a `detectChanges()` dentro de `updateVoices()`.
- [x] Ejecutar Angular en `http://localhost:4300/`.
- [x] Confirmar que se ve la pantalla inicial y que la consola no contiene excepciones bloqueantes.

### Prioridad P1 — Flujo básico de lectura

- [ ] Importar al menos dos EPUB reales sin DRM.
- [ ] Comprobar títulos, capítulos, estilos y paginación.
- [ ] Comprobar página siguiente/anterior y navegación por capítulos.
- [ ] Probar añadir, abrir y eliminar marcadores.
- [ ] Comprobar que la posición guardada se recupera al reimportar el mismo archivo.

### Prioridad P2 — Narración TTS

- [ ] Confirmar que la lectura se inicia con una voz disponible en español.
- [ ] Comprobar pausa, reanudación y detener.
- [ ] Validar cambios de velocidad y selección de voz (implementado el cambio en caliente desde la palabra actual; falta prueba manual).
- [ ] Gestionar errores, interrupciones y ausencia de voces.
- [ ] Decidir el comportamiento al cambiar manualmente de página mientras se reproduce audio.

### Prioridad P3 — Karaoke sincronizado

- [ ] Comprobar si `SpeechSynthesisUtterance.onboundary` emite posiciones de palabra en el navegador y voz seleccionados.
- [ ] Correlacionar offsets del TTS con nodos reales del EPUB.
- [ ] Resaltar exactamente la palabra pronunciada.
- [ ] Desplazar la vista o cambiar de página al salir la palabra de la zona visible.
- [ ] Mantener la narración coherente al cambiar de página/capítulo.
- [ ] Probar EPUB con múltiples nodos HTML, saltos de línea, notas y capítulos largos.
- [ ] Implementar estrategia alternativa cuando no existan eventos `boundary` fiables.

### Prioridad P4 — Calidad y evolución

- [x] Extraer `EpubReaderService`, `SpeechService`, `KaraokeSyncService` y `BookmarksService` (hecho como `ReaderService`, `SpeechEngine`, `ReadAloudService` y `BookmarksService`).
- [x] Migrar la biblioteca a IndexedDB para guardar también los archivos EPUB y no tener que reimportarlos.
- [ ] Añadir pruebas unitarias, de integración y E2E.
- [ ] Validar compatibilidad en Chrome, Edge, Firefox y navegadores móviles.
- [ ] Mejorar accesibilidad, controles por teclado, ajustes de tamaño de texto y modo oscuro.
- [ ] Revisar seguridad de archivos EPUB no confiables, aislamiento de contenido y políticas CSP antes de publicar.
- [ ] Evaluar un TTS con marcas temporales por palabra si se necesita sincronización muy precisa y consistente.

## 5. Limitaciones técnicas conocidas

1. **EPUB es refluible:** el número y el contenido visible de las páginas cambian según el dispositivo y la tipografía. Conviene navegar por CFI, no por número fijo de página.
2. **Web Speech API no garantiza `boundary` por palabra en todas las voces/navegadores:** el modo karaoke exacto necesita pruebas por plataforma y posiblemente otro motor TTS.
3. **El EPUB puede tener HTML complejo:** no basta con leer `textContent` sin preservar su correspondencia con el DOM.
4. **La biblioteca es local al navegador:** los EPUB se guardan en IndexedDB de ese navegador y perfil; borrar los datos del sitio elimina la biblioteca.
5. **No hay backend:** ni biblioteca sincronizada, ni cuentas, ni sincronización entre dispositivos.
6. **No hay soporte para EPUB con DRM.**

## 6. Próximo paso recomendado

**P0 está cerrado.** Siguiente paso: prueba manual mínima para empezar P1–P3:

1. Abrir `http://localhost:4300/`.
2. Importar un EPUB sencillo en español.
3. Avanzar una página y crear un marcador.
4. Pulsar reproducir y confirmar que se oye la voz.
5. Observar si se resalta el texto y si cambia de página cuando corresponde.
6. Anotar por separado qué funciona, qué falla y en qué navegador/voz.

Hasta completar esa prueba, el estado general debe considerarse **«MVP desarrollado parcialmente, pendiente de validación funcional»**.

## 7. Comandos útiles

```bash
# Desde la carpeta del proyecto
npm install

# Arranque en puerto alternativo
npm start -- --port 4300

# Comprobación de compilación
npm run build
```

Si `npm run build` falla, hay que corregir esos errores antes de dar por concluido el arranque del MVP.
