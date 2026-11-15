// Small line icons drawn for this app.
const paths: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  path: <><path d="M5 20V8l7-4 7 4v12" /><path d="M9 20v-6h6v6" /></>,
  cards: <><rect x="4" y="7" width="13" height="13" rx="2.5" /><path d="M8 4h9.5A2.5 2.5 0 0 1 20 6.5V16" /></>,
  practice: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="7" rx="1.5" /><rect x="17" y="13" width="4" height="7" rx="1.5" /></>,
  sound: <><path d="M4 10v4h3l5 4V6L7 10H4z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
  download: <><path d="M12 4v11" /><path d="M7.5 11L12 15.5 16.5 11" /><path d="M5 20h14" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  image: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M4.5 17l5-4.5 3.5 3 3-2.5 4 3.5" /></>,
};
export default function Icon({ name, size = 22 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
