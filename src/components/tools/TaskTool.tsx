import React, { useState, useEffect, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import type { ChatMessage, ToolResult } from '../../types.js';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { useAgentColor } from '../../context.js';
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
const DEFAULT_TINT = TINTS.purple;

interface TaskToolProps {
  input: { prompt?: string; description?: string; subagent_type?: string; team_name?: string; name?: string };
  result: string;
  toolUseId?: string;
  childrenMessages?: Record<string, ChatMessage[]>;
  toolResults?: Record<string, ToolResult>;
  isPending?: boolean;
  isStreaming?: boolean;
  renderChildMessage?: (message: ChatMessage) => React.ReactNode;
}

const EMPTY_CHILDREN: Record<string, ChatMessage[]> = {};

export function TaskTool({
  input, result, toolUseId, childrenMessages = EMPTY_CHILDREN,
  isPending = false, isStreaming, renderChildMessage,
}: TaskToolProps): React.JSX.Element {
  const hasChildren = toolUseId && childrenMessages[toolUseId] && childrenMessages[toolUseId].length > 0;
  const children = toolUseId ? childrenMessages[toolUseId] || [] : [];

  const taskDescription = input?.description || 'Subagent task';
  const agentType = input?.subagent_type || 'general';
  const isTeamTask = !!input?.team_name;
  const agentName = input?.name;

  const teamColor = useAgentColor(input?.name);
  const tint = (teamColor && TINTS[teamColor]) || DEFAULT_TINT;
  const isRunning = isStreaming !== false && (isPending || (!result && !hasChildren));

  const resultLines = result ? result.split('\n').filter(l => l.trim()).length : 0;
  const [isExpanded, setIsExpanded] = useState(() => hasChildren || (resultLines > 0 && resultLines <= 5));

  useEffect(() => {
    if (hasChildren && !isExpanded) setIsExpanded(true);
  }, [hasChildren]);

  const childrenRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (childrenRef.current && children.length > 0) {
      childrenRef.current.scrollTo({ top: childrenRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [children.length]);

  const label = isTeamTask ? (agentName || 'Agent') : 'Task';

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      wrapperClassName="w-full"
      cardClassName={cn(tint.border, tint.bg)}
      headerContent={(
        <>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 size={14} className={cn(tint.icon, 'animate-spin flex-shrink-0')} />
            ) : (
              <Bot size={14} className={cn(tint.icon, 'flex-shrink-0')} />
            )}
            <span className={`text-xs ${tk.text.muted}`}>{label}</span>
            {isTeamTask && teamColor && (
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isRunning ? 'animate-pulse' : '', `bg-${teamColor}-400`)} />
            )}
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{taskDescription}</span>
          {agentType !== 'general' && agentType !== 'general-purpose' && (
            <span className={`text-[10px] ${tk.text.faint}`}>{agentType}</span>
          )}
        </>
      )}
      content={(
        <div className={`border-t ${tk.separator}`}>
          {hasChildren ? (
            <div
              ref={childrenRef}
              className={cn('max-h-80 overflow-y-auto p-3 space-y-1', tk.scrollbar, 'bg-stone-50/50 dark:bg-zinc-950/50')}
            >
              {children.map((childMessage) => (
                <React.Fragment key={childMessage.messageId}>
                  {renderChildMessage ? renderChildMessage(childMessage) : null}
                </React.Fragment>
              ))}
            </div>
          ) : result ? (
            <pre className={cn('m-0 px-3 py-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words', tk.codeBg, tk.text.primary)}>
              {result}
            </pre>
          ) : null}
        </div>
      )}
    />
  );
}
