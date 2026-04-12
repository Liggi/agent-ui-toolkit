import React, { useState, useMemo } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { cn } from '../../utils/cn.js';
import { tk, accent } from '../../tokens.js';

interface NotionToolProps {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
}

interface NotionPage {
  id: string;
  title: string;
  url?: string;
  type?: string;
  highlight?: string;
  timestamp?: string;
}

interface NotionSearchResult {
  results: NotionPage[];
  type?: string;
}

function parseNotionResult(result: string): NotionSearchResult | null {
  try {
    const parsed = JSON.parse(result);
    if (parsed.results && Array.isArray(parsed.results)) {
      return parsed as NotionSearchResult;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function getNotionAction(toolName: string): string {
  // Handle both mcp__notion__xxx and mcp__claude_ai_Notion__xxx patterns
  const match = toolName.match(/^mcp__(?:claude_ai_)?[Nn]otion__(.+)$/);
  if (!match) return 'Notion';
  return match[1].replace(/^notion-/, '').replace(/[-_]/g, ' ');
}

function getNotionSummary(toolName: string, input: Record<string, unknown>): string {
  const query = input.query as string;
  if (query) return query.length > 60 ? query.slice(0, 57) + '...' : query;

  const id = input.id as string;
  if (id) return id;

  for (const val of Object.values(input)) {
    if (typeof val === 'string' && val.length > 0) return val.length > 60 ? val.slice(0, 57) + '...' : val;
  }
  return '';
}

export function NotionTool({ toolName, input, result }: NotionToolProps): React.JSX.Element {
  const parsed = useMemo(() => parseNotionResult(result), [result]);
  const [isExpanded, setIsExpanded] = useState(() =>
    parsed !== null && parsed.results.length > 0 && parsed.results.length <= 5
  );
  const action = getNotionAction(toolName);
  const summary = getNotionSummary(toolName, input);

  const hasStructuredData = parsed !== null && parsed.results.length > 0;

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName={accent.zinc.card}
      headerContent={(
        <>
          <div className="flex items-center gap-2 flex-shrink-0">
            <FileText size={14} className={`${accent.zinc.icon} flex-shrink-0`} />
            <span className={`text-xs ${tk.text.muted}`}>{action}</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{summary}</span>
          {hasStructuredData && (
            <span className={`text-[13px] ${tk.text.faint} flex-shrink-0`}>
              {parsed.results.length} result{parsed.results.length !== 1 ? 's' : ''}
            </span>
          )}
        </>
      )}
      content={(
        <div className={`border-t ${tk.separator}`}>
          {hasStructuredData ? (
            <div className={`divide-y ${tk.separator} max-h-80 overflow-y-auto ${tk.scrollbar}`}>
              {parsed.results.map((page) => (
                <div key={page.id} className="px-3 py-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[13px] font-medium', tk.text.primary)}>
                          {page.title || 'Untitled'}
                        </span>
                        {page.type && page.type !== 'page' && (
                          <span className={cn(
                            'text-[9px] px-1 py-0.5 rounded',
                            'bg-stone-200/60 dark:bg-zinc-800/50',
                            tk.text.faint,
                          )}>
                            {page.type}
                          </span>
                        )}
                      </div>
                      {page.highlight && (
                        <p className={cn('text-[13px] leading-relaxed mt-0.5', tk.text.secondary)}>
                          {page.highlight}
                        </p>
                      )}
                      {page.timestamp && (
                        <span className={cn('text-[9px] mt-0.5 block', tk.text.faint)}>
                          {formatTimestamp(page.timestamp)}
                        </span>
                      )}
                    </div>
                    {page.url && (
                      <ExternalLink size={10} className={cn('flex-shrink-0 mt-1', tk.text.faint)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className={cn('m-0 px-3 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words', tk.codeBg, tk.text.primary)}>
              {result}
            </pre>
          )}
        </div>
      )}
    />
  );
}
