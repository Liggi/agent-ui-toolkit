import React, { useState } from 'react';
import { ChevronDown, Search, FolderSearch, List } from 'lucide-react';
import { countLines, extractFileCount } from '../../utils/tool-utils.js';
import { cn } from '../../utils/cn.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible.js';
import { tk } from '../../tokens.js';

interface SearchToolProps {
  input: { pattern?: string; path?: string };
  result: string;
  toolType: 'Grep' | 'Glob' | 'LS';
}

const AUTO_EXPAND_THRESHOLD = 5;

export function SearchTool({ input, result, toolType }: SearchToolProps): React.JSX.Element {
  const resultLines = countLines(result);
  const [isExpanded, setIsExpanded] = useState(() => resultLines > 0 && resultLines <= AUTO_EXPAND_THRESHOLD);

  const getToolConfig = () => {
    switch (toolType) {
      case 'Grep': {
        const grepLines = countLines(result);
        const grepPath = input?.path ? String(input.path).split('/').pop() : '';
        const detail = grepPath ? `${input?.pattern || ''} in ${grepPath}` : (input?.pattern || '');
        return { icon: Search, label: 'Grep', color: 'text-amber-400/80', cardStyle: 'border-amber-500/20 bg-amber-500/5', pattern: detail };
      }
      case 'Glob': {
        return { icon: FolderSearch, label: 'Glob', color: 'text-violet-400/80', cardStyle: 'border-violet-500/20 bg-violet-500/5', pattern: input?.pattern || '' };
      }
      case 'LS': {
        return { icon: List, label: 'LS', color: 'text-violet-400/80', cardStyle: 'border-violet-500/20 bg-violet-500/5', pattern: input?.path || '.' };
      }
    }
  };

  const config = getToolConfig();
  const Icon = config.icon;

  return (
    <div className="w-fit max-w-full">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className={cn('border rounded-lg overflow-hidden', config.cardStyle)}>
          <CollapsibleTrigger className="w-full text-left cursor-pointer select-none">
            <div className={cn('flex items-center gap-2 px-3 py-2 transition-colors', tk.hover)}>
              <div className="flex items-center gap-2">
                <Icon size={14} className={config.color} />
                <span className={`text-xs ${tk.text.muted}`}>{config.label}</span>
              </div>
              <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{config.pattern}</span>
              <ChevronDown size={12} className={cn('transition-transform duration-150 flex-shrink-0', tk.text.faint, !isExpanded && '-rotate-90')} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {result && (
              <div className={`border-t ${tk.separator}`}>
                <pre className={cn('m-0 px-3 py-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words', tk.codeBg, tk.text.primary)}>
                  {result}
                </pre>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
