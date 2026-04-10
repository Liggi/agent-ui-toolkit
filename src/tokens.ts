/**
 * Structural design tokens — light mode default, dark: variant for dark mode.
 *
 * Consumer sets `class="dark"` on a parent element to activate dark mode.
 * These tokens define the card chrome; accent colors (per-tool tints) are
 * transparent and work on both backgrounds without switching.
 */
export const tk = {
  card: {
    bg: 'bg-white dark:bg-zinc-900/30',
    border: 'border-stone-200 dark:border-zinc-800/40',
  },
  surface: 'bg-white dark:bg-zinc-950',
  codeBg: 'bg-stone-50 dark:bg-zinc-950',
  codeBgSubtle: 'bg-stone-50 dark:bg-zinc-900/50',
  text: {
    heading: 'text-stone-800 dark:text-zinc-200',
    primary: 'text-stone-700 dark:text-zinc-300',
    secondary: 'text-stone-500 dark:text-zinc-400',
    muted: 'text-stone-400 dark:text-zinc-500',
    faint: 'text-stone-300 dark:text-zinc-600',
  },
  separator: 'border-stone-200 dark:border-zinc-800/40',
  hover: 'hover:bg-stone-100 dark:hover:bg-zinc-800/40',
  scrollbar: 'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-stone-300 dark:scrollbar-thumb-zinc-700',
} as const;

/**
 * Prose class string for markdown rendering.
 * Used by WebResultContent, PlanTool, and ProseResultContent.
 */
export const PROSE_CLASSES = `prose dark:prose-invert prose-sm max-w-none
  [&_h1]:text-[13px] [&_h1]:font-semibold [&_h1]:text-stone-800 dark:[&_h1]:text-zinc-200 [&_h1]:mt-3 [&_h1]:mb-1
  [&_h2]:text-[12px] [&_h2]:font-semibold [&_h2]:text-stone-700 dark:[&_h2]:text-zinc-300 [&_h2]:mt-2.5 [&_h2]:mb-1
  [&_h3]:text-[11px] [&_h3]:font-medium [&_h3]:text-stone-500 dark:[&_h3]:text-zinc-400 [&_h3]:mt-2 [&_h3]:mb-0.5
  [&_p]:text-[11px] [&_p]:text-stone-500 dark:[&_p]:text-zinc-400 [&_p]:leading-relaxed [&_p]:my-1
  [&_li]:text-[11px] [&_li]:text-stone-500 dark:[&_li]:text-zinc-400 [&_li]:leading-relaxed
  [&_ul]:my-1 [&_ol]:my-1
  [&_strong]:text-stone-700 dark:[&_strong]:text-zinc-300 [&_strong]:font-medium
  [&_a]:text-blue-500 dark:[&_a]:text-blue-400/80 [&_a]:no-underline hover:[&_a]:text-blue-400 dark:hover:[&_a]:text-blue-300
  [&_code]:text-[10px] [&_code]:bg-stone-200/50 dark:[&_code]:bg-zinc-800/50 [&_code]:px-1 [&_code]:rounded
  [&_hr]:border-stone-200 dark:[&_hr]:border-zinc-800/40 [&_hr]:my-2`;

/** Compact variant for smaller containers (collapsed groups). */
export const PROSE_CLASSES_SM = `prose dark:prose-invert prose-sm max-w-none
  [&_h1]:text-[12px] [&_h1]:font-semibold [&_h1]:text-stone-800 dark:[&_h1]:text-zinc-200 [&_h1]:mt-2 [&_h1]:mb-1
  [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-stone-700 dark:[&_h2]:text-zinc-300 [&_h2]:mt-2 [&_h2]:mb-0.5
  [&_h3]:text-[11px] [&_h3]:font-medium [&_h3]:text-stone-500 dark:[&_h3]:text-zinc-400 [&_h3]:mt-1.5 [&_h3]:mb-0.5
  [&_p]:text-[10px] [&_p]:text-stone-500 dark:[&_p]:text-zinc-400 [&_p]:leading-relaxed [&_p]:my-1
  [&_li]:text-[10px] [&_li]:text-stone-500 dark:[&_li]:text-zinc-400 [&_li]:leading-relaxed
  [&_ul]:my-1 [&_ol]:my-1
  [&_strong]:text-stone-700 dark:[&_strong]:text-zinc-300 [&_strong]:font-medium
  [&_a]:text-blue-500 dark:[&_a]:text-blue-400/80 [&_a]:no-underline
  [&_code]:text-[10px] [&_code]:bg-stone-200/50 dark:[&_code]:bg-zinc-800/50 [&_code]:px-1 [&_code]:rounded`;
