// Pinyin with each syllable coloured by its tone.
const TONES: [RegExp, number][] = [
  [/[āēīōūǖ]/i, 1],
  [/[áéíóúǘ]/i, 2],
  [/[ǎěǐǒǔǚ]/i, 3],
  [/[àèìòùǜ]/i, 4],
];
export const toneOf = (syllable: string) => TONES.find(([re]) => re.test(syllable))?.[1] ?? 5;

export default function Pinyin({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`pinyin ${className}`}>
      {text.split(/(\s+)/).map((part, i) =>
        /\S/.test(part) ? <span key={i} className={`tone${toneOf(part)}`}>{part}</span> : part,
      )}
    </span>
  );
}
