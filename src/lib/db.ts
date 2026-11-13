import { openDB, type IDBPDatabase } from 'idb';
import type { BookItem, DisplayTuning } from '../types';

const DB_NAME = 'jongibit-db';
const DB_VERSION = 1;

export const DEFAULT_TUNING: DisplayTuning = {
  mode: 'light-color',
  strength: 92,
  warmth: 24,
  grain: 18,
  fontSize: 18,
  lineHeight: 1.78,
  pageMargin: 32,
  twoPageSpread: false,
  compareSplit: false,
  compareRatio: 50,
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('prefs')) {
          db.createObjectStore('prefs', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadDisplayTuning(): Promise<DisplayTuning> {
  try {
    const db = await getDb();
    const rec = await db.get('prefs', 'displayTuning');
    if (rec && rec.value) {
      return { ...DEFAULT_TUNING, ...rec.value };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_TUNING };
}

export async function saveDisplayTuning(tuning: DisplayTuning): Promise<void> {
  const db = await getDb();
  await db.put('prefs', { key: 'displayTuning', value: tuning });
}

export async function listBooks(): Promise<BookItem[]> {
  const db = await getDb();
  const items = (await db.getAll('books')) as BookItem[];
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveBook(book: BookItem): Promise<void> {
  const db = await getDb();
  await db.put('books', { ...book, updatedAt: Date.now() });
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('books', id);
}

export async function exportAllDataJson(): Promise<string> {
  const books = await listBooks();
  const tuning = await loadDisplayTuning();
  return JSON.stringify({ app: 'jongibit', version: '1.0.0', tuning, books }, null, 2);
}

export async function importAllDataJson(raw: string): Promise<{ count: number }> {
  const parsed = JSON.parse(raw) as { tuning?: DisplayTuning; books?: BookItem[] };
  if (parsed.tuning) {
    await saveDisplayTuning({ ...DEFAULT_TUNING, ...parsed.tuning });
  }
  let count = 0;
  if (Array.isArray(parsed.books)) {
    for (const book of parsed.books) {
      if (book && book.id && Array.isArray(book.pages)) {
        await saveBook(book);
        count++;
      }
    }
  }
  return { count };
}
