# Léemelo · Análisis de producto, UX/UI, monetización y promoción

Fecha: 21 de octubre de 2026. Punto de partida: app web estática (Netlify), sin backend, biblioteca local, voz del navegador.

## 1. Dónde está hoy el producto

**Lo que la diferencia:** leer un EPUB propio con voz y el texto resaltado palabra a palabra, gratis, sin registro y sin que el libro salga del dispositivo. Además es mobile-first, tiene índice con progreso, permite leer desde la palabra pulsada y tiene temas.

**Sus límites actuales:**

| Límite | Consecuencia |
|---|---|
| Solo EPUB **sin DRM** | Casi todo lo que se compra en tiendas tiene DRM. Hay que enseñar al usuario de dónde sacar libros válidos. |
| Voces del navegador | La calidad varía mucho según el sistema. En iOS la voz se corta al bloquear la pantalla. |
| Todo es local | No hay sincronización entre móvil y ordenador, y se pierde si se borran los datos del navegador. |
| Sin analítica | No sabemos cuánta gente entra, importa un libro o pulsa ▶. |

**Competidores a estudiar:** Speechify, ElevenReader, Voice Dream Reader, @Voice Aloud Reader y NaturalReader. Casi todos cobran por las **voces naturales**, y ese es justo el hueco que deja la voz del navegador.

## 2. ¿Login?

**Recomendación: todavía no.** Hoy el «sin registro y privado» es una ventaja. El login solo compensa cuando hay algo que lo justifique:

1. **Sincronizar entre dispositivos** el progreso, los marcadores y las preferencias.
2. **Cobrar** voces premium o un plan Pro.

Cuando llegue ese momento:
- **Supabase** o **Firebase**: autenticación, base de datos y almacenamiento.
- Acceso con **enlace mágico por email** o con **Google**.
- **Sincronizar solo los datos de lectura**, no los EPUB. Subir los libros de los usuarios supone coste de almacenamiento, alojar contenido con derechos de autor (con retiradas de contenido) y más obligaciones de RGPD.
- Un paso intermedio sin login: **exportar e importar la biblioteca** como archivo.

## 3. Funcionalidades recomendadas

Ordenadas por impacto respecto al esfuerzo (S = pequeño, M = medio, L = grande).

| # | Funcionalidad | Impacto | Esfuerzo | Por qué |
|---|---|---|---|---|
| 1 | **PWA instalable y offline**: icono en la pantalla de inicio, funciona sin red, abrir EPUB desde otras apps | Alto | S–M | Hace que la web se use como una app en el móvil. Además permite publicarla en Google Play (TWA) |
| 2 | **Biblioteca de clásicos de dominio público** integrada (Quijote, Galdós, Bécquer…; fuentes: Project Gutenberg, Standard Ebooks, Wikisource) | Muy alto | M | Resuelve el «no tengo EPUB sin DRM», da a probar la app con un toque y genera SEO («escuchar El Quijote online») |
| 3 | **Temporizador de apagado** (15/30/60 min, fin del capítulo) | Medio | S | Muy usado en apps de audio, sobre todo antes de dormir |
| 4 | **Frase anterior y frase siguiente** mientras se reproduce | Alto | S | Es lo que se espera de un reproductor de audio. Hoy las flechas pasan página |
| 5 | **Tiempo restante estimado** del capítulo y del libro | Medio | S | Se calcula con los caracteres y la velocidad: «quedan ~12 min» |
| 6 | **Buscar en el libro** | Medio | S–M | epub.js lo permite por secciones |
| 7 | **Modo aprender idiomas**: tocar una palabra para ver su traducción, repetir la frase, frase a frase con pausa | Muy alto (nicho) | M–L | El karaoke es ideal para aprender idiomas: es el nicho con más demanda y más dispuesto a pagar |
| 8 | **Subrayados y notas** | Medio | M | Lectura activa, sobre todo para estudiantes |
| 9 | **Estadísticas y rachas** (minutos al día, libros terminados) | Medio | S–M | Retención: hábito de lectura |
| 10 | **Voces premium neuronales** | Muy alto | L | Calidad tipo audiolibro y audio en segundo plano en iOS. Es la palanca de monetización (ver §5) |
| 11 | **Sincronizar entre dispositivos** (con login) | Medio | L | Solo cuando haya usuarios recurrentes |

## 4. Mejoras de UX/UI

**Prioridad alta:**
1. **Libro de muestra en el primer uso**: «Prueba con un capítulo de El Quijote». El usuario ve el karaoke en 5 segundos sin tener que buscar un EPUB. Es la mayor mejora de activación posible.
2. **Resaltado a dos niveles**: la frase actual con un fondo suave y la palabra actual en amarillo. Se sigue mucho mejor el texto.
3. **Botón «Probar voz»** en el selector de voces. Además, marcar las voces «naturales» o recomendadas, porque Edge y Chrome tienen voces online mucho mejores que las del sistema.
4. **Deshacer en lugar de confirmar**: al quitar un libro, un aviso con «Deshacer» en vez del `confirm()` del navegador.
5. **Explicar «Leer desde clic» la primera vez** con un aviso breve. Quizá con otro nombre: «Toca para leer».

**Prioridad media:**
6. **Tema «Automático»**, que siga el modo claro/oscuro del sistema.
7. **Tipografía**: elegir fuente (serif, sans o una para dislexia como OpenDyslexic), interlineado y márgenes.
8. **Desplazamiento continuo** como alternativa a la paginación en móvil.
9. **Doble página** en pantallas anchas de escritorio.
10. **Accesibilidad**: mantener el foco dentro del panel lateral y de la hoja de ajustes mientras están abiertos, devolverlo al cerrar, y anunciar los cambios de capítulo a los lectores de pantalla.
11. **Pistas de gestos** la primera vez («desliza para pasar página») y vibración ligera al pasar página en móvil.

## 5. Monetización

Las opciones, de más a menos recomendable para este producto:

1. **Freemium con voces premium (suscripción).** Gratis con las voces del navegador; de pago con voces neuronales, audio en segundo plano y quizá descarga en MP3 para escuchar offline.
   - **Coste:** la voz neuronal se paga por carácter, del orden de 15–30 $ por millón de caracteres según el proveedor (precios a verificar). Una novela de ~500.000 caracteres cuesta varios dólares cada vez que se sintetiza.
   - **Hay que controlarlo:** límite de horas al mes por plan, guardar en caché el audio de cada usuario y elegir bien el proveedor (Azure, Google, Amazon Polly, OpenAI, ElevenLabs…).
   - **Requiere:** backend (Netlify Functions o Supabase), login y pagos (Stripe).
2. **Plan Pro de pago único**: temas y fuentes extra, estadísticas, exportar notas y biblioteca. Es sencillo con Stripe Payment Links. Ingresos bajos, pero sin costes variables.
3. **B2B / educación**: academias de idiomas, colegios (lectoescritura y dislexia) y editoriales con catálogo sin DRM. Es lo que más ingresos deja por cliente, pero hace falta vender y adaptar el producto: licencias por centro, panel para el profesor y contenido curado.
4. **Donaciones** (Ko-fi, Buy Me a Coffee): ponerlas hoy mismo no cuesta nada.
5. **Afiliación** con tiendas de ebooks sin DRM: ingresos marginales.
6. **Publicidad: no recomendada.** Estropea la experiencia de lectura, choca con el «privado» y paga poco.

## 6. Promoción

- **Vídeos cortos** (TikTok, Reels, Shorts): el karaoke es muy visual. Ejemplos: «Escucha El Quijote con el texto resaltado» o «Cómo aprendo inglés leyendo». La comunidad BookTok es enorme.
- **SEO con la biblioteca de clásicos**: una página por libro («Leer y escuchar *La Regenta* online gratis»). Tráfico continuo y gratuito.
- **Comunidades de idiomas y accesibilidad**: r/languagelearning, r/learnspanish, foros de dislexia, grupos de profesores de ELE y de primaria. Mejor aportar y enseñar que hacer spam.
- **Lanzamientos**: Product Hunt, «Show HN» en Hacker News y comunidades tech hispanas.
- **Tiendas de apps**: publicar la PWA en Google Play como TWA con PWABuilder o Bubblewrap.
- **Medir**: analítica sin cookies (Plausible o similar) para no necesitar banner. El embudo a medir: visita → importa o abre un libro → pulsa ▶ → vuelve otro día.
- **Antes de promocionar**: aviso legal, política de privacidad, dominio propio y una página de presentación con un vídeo de 20 segundos.

## 7. Riesgos

- **Derechos de autor y DRM:** no ofrecer nunca herramientas ni guías para quitar DRM. El mensaje debe ser «tus EPUB sin DRM y clásicos libres».
- **iOS:** la voz del navegador tiene limitaciones (se para con la pantalla bloqueada y hay menos voces). Hay que probarlo en un iPhone real. Las voces premium con audio real lo resolverían.
- **Costes variables:** en cuanto haya voces en la nube, cada minuto escuchado cuesta. Hay que poner límites por plan desde el primer día.
- **RGPD:** si se añade login o analítica con cookies, hacen falta política de privacidad y consentimiento.

## 8. Plan sugerido

| Fase | Contenido | Objetivo |
|---|---|---|
| **1 · Lanzamiento** (1–2 semanas) | ✅ Libro de muestra y clásicos (8 títulos), PWA, frase anterior/siguiente, temporizador y mejoras UX/UI de alta prioridad. ⏳ Pendiente (necesita datos del propietario): dominio, legales, analítica sin cookies, donaciones | Primeros usuarios y medir activación |
| **2 · Retención** (1 mes) | Resaltado de frase, probar voz, deshacer, tipografía, estadísticas y rachas, buscar, exportar biblioteca. Vídeos cortos y SEO de clásicos | Que vuelvan cada día |
| **3 · Ingresos** | Login (Supabase) + sincronización + voces premium con Stripe. Probar el modo idiomas como plan de pago | Primeros ingresos recurrentes |
