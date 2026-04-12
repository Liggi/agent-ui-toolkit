/**
 * Structural design tokens — light mode uses Sundial parchment palette,
 * dark mode uses zinc. Consumer sets `class="dark"` on a parent element
 * to activate dark mode.
 *
 * Light-mode palette: Sundial "Parchment" — warm neutrals from the Ash
 * design system. The consumer registers `--color-parchment-*` in their
 * Tailwind @theme block. Dark mode uses Tailwind's built-in zinc.
 */
export const tk = {
  card: {
    bg: 'bg-white dark:bg-zinc-900/30',
    border: 'border-parchment-300 dark:border-zinc-800/40',
  },
  surface: 'bg-white dark:bg-zinc-950',
  codeBg: 'bg-parchment-100 dark:bg-zinc-950',
  codeBgSubtle: 'bg-parchment-50 dark:bg-zinc-900/50',
  text: {
    heading: 'text-parchment-900 dark:text-zinc-200',
    primary: 'text-parchment-800 dark:text-zinc-300',
    secondary: 'text-parchment-600 dark:text-zinc-400',
    muted: 'text-parchment-500 dark:text-zinc-500',
    faint: 'text-parchment-400 dark:text-zinc-600',
  },
  separator: 'border-parchment-200 dark:border-zinc-800/40',
  hover: 'hover:bg-parchment-100 dark:hover:bg-zinc-800/40',
  scrollbar: 'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-parchment-300 dark:scrollbar-thumb-zinc-700',
} as const;

/**
 * Accent tints — per-tool card colors. Light mode gets slightly stronger
 * opacity and darker icon shades for adequate contrast on white.
 * These are transparent overlays that work on both warm and cool backgrounds.
 */
export const accent = {
  blue:    { card: 'border-blue-600/30 bg-blue-500/10 dark:border-blue-500/20 dark:bg-blue-500/5',       icon: 'text-blue-600 dark:text-blue-400/80' },
  emerald: { card: 'border-emerald-600/30 bg-emerald-500/10 dark:border-emerald-500/20 dark:bg-emerald-500/5', icon: 'text-emerald-600 dark:text-emerald-400/80' },
  violet:  { card: 'border-violet-600/30 bg-violet-500/10 dark:border-violet-500/20 dark:bg-violet-500/5',   icon: 'text-violet-600 dark:text-violet-400/80' },
  orange:  { card: 'border-orange-600/30 bg-orange-500/10 dark:border-orange-500/20 dark:bg-orange-500/5',   icon: 'text-orange-600 dark:text-orange-400/80' },
  amber:   { card: 'border-amber-600/30 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/5',     icon: 'text-amber-600 dark:text-amber-400/80' },
  purple:  { card: 'border-purple-600/30 bg-purple-500/10 dark:border-purple-500/20 dark:bg-purple-500/5',   icon: 'text-purple-600 dark:text-purple-400/80' },
  cyan:    { card: 'border-cyan-600/30 bg-cyan-500/10 dark:border-cyan-500/20 dark:bg-cyan-500/5',         icon: 'text-cyan-600 dark:text-cyan-400/80' },
  indigo:  { card: 'border-indigo-600/30 bg-indigo-500/10 dark:border-indigo-500/20 dark:bg-indigo-500/5',   icon: 'text-indigo-600 dark:text-indigo-400/80' },
  rose:    { card: 'border-rose-600/30 bg-rose-500/10 dark:border-rose-500/20 dark:bg-rose-500/5',         icon: 'text-rose-600 dark:text-rose-400/80' },
  red:     { card: 'border-red-500/35 bg-red-500/10 dark:bg-red-500/5',                                     icon: 'text-red-600 dark:text-red-400/80' },
  zinc:    { card: 'border-parchment-400/40 bg-parchment-500/8 dark:border-zinc-500/25 dark:bg-zinc-500/5', icon: 'text-parchment-500 dark:text-zinc-400/80' },
} as const;

/** TINTS map for TaskTool / TeamTools — same accents keyed by color name. */
export const TINTS: Record<string, { border: string; bg: string; icon: string }> = {
  blue:   { border: 'border-blue-600/30 dark:border-blue-500/20',   bg: 'bg-blue-500/10 dark:bg-blue-500/5',   icon: 'text-blue-600 dark:text-blue-400/80' },
  green:  { border: 'border-green-600/30 dark:border-green-500/20', bg: 'bg-green-500/10 dark:bg-green-500/5', icon: 'text-green-600 dark:text-green-400/80' },
  yellow: { border: 'border-amber-600/30 dark:border-amber-500/20', bg: 'bg-amber-500/10 dark:bg-amber-500/5', icon: 'text-amber-600 dark:text-amber-400/80' },
  purple: { border: 'border-purple-600/30 dark:border-purple-500/20', bg: 'bg-purple-500/10 dark:bg-purple-500/5', icon: 'text-purple-600 dark:text-purple-400/80' },
  red:    { border: 'border-red-600/30 dark:border-red-500/20',     bg: 'bg-red-500/10 dark:bg-red-500/5',     icon: 'text-red-600 dark:text-red-400/80' },
  cyan:   { border: 'border-cyan-600/30 dark:border-cyan-500/20',   bg: 'bg-cyan-500/10 dark:bg-cyan-500/5',   icon: 'text-cyan-600 dark:text-cyan-400/80' },
};
export const DEFAULT_TINT = { border: 'border-parchment-400/40 dark:border-zinc-500/20', bg: 'bg-parchment-500/8 dark:bg-zinc-500/5', icon: 'text-parchment-500 dark:text-zinc-400/80' };

/**
 * Prose class string for markdown rendering.
 * Used by WebResultContent, PlanTool, and ProseResultContent.
 * Light mode uses Sundial parchment palette; dark mode uses zinc.
 */
export const PROSE_CLASSES = `prose dark:prose-invert prose-sm max-w-none
  [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:text-parchment-900 dark:[&_h1]:text-zinc-200 [&_h1]:mt-3 [&_h1]:mb-1
  [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:text-parchment-800 dark:[&_h2]:text-zinc-300 [&_h2]:mt-2.5 [&_h2]:mb-1
  [&_h3]:text-[11px] [&_h3]:font-medium [&_h3]:text-parchment-600 dark:[&_h3]:text-zinc-400 [&_h3]:mt-2 [&_h3]:mb-0.5
  [&_p]:text-[11px] [&_p]:text-parchment-600 dark:[&_p]:text-zinc-400 [&_p]:leading-relaxed [&_p]:my-1
  [&_li]:text-[11px] [&_li]:text-parchment-600 dark:[&_li]:text-zinc-400 [&_li]:leading-relaxed
  [&_ul]:my-1 [&_ol]:my-1
  [&_strong]:text-parchment-800 dark:[&_strong]:text-zinc-300 [&_strong]:font-medium
  [&_a]:text-blue-600 dark:[&_a]:text-blue-400/80 [&_a]:no-underline hover:[&_a]:text-blue-500 dark:hover:[&_a]:text-blue-300
  [&_code]:text-[10px] [&_code]:bg-parchment-200 dark:[&_code]:bg-zinc-800/50 [&_code]:px-1 [&_code]:rounded
  [&_hr]:border-parchment-300 dark:[&_hr]:border-zinc-800/40 [&_hr]:my-2`;

/** Compact variant for smaller containers (collapsed groups). */
export const PROSE_CLASSES_SM = `prose dark:prose-invert prose-sm max-w-none
  [&_h1]:text-[12px] [&_h1]:font-semibold [&_h1]:text-parchment-900 dark:[&_h1]:text-zinc-200 [&_h1]:mt-2 [&_h1]:mb-1
  [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-parchment-800 dark:[&_h2]:text-zinc-300 [&_h2]:mt-2 [&_h2]:mb-0.5
  [&_h3]:text-[11px] [&_h3]:font-medium [&_h3]:text-parchment-600 dark:[&_h3]:text-zinc-400 [&_h3]:mt-1.5 [&_h3]:mb-0.5
  [&_p]:text-[10px] [&_p]:text-parchment-600 dark:[&_p]:text-zinc-400 [&_p]:leading-relaxed [&_p]:my-1
  [&_li]:text-[10px] [&_li]:text-parchment-600 dark:[&_li]:text-zinc-400 [&_li]:leading-relaxed
  [&_ul]:my-1 [&_ol]:my-1
  [&_strong]:text-parchment-800 dark:[&_strong]:text-zinc-300 [&_strong]:font-medium
  [&_a]:text-blue-600 dark:[&_a]:text-blue-400/80 [&_a]:no-underline
  [&_code]:text-[10px] [&_code]:bg-parchment-200 dark:[&_code]:bg-zinc-800/50 [&_code]:px-1 [&_code]:rounded`;
