// Flashcards kept in the browser (localStorage), scheduled with FSRS.
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

const KEY = "hsk-cards-v1";
const scheduler = fsrs();
export { Rating };
export type Deck = Record<string, Card>;

export function loadDeck(): Deck {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (const k in raw) {
      raw[k].due = new Date(raw[k].due);
      if (raw[k].last_review) raw[k].last_review = new Date(raw[k].last_review);
    }
    return raw;
  } catch {
    return {};
  }
}
function save(d: Deck) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}
export function addCards(words: string[]): Deck {
  const d = loadDeck();
  for (const w of words) if (!d[w]) d[w] = createEmptyCard(new Date());
  save(d);
  return d;
}
export function removeCard(word: string): Deck {
  const d = loadDeck();
  delete d[word];
  save(d);
  return d;
}
export function review(word: string, grade: Grade): Deck {
  const d = loadDeck();
  if (d[word]) d[word] = scheduler.next(d[word], new Date(), grade).card;
  save(d);
  return d;
}
export function dueWords(d: Deck, now = new Date()): string[] {
  return Object.keys(d)
    .filter((w) => d[w].due <= now)
    .sort((a, b) => +d[a].due - +d[b].due);
}
