import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { parseJson } from '../../utils/json.js';
import { cn } from '../../utils/cn.js';
import { tk } from '../../tokens.js';

interface FallbackToolProps {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
}

const AUTO_EXPAND_THRESHOLD = 5;

export function FallbackTool({ toolName, input, result }: FallbackToolProps): React.JSX.Element {
  const resultLines = result ? result.split('\n').filter(l => l.trim()).length : 0;
  const [isExpanded, setIsExpanded] = useState(() => resultLines > 0 && resultLines <= AUTO_EXPAND_THRESHOLD);

  const formatContent = (content: string): string => {
    try { return JSON.stringify(parseJson(content), null, 2); }
    catch { return content; }
  };

  const getSummary = (): string => {
    if (result) {
      const firstLine = result.split('\n')[0].slice(0, 60);
      return firstLine.length < result.split('\n')[0].length ? firstLine + '...' : firstLine;
    }
    return 'completed';
  };

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      headerContent={(
        <>
          <div className="flex items-center gap-2">
            <Wrench size={14} className={`${tk.text.muted} flex-shrink-0`} />
            <span className={`text-xs ${tk.text.muted}`}>{toolName}</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{getSummary()}</span>
        </>
      )}
      content={(
        <div className={`border-t ${tk.separator}`}>
          {result && (
            <pre className={cn('m-0 px-3 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words', tk.codeBg, tk.text.primary)}>
              {formatContent(result)}
            </pre>
          )}
          {input && (
            <div className={cn('border-t px-3 py-2.5 font-mono text-[13px] leading-relaxed', tk.separator, tk.codeBgSubtle)}>
              <span className={`uppercase text-[13px] tracking-wider ${tk.text.faint}`}>Input</span>
              <pre className={cn('m-0 mt-1 whitespace-pre-wrap break-words', tk.text.secondary)}>
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    />
  );
}
