import React, { useState } from 'react';
import { Plug } from 'lucide-react';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { cn } from '../../utils/cn.js';
import { tk, accent } from '../../tokens.js';

interface McpToolProps {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
}

function parseMcpName(toolName: string): { server: string; tool: string } {
  const match = toolName.match(/^mcp__([^_]+)__(.+)$/);
  if (!match) return { server: '', tool: toolName };
  return { server: match[1].replace(/_/g, ' '), tool: match[2].replace(/_/g, ' ') };
}

/** Keys checked (in order) for building the header summary line. */
const SUMMARY_KEYS = [
  'path', 'url', 'query', 'pattern', 'command', 'prompt', 'code',
  // Chrome DevTools / browser-automation keys
  'selector', 'text', 'expression', 'script', 'value', 'name',
];

function getInputSummary(input: Record<string, unknown>): string {
  for (const key of SUMMARY_KEYS) {
    const val = input[key];
    if (typeof val === 'string' && val.length > 0) return val.length > 80 ? val.slice(0, 77) + '…' : val;
  }
  for (const val of Object.values(input)) {
    if (typeof val === 'string' && val.length > 0) return val.length > 80 ? val.slice(0, 77) + '…' : val;
  }
  return '';
}

/** Try to pretty-print JSON results; fall back to raw text. */
function formatResult(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

const AUTO_EXPAND_THRESHOLD = 5;

export function McpTool({ toolName, input, result }: McpToolProps): React.JSX.Element {
  const resultLines = result ? result.split('\n').filter(l => l.trim()).length : 0;
  const [isExpanded, setIsExpanded] = useState(() => resultLines > 0 && resultLines <= AUTO_EXPAND_THRESHOLD);
  const { server, tool } = parseMcpName(toolName);
  const summary = getInputSummary(input) || (result ? result.split('\n')[0].slice(0, 80) : 'completed');

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName={accent.purple.card}
      headerContent={(
        <>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Plug size={14} className={`${accent.purple.icon} flex-shrink-0`} />
            <span className={`text-xs ${tk.text.muted}`}>{tool}</span>
            {server && <span className={`text-[13px] ${tk.text.faint}`}>{server}</span>}
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{summary}</span>
        </>
      )}
      content={(
        <div className={`border-t ${tk.separator}`}>
          {result && (
            <pre className={cn(
              'm-0 px-3 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-auto',
              tk.codeBg, tk.text.primary, tk.scrollbar,
            )}>
              {formatResult(result)}
            </pre>
          )}
        </div>
      )}
    />
  );
}
