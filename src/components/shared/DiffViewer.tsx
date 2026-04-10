import React, { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import { Maximize2, Minimize2 } from 'lucide-react';
import { tk } from '../../tokens.js';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  language?: string;
}

interface DiffLine {
  id: string;
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

function computeDiffLines(oldValue: string, newValue: string): DiffLine[] {
  const changes = diffLines(oldValue, newValue);
  const lines: DiffLine[] = [];
  let nextLineId = 0;

  for (const change of changes) {
    const changeLines = change.value.split('\n');
    if (changeLines[changeLines.length - 1] === '') changeLines.pop();
    for (const line of changeLines) {
      const type = change.added ? 'added' : change.removed ? 'removed' : 'unchanged';
      lines.push({ id: `diff-line-${nextLineId++}`, type, content: line });
    }
  }
  return lines;
}

export function DiffViewer({ oldValue, newValue, language = 'text' }: DiffViewerProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedOld = oldValue ?? '';
  const normalizedNew = newValue ?? '';

  const diffResult = useMemo(
    () => computeDiffLines(normalizedOld, normalizedNew),
    [normalizedOld, normalizedNew],
  );

  const totalLines = diffResult.length;
  const shouldShowExpandButton = totalLines > 12;
  const linesToShow = isExpanded ? diffResult : diffResult.slice(0, 12);
  const hiddenCount = totalLines - 12;

  if (normalizedOld === normalizedNew) {
    return (
      <div className={`p-3 font-mono text-xs ${tk.text.muted} ${tk.codeBg}`}>
        No changes
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${tk.codeBg}`}>
      {shouldShowExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-2 right-2 h-6 w-6 p-0 z-10 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 dark:text-zinc-600 dark:hover:text-zinc-400 bg-stone-100/80 dark:bg-zinc-900/80 transition-colors cursor-pointer"
          aria-label={isExpanded ? 'Show fewer lines' : 'Show all lines'}
        >
          {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      )}

      <div className="font-mono text-[10px] leading-relaxed overflow-x-auto">
        {linesToShow.map((line) => {
          const bgClass = line.type === 'added' ? 'bg-emerald-500/10' : line.type === 'removed' ? 'bg-red-500/10' : '';
          const prefixClass = line.type === 'added' ? 'text-emerald-400/70' : line.type === 'removed' ? 'text-red-400/70' : 'text-stone-300 dark:text-zinc-700';
          const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

          return (
            <div key={line.id} className={`flex ${bgClass}`}>
              <span className={`select-none w-4 text-center shrink-0 ${prefixClass}`}>{prefix}</span>
              <span className={`flex-1 whitespace-pre-wrap break-all px-2 ${tk.text.primary}`} data-language={language.toLowerCase()}>
                {line.content || ' '}
              </span>
            </div>
          );
        })}
      </div>

      {!isExpanded && shouldShowExpandButton && (
        <div className={`text-center text-xs py-2 border-t border-emerald-500/20 ${tk.text.muted} bg-stone-50/50 dark:bg-zinc-950/50`}>
          +{hiddenCount} more lines
        </div>
      )}
    </div>
  );
}
