import React, { useState } from 'react';
import { Users, Send, XCircle, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { useAgentColor } from '../../context.js';
import { parseJson } from '../../utils/json.js';
import { cn } from '../../utils/cn.js';
import { tk } from '../../tokens.js';

const TINTS: Record<string, { border: string; bg: string; icon: string }> = {
  blue:   { border: 'border-blue-500/20',   bg: 'bg-blue-500/5',   icon: 'text-blue-400/80' },
  green:  { border: 'border-green-500/20',  bg: 'bg-green-500/5',  icon: 'text-green-400/80' },
  yellow: { border: 'border-amber-500/20',  bg: 'bg-amber-500/5',  icon: 'text-amber-400/80' },
  purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/5', icon: 'text-purple-400/80' },
  red:    { border: 'border-red-500/20',    bg: 'bg-red-500/5',    icon: 'text-red-400/80' },
  cyan:   { border: 'border-cyan-500/20',   bg: 'bg-cyan-500/5',   icon: 'text-cyan-400/80' },
};
const DEFAULT_TINT = { border: 'border-zinc-500/20', bg: 'bg-zinc-500/5', icon: 'text-zinc-400/80' };
const DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-400', green: 'bg-green-400', yellow: 'bg-amber-400',
  purple: 'bg-purple-400', red: 'bg-red-400', cyan: 'bg-cyan-400',
};

// ─── TeamCreate ──────────────────────────────────────────────────────────────

interface TeamCreateToolProps {
  input: { team_name?: string; description?: string };
  result: string;
  isPending?: boolean;
  isStreaming?: boolean;
}

export function TeamCreateTool({ input, result, isPending, isStreaming }: TeamCreateToolProps): React.JSX.Element {
  const teamName = input?.team_name || 'unnamed';
  const description = input?.description || '';
  const isRunning = isStreaming !== false && (isPending || !result);
  const [isExpanded, setIsExpanded] = useState(false);

  let members: Array<{ name: string; agentType?: string; color?: string }> = [];
  if (result) {
    try {
      const parsed = parseJson(result) as { members?: Array<{ name: string; agentType?: string; color?: string }> };
      if (parsed.members) members = parsed.members;
    } catch { /* not structured */ }
  }

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName="border-amber-500/20 bg-amber-500/5"
      canExpand={members.length > 0}
      headerContent={(
        <>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 size={14} className="text-amber-400/80 animate-spin flex-shrink-0" />
            ) : (
              <Users size={14} className="text-amber-400/80 flex-shrink-0" />
            )}
            <span className={`text-xs ${tk.text.muted}`}>{isRunning ? 'Creating team' : 'Team'}</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>
            {teamName}{description ? ` — ${description}` : ''}
          </span>
        </>
      )}
      content={members.length > 0 ? (
        <div className={`border-t ${tk.separator} px-3 py-2 flex flex-wrap gap-1.5`}>
          {members.map((member) => (
            <span key={member.name} className={cn('inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded', 'bg-stone-100 dark:bg-zinc-800/50')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[member.color || ''] || 'bg-zinc-500')} />
              <span className={tk.text.primary}>{member.name}</span>
              {member.agentType && member.agentType !== 'general-purpose' && (
                <span className={tk.text.faint}>{member.agentType}</span>
              )}
            </span>
          ))}
        </div>
      ) : undefined}
    />
  );
}

// ─── SendMessage ─────────────────────────────────────────────────────────────

interface SendMessageToolProps {
  input: {
    type?: 'message' | 'broadcast' | 'shutdown_request' | 'shutdown_response' | 'plan_approval_response';
    recipient?: string; content?: string; summary?: string; approve?: boolean;
  };
  result: string;
  isPending?: boolean;
  isStreaming?: boolean;
}

export function SendMessageTool({ input, result, isPending, isStreaming }: SendMessageToolProps): React.JSX.Element {
  const msgType = input?.type || 'message';
  const recipient = input?.recipient || 'unknown';
  const summary = input?.summary || '';
  const content = input?.content || '';
  const isRunning = isStreaming !== false && (isPending || !result);

  const recipientColor = useAgentColor(recipient);
  const tint = (recipientColor && TINTS[recipientColor]) || DEFAULT_TINT;

  let icon: React.ReactNode;
  let label: string;
  let cardTint = tint;

  switch (msgType) {
    case 'shutdown_request':
      icon = <XCircle size={14} className="text-red-400/80 flex-shrink-0" />;
      label = 'Shutdown request';
      cardTint = TINTS.red;
      break;
    case 'shutdown_response':
      icon = input?.approve
        ? <CheckCircle size={14} className="text-green-400/80 flex-shrink-0" />
        : <XCircle size={14} className="text-red-400/80 flex-shrink-0" />;
      label = input?.approve ? 'Shutdown approved' : 'Shutdown rejected';
      cardTint = input?.approve ? TINTS.green : TINTS.red;
      break;
    case 'broadcast':
      icon = <Send size={14} className={cn(tint.icon, 'flex-shrink-0')} />;
      label = 'Broadcast';
      break;
    default:
      icon = isRunning
        ? <Loader2 size={14} className={cn(tint.icon, 'animate-spin flex-shrink-0')} />
        : <MessageSquare size={14} className={cn(tint.icon, 'flex-shrink-0')} />;
      label = isRunning ? 'Sending' : 'Message';
  }

  const contentLines = content ? content.split('\n').filter(l => l.trim()).length : 0;
  const [isExpanded, setIsExpanded] = useState(() => contentLines > 0 && contentLines <= 5);

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName={cn(cardTint.border, cardTint.bg)}
      canExpand={!!content}
      headerContent={(
        <>
          <div className="flex items-center gap-2">{icon}<span className={`text-xs ${tk.text.muted}`}>{label}</span></div>
          <span className={`text-xs ${tk.text.secondary}`}>→ {recipient}</span>
          {summary && <span className={`text-xs ${tk.text.muted} truncate flex-1`}>{summary}</span>}
        </>
      )}
      content={content ? (
        <div className={`border-t ${tk.separator}`}>
          <pre className={cn('m-0 px-3 py-2.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words', tk.codeBg, tk.text.primary)}>
            {content.length > 500 ? content.slice(0, 500) + '...' : content}
          </pre>
        </div>
      ) : undefined}
    />
  );
}

// ─── TeamDelete ──────────────────────────────────────────────────────────────

interface TeamDeleteToolProps {
  result: string;
  isPending?: boolean;
  isStreaming?: boolean;
}

export function TeamDeleteTool({ result, isPending, isStreaming }: TeamDeleteToolProps): React.JSX.Element {
  const isRunning = isStreaming !== false && (isPending || !result);

  return (
    <CollapsibleToolCard
      isExpanded={false}
      onExpandedChange={() => {}}
      cardClassName="border-zinc-500/20 bg-zinc-500/5"
      canExpand={false}
      headerContent={(
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 size={14} className="text-zinc-400/80 animate-spin flex-shrink-0" />
          ) : (
            <CheckCircle size={14} className="text-zinc-400/80 flex-shrink-0" />
          )}
          <span className={`text-xs ${tk.text.muted}`}>{isRunning ? 'Disbanding team' : 'Team disbanded'}</span>
        </div>
      )}
    />
  );
}
