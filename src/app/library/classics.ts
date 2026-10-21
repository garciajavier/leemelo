/**
 * Public-domain classics bundled with the app (public/classics), taken unmodified from Project Gutenberg
 * (each EPUB includes its license). Adding a book means adding its files and an entry here.
 */
export interface Classic {
  slug: string;
  title: string;
  author: string;
  lang: 'es' | 'en';
  cover: string;
  gutenbergId: number;
}

export const CLASSICS: readonly Classic[] = [
  { slug: 'don-quijote', title: 'Don Quijote', author: 'Miguel de Cervantes', lang: 'es', cover: 'don-quijote.png', gutenbergId: 2000 },
  { slug: 'lazarillo-de-tormes', title: 'Lazarillo de Tormes', author: 'Anónimo', lang: 'es', cover: 'lazarillo-de-tormes.png', gutenbergId: 320 },
  { slug: 'marianela', title: 'Marianela', author: 'Benito Pérez Galdós', lang: 'es', cover: 'marianela.jpg', gutenbergId: 17340 },
  { slug: 'el-sombrero-de-tres-picos', title: 'El sombrero de tres picos', author: 'Pedro Antonio de Alarcón', lang: 'es', cover: 'el-sombrero-de-tres-picos.png', gutenbergId: 29506 },
  { slug: 'los-cuatro-jinetes-del-apocalipsis', title: 'Los cuatro jinetes del Apocalipsis', author: 'Vicente Blasco Ibáñez', lang: 'es', cover: 'los-cuatro-jinetes-del-apocalipsis.png', gutenbergId: 24536 },
  { slug: 'alices-adventures-in-wonderland', title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', lang: 'en', cover: 'alices-adventures-in-wonderland.jpg', gutenbergId: 11 },
  { slug: 'pride-and-prejudice', title: 'Pride and Prejudice', author: 'Jane Austen', lang: 'en', cover: 'pride-and-prejudice.jpg', gutenbergId: 1342 },
  { slug: 'the-adventures-of-sherlock-holmes', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', lang: 'en', cover: 'the-adventures-of-sherlock-holmes.jpg', gutenbergId: 1661 },
];

/** Suggested first book for new users. */
export const SAMPLE_CLASSIC = CLASSICS[0];

export const classicBookId = (classic: Classic) => `classic:${classic.slug}`;
export const classicFileUrl = (classic: Classic) => `classics/${classic.slug}.epub`;
export const classicCoverUrl = (classic: Classic) => `classics/covers/${classic.cover}`;
