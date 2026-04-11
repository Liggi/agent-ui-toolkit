import React, { useState, useMemo } from 'react';
import { Hash, MessageSquare, User } from 'lucide-react';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { cn } from '../../utils/cn.js';
import { tk, accent } from '../../tokens.js';

interface SlackToolProps {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
}

interface SlackMessage {
  userName: string;
  realName: string;
  channel: string;
  text: string;
  time: string;
  threadTs?: string;
}

function parseSlackCsv(csv: string): SlackMessage[] {
  const rows = parseCsvRows(csv.trim());
  if (rows.length < 2) return [];

  const headerCols = rows[0];
  const idx = (name: string) => headerCols.indexOf(name);

  const messages: SlackMessage[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 4) continue;
    messages.push({
      userName: cols[idx('UserName')] || cols[idx('userName')] || '',
      realName: cols[idx('RealName')] || cols[idx('realName')] || '',
      channel: cols[idx('Channel')] || cols[idx('channel')] || '',
      text: cols[idx('Text')] || cols[idx('text')] || '',
      time: cols[idx('Time')] || cols[idx('time')] || '',
      threadTs: cols[idx('ThreadTs')] || cols[idx('threadTs')] || undefined,
    });
  }
  return messages;
}

/** CSV parser that handles quoted fields with embedded newlines and commas. */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  const row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(current);
      current = '';
      if (row.length > 1) rows.push([...row]);
      row.length = 0;
    } else {
      current += ch;
    }
  }
  row.push(current);
  if (row.length > 1) rows.push(row);
  return rows;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function getSlackAction(toolName: string): string {
  const match = toolName.match(/^mcp__slack__(.+)$/);
  if (!match) return 'Slack';
  return match[1].replace(/_/g, ' ');
}

function getSlackSummary(toolName: string, input: Record<string, unknown>): string {
  const action = toolName.match(/^mcp__slack__(.+)$/)?.[1] || '';

  if (action === 'conversations_history') {
    const channel = input.channel_id as string || '';
    return channel.startsWith('#') ? channel : channel.startsWith('@') ? channel : `#${channel}`;
  }
  if (action === 'conversations_search_messages') {
    return (input.search_query as string) || (input.filter_in_channel as string) || 'messages';
  }
  if (action === 'users_search') {
    return (input.query as string) || '';
  }
  // Fall back to first string input
  for (const val of Object.values(input)) {
    if (typeof val === 'string' && val.length > 0) return val.length > 60 ? val.slice(0, 57) + '...' : val;
  }
  return '';
}

export function SlackTool({ toolName, input, result }: SlackToolProps): React.JSX.Element {
  const messages = useMemo(() => parseSlackCsv(result), [result]);
  const [isExpanded, setIsExpanded] = useState(() => messages.length > 0 && messages.length <= 5);
  const action = getSlackAction(toolName);
  const summary = getSlackSummary(toolName, input);

  // If we couldn't parse messages, fall back to showing count or raw preview
  const hasStructuredData = messages.length > 0;

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName={accent.indigo.card}
      headerContent={(
        <>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MessageSquare size={14} className={`${accent.indigo.icon} flex-shrink-0`} />
            <span className={`text-xs ${tk.text.muted}`}>{action}</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{summary}</span>
          {hasStructuredData && (
            <span className={`text-[10px] ${tk.text.faint} flex-shrink-0`}>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </>
      )}
      content={(
        <div className={`border-t ${tk.separator}`}>
          {hasStructuredData ? (
            <div className={`divide-y ${tk.separator} max-h-80 overflow-y-auto ${tk.scrollbar}`}>
              {messages.map((msg, i) => (
                <div key={i} className="px-3 py-2 flex gap-2.5">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className={cn('w-5 h-5 rounded flex items-center justify-center', 'bg-indigo-500/10 dark:bg-indigo-500/10')}>
                      <User size={10} className={accent.indigo.icon} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-[11px] font-medium', tk.text.primary)}>
                        {msg.realName || msg.userName}
                      </span>
                      {msg.channel && (
                        <span className={cn('text-[10px] flex items-center gap-0.5', tk.text.faint)}>
                          <Hash size={8} />
                          {msg.channel.replace(/^#/, '')}
                        </span>
                      )}
                      <span className={cn('text-[10px] ml-auto flex-shrink-0', tk.text.faint)}>
                        {formatTime(msg.time)}
                      </span>
                    </div>
                    <p className={cn('text-[11px] leading-relaxed mt-0.5 whitespace-pre-wrap break-words', tk.text.secondary)}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <pre className={cn('m-0 px-3 py-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words', tk.codeBg, tk.text.primary)}>
              {result}
            </pre>
          )}
        </div>
      )}
    />
  );
}
