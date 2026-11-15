// Everything the learner owns is kept in the browser (localStorage):
//  - cards: FSRS review state per word
//  - decks: named lists of words
//  - notes: the learner's own pinyin/meaning for a word
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

const CARDS = "hsk-cards-v1", DECKS = "hsk-decks-v1", ACTIVE = "hsk-active-deck", NOTES = "hsk-notes-v1";
const scheduler = fsrs();
export { Rating };
export type Deck = Record<string, Card>; // word -> review state
export type WordList = { id: string; name: string; words: string[] };
export type Note = { p?: string; vi?: string };

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export function loadDeck(): Deck {
  const raw = read<Deck>(CARDS, {});
  for (const k in raw) {
    raw[k].due = new Date(raw[k].due);
    if (raw[k].last_review) raw[k].last_review = new Date(raw[k].last_review);
  }
  return raw;
}

/** Named decks. The first visit turns existing cards into one default deck. */
export function loadLists(): WordList[] {
  let lists = read<WordList[] | null>(DECKS, null);
  if (!lists || !lists.length) {
    lists = [{ id: "d1", name: "Bộ thẻ của tôi", words: Object.keys(read<Deck>(CARDS, {})) }];
    write(DECKS, lists);
  }
  return lists;
}
export function activeId(): string {
  const lists = loadLists();
  const id = read<string>(ACTIVE, lists[0].id);
  return lists.some((l) => l.id === id) ? id : lists[0].id;
}
export const setActive = (id: string) => write(ACTIVE, id);
export const activeList = (): WordList => loadLists().find((l) => l.id === activeId())!;

export function createList(name: string): WordList[] {
  const lists = loadLists();
  const id = "d" + Date.now().toString(36);
  lists.push({ id, name: name.trim() || "Bộ thẻ mới", words: [] });
  write(DECKS, lists);
  setActive(id);
  return lists;
}
export function renameList(id: string, name: string): WordList[] {
  const lists = loadLists();
  const l = lists.find((x) => x.id === id);
  if (l && name.trim()) l.name = name.trim();
  write(DECKS, lists);
  return lists;
}
export function deleteList(id: string): WordList[] {
  let lists = loadLists().filter((l) => l.id !== id);
  if (!lists.length) lists = [{ id: "d1", name: "Bộ thẻ của tôi", words: [] }];
  write(DECKS, lists);
  dropOrphans(lists);
  return lists;
}
/** Forget review state of words that are in no deck any more. */
function dropOrphans(lists: WordList[]) {
  const keep = new Set(lists.flatMap((l) => l.words));
  const cards = loadDeck();
  for (const w of Object.keys(cards)) if (!keep.has(w)) delete cards[w];
  write(CARDS, cards);
}

/** Add words to a deck (the active one by default). */
export function addCards(words: string[], listId = activeId()): Deck {
  const lists = loadLists();
  const l = lists.find((x) => x.id === listId) ?? lists[0];
  const cards = loadDeck();
  for (const w of words) {
    if (!l.words.includes(w)) l.words.push(w);
    if (!cards[w]) cards[w] = createEmptyCard(new Date());
  }
  write(DECKS, lists);
  write(CARDS, cards);
  return cards;
}
/** Remove a word from one deck, or from every deck when no deck is given. */
export function removeCard(word: string, listId?: string): Deck {
  const lists = loadLists();
  for (const l of lists) if (!listId || l.id === listId) l.words = l.words.filter((w) => w !== word);
  write(DECKS, lists);
  dropOrphans(lists);
  return loadDeck();
}
export const inAnyList = (word: string) => loadLists().some((l) => l.words.includes(word));

export function review(word: string, grade: Grade): Deck {
  const d = loadDeck();
  if (d[word]) d[word] = scheduler.next(d[word], new Date(), grade).card;
  write(CARDS, d);
  return d;
}
export function dueWords(d: Deck, words?: string[], now = new Date()): string[] {
  return (words ?? Object.keys(d))
    .filter((w) => d[w] && d[w].due <= now)
    .sort((a, b) => +d[a].due - +d[b].due);
}

export const loadNotes = () => read<Record<string, Note>>(NOTES, {});
export function saveNote(word: string, note: Note): Record<string, Note> {
  const notes = loadNotes();
  const clean: Note = {};
  if (note.p?.trim()) clean.p = note.p.trim();
  if (note.vi?.trim()) clean.vi = note.vi.trim();
  if (clean.p || clean.vi) notes[word] = clean;
  else delete notes[word];
  write(NOTES, notes);
  return notes;
}
