import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertTriangle, FileText, Edit, Terminal, Search, List, FileEdit, Loader2, Globe, ExternalLink } from 'lucide-react';
import { codeToHtml } from 'shiki';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible.js';
import { useToolkitTheme } from '../context.js';
import { formatFilePath } from '../utils/tool-utils.js';
import { cn } from '../utils/cn.js';
import { tk, accent } from '../tokens.js';
import type { ChatMessage, ToolResult, CustomToolRenderer, BackgroundTaskOutput } from '../types.js';
import { ReadTool } from './tools/ReadTool.js';
import { EditTool } from './tools/EditTool.js';
import { WriteTool } from './tools/WriteTool.js';
import { BashTool } from './tools/BashTool.js';
import { SearchTool } from './tools/SearchTool.js';
import { TodoTool } from './tools/TodoTool.js';
import { WebTool } from './tools/WebTool.js';
import { TaskTool } from './tools/TaskTool.js';
import { TaskOutputTool } from './tools/TaskOutputTool.js';
import { PlanTool } from './tools/PlanTool.js';
import { AskUserQuestionTool } from './tools/AskUserQuestionTool.js';
import { FallbackTool } from './tools/FallbackTool.js';
import { McpTool } from './tools/McpTool.js';
import { TaskManagementTool } from './tools/TaskManagementTool.js';
import { ToolSearchTool } from './tools/ToolSearchTool.js';
import { TeamCreateTool, SendMessageTool, TeamDeleteTool } from './tools/TeamTools.js';

// ---- Error rendering ----

function ErrorHighlight({ code }: { code: string }): React.JSX.Element {
  const theme = useToolkitTheme();
  const shikiTheme = theme === 'dark' ? 'github-dark-default' : 'github-light-default';
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    codeToHtml(code, { lang: 'shellscript', theme: shikiTheme })
      .then(setHtml).catch(() => setHtml(null));
  }, [code, shikiTheme]);

  if (!html) {
    return (
      <pre className={cn('m-0 px-3 py-2.5 font-mono text-[10px] whitespace-pre-wrap break-words leading-relaxed', tk.text.primary)}>
        {code}
      </pre>
    );
  }

  return (
    <div
      className="[&_pre]:!bg-transparent [&_pre]:px-3 [&_pre]:py-2.5 [&_pre]:m-0 [&_pre]:text-[10px] [&_pre]:leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:!bg-transparent"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const ERROR_TOOL_LABELS: Record<string, string> = {
  WebFetch: 'Fetch', WebSearch: 'Search', MultiEdit: 'Edit', ToolSearch: 'Tools',
};

function getErrorContext(toolName: string, toolInput: Record<string, unknown>, workingDirectory?: string): string | undefined {
  switch (toolName) {
    case 'Bash': return typeof toolInput.command === 'string' ? toolInput.command.slice(0, 60) : undefined;
    case 'WebFetch': return typeof toolInput.url === 'string' ? toolInput.url : undefined;
    case 'WebSearch': return typeof toolInput.query === 'string' ? toolInput.query : undefined;
    case 'Read': case 'Edit': case 'Write': case 'MultiEdit': {
      const path = typeof toolInput.file_path === 'string' ? toolInput.file_path : '';
      if (workingDirectory && path.startsWith(workingDirectory)) return path.slice(workingDirectory.length + 1);
      return path || undefined;
    }
    default: return undefined;
  }
}

function ErrorBlock({ message, toolName, context, isExpanded, onExpandedChange }: {
  message: string; toolName?: string; context?: string; isExpanded: boolean; onExpandedChange: (v: boolean) => void;
}): React.JSX.Element {
  const firstLine = message.split('\n')[0];
  const isMultiLine = message.includes('\n') && message.trim() !== firstLine.trim();
  const headerText = firstLine.slice(0, 80) + (firstLine.length > 80 ? '...' : '');
  const label = toolName ? (ERROR_TOOL_LABELS[toolName] || toolName) : undefined;

  const headerContent = (
    <>
      <AlertTriangle size={14} className="text-red-400/80 flex-shrink-0" />
      {label && <span className="text-xs text-red-400/60 flex-shrink-0">{label}</span>}
      {context && <span className={`text-xs ${tk.text.secondary} truncate flex-shrink min-w-0`}>{context}</span>}
      {context && <span className={tk.text.faint}>|</span>}
      <span className="text-xs text-red-300/70 truncate flex-1">{headerText}</span>
    </>
  );

  if (!isMultiLine) {
    return (
      <div className="w-fit max-w-full">
        <div className="border border-red-500/30 rounded-lg overflow-hidden bg-red-500/5">
          <div className="flex items-center gap-2 px-3 py-2">{headerContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-fit max-w-full">
      <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
        <div className="border border-red-500/30 rounded-lg overflow-hidden bg-red-500/5">
          <CollapsibleTrigger className="w-full text-left cursor-pointer select-none">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 transition-colors">
              {headerContent}
              <ChevronDown size={12} className={`text-red-400/60 transition-transform duration-150 flex-shrink-0 ${!isExpanded ? '-rotate-90' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={cn('border-t border-red-500/20', tk.codeBg)}>
              <ErrorHighlight code={message} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}

// ---- Main ToolContent ----

export interface ToolContentProps {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: ToolResult;
  workingDirectory?: string;
  toolUseId?: string;
  childrenMessages?: Record<string, ChatMessage[]>;
  toolResults?: Record<string, ToolResult>;
  questionId?: string;
  onAnswerQuestion?: (questionId: string, answers: Record<string, string>) => void;
  isStreaming?: boolean;
  renderChildMessage?: (message: ChatMessage) => React.ReactNode;
  /** Extension point: consumer-defined renderers checked before defaults. */
  customRenderers?: Record<string, CustomToolRenderer>;
  /** Callbacks for PlanTool approval UI. */
  onPlanApprove?: () => void | Promise<void>;
  onPlanReject?: () => void | Promise<void>;
  /** Whether a plan has already been acted on (e.g., subsequent user message exists). */
  isPlanActedOn?: boolean;
  /** Optional fetcher for BashTool background output. */
  fetchBackgroundOutput?: (path: string) => Promise<BackgroundTaskOutput | null>;
}

export function ToolContent({
  toolName, toolInput, toolResult, workingDirectory, toolUseId,
  childrenMessages, toolResults, questionId, onAnswerQuestion, isStreaming,
  renderChildMessage, customRenderers, onPlanApprove, onPlanReject, isPlanActedOn,
  fetchBackgroundOutput,
}: ToolContentProps): React.JSX.Element | null {
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  const getResultContent = (): string => {
    if (!toolResult?.result) return '';
    if (typeof toolResult.result === 'string') return toolResult.result;
    if (Array.isArray(toolResult.result)) {
      return toolResult.result.filter(b => b.type === 'text').map(b => b.text || '').join('\n');
    }
    return '';
  };

  const resultContent = getResultContent();
  const isError = toolResult?.is_error === true;
  const isPending = (!toolResult || toolResult.status === 'pending') && isStreaming !== false;

  // ── Check custom renderers first ──
  if (customRenderers?.[toolName]) {
    const rendered = customRenderers[toolName]({
      toolName, input: toolInput, result: resultContent,
      isError, isPending, toolUseId, workingDirectory, isStreaming,
    });
    if (rendered !== undefined) return rendered as React.JSX.Element | null;
  }

  // ── Pending state ──
  if (isPending) {
    if (toolName === 'Task' || toolName === 'Agent') {
      return <TaskTool input={toolInput} result={resultContent} toolUseId={toolUseId} childrenMessages={childrenMessages} toolResults={toolResults} isPending isStreaming={isStreaming} renderChildMessage={renderChildMessage} />;
    }
    if (toolName === 'TaskOutput') {
      return <TaskOutputTool input={toolInput as { task_id?: string; block?: boolean; timeout?: number }} result={resultContent} isPending />;
    }
    if (toolName === 'AskUserQuestion' && !questionId) return null;
    if (toolName === 'Bash') {
      return <BashTool input={toolInput} result={resultContent} workingDirectory={workingDirectory} isPending fetchBackgroundOutput={fetchBackgroundOutput} />;
    }

    // Generic loading card
    const getToolConfig = () => {
      switch (toolName) {
        case 'Read': return { icon: FileText, label: 'Reading', detail: formatFilePath(String(toolInput?.file_path ?? ''), workingDirectory), iconClass: accent.blue.icon };
        case 'Edit': case 'MultiEdit': return { icon: Edit, label: 'Editing', detail: formatFilePath(String(toolInput?.file_path ?? ''), workingDirectory), iconClass: accent.emerald.icon };
        case 'Write': return { icon: FileEdit, label: 'Writing', detail: formatFilePath(String(toolInput?.file_path ?? ''), workingDirectory), iconClass: accent.violet.icon };
        case 'Bash': return { icon: Terminal, label: 'Running', detail: typeof toolInput?.command === 'string' ? toolInput.command.slice(0, 60) : '', iconClass: accent.orange.icon };
        case 'Grep': return { icon: Search, label: 'Searching', detail: String(toolInput?.pattern ?? ''), iconClass: accent.amber.icon };
        case 'Glob': return { icon: Search, label: 'Finding', detail: String(toolInput?.pattern ?? ''), iconClass: accent.violet.icon };
        case 'LS': return { icon: List, label: 'Listing', detail: String(toolInput?.path ?? '.'), iconClass: accent.violet.icon };
        case 'ToolSearch': return { icon: Search, label: 'Loading tools', detail: String(toolInput?.query ?? ''), iconClass: accent.violet.icon };
        case 'WebSearch': return { icon: Globe, label: 'Searching', detail: String(toolInput?.query ?? ''), iconClass: accent.emerald.icon };
        case 'WebFetch': return { icon: ExternalLink, label: 'Fetching', detail: toolInput?.url ? (() => { try { return new URL(toolInput.url as string).hostname; } catch { return ''; } })() : '', iconClass: accent.emerald.icon };
        default: {
          if (toolName.startsWith('mcp__')) {
            const match = toolName.match(/^mcp__[^_]+__(.+)$/);
            const label = match ? match[1].replace(/_/g, ' ') : toolName;
            return { icon: FileText, label, detail: (toolInput?.path || toolInput?.url || toolInput?.query || toolInput?.pattern || '') as string, iconClass: accent.purple.icon };
          }
          return { icon: FileText, label: toolName, detail: '', iconClass: tk.text.muted };
        }
      }
    };

    const config = getToolConfig();
    const IconComponent = config.icon;

    return (
      <div className="w-fit max-w-full">
        <div className={cn('border rounded-lg overflow-hidden', tk.card.border, tk.card.bg)}>
          <div className="flex items-center gap-2 px-3 py-2">
            <Loader2 size={12} className={`${tk.text.muted} flex-shrink-0 animate-spin`} />
            <IconComponent size={14} className={`${config.iconClass} flex-shrink-0`} />
            <span className={`text-xs ${tk.text.muted}`}>{config.label}</span>
            <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{config.detail}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error handling ──
  if (isError && (toolName === 'AskUserQuestion' || toolName === 'EnterPlanMode' || resultContent?.toLowerCase().includes('answer questions?'))) {
    return null;
  }

  if (isError && (toolName === 'ExitPlanMode' || toolName === 'exit_plan_mode' || resultContent?.toLowerCase().includes('exit plan mode'))) {
    return <PlanTool input={toolInput} result={resultContent} isPendingApproval isActedOn={isPlanActedOn} onApprove={onPlanApprove} onReject={onPlanReject} />;
  }

  if (isError) {
    return <ErrorBlock message={resultContent || 'Tool execution failed'} toolName={toolName} context={getErrorContext(toolName, toolInput, workingDirectory)} isExpanded={isErrorExpanded} onExpandedChange={setIsErrorExpanded} />;
  }

  // ── Route to tool component ──
  switch (toolName) {
    case 'Read': return <ReadTool input={toolInput} result={resultContent} workingDirectory={workingDirectory} />;
    case 'Edit': case 'MultiEdit': return <EditTool input={toolInput} result={resultContent} isMultiEdit={toolName === 'MultiEdit'} workingDirectory={workingDirectory} />;
    case 'Write': return <WriteTool input={toolInput} result={resultContent} workingDirectory={workingDirectory} />;
    case 'Bash': return <BashTool input={toolInput} result={resultContent} fetchBackgroundOutput={fetchBackgroundOutput} />;
    case 'Grep': case 'Glob': case 'LS': return <SearchTool input={toolInput} result={resultContent} toolType={toolName} />;
    case 'TodoRead': case 'TodoWrite': return <TodoTool input={toolInput} result={resultContent} isWrite={toolName === 'TodoWrite'} />;
    case 'WebSearch': case 'WebFetch': return <WebTool input={toolInput} result={resultContent} toolType={toolName} />;
    case 'ToolSearch': return <ToolSearchTool input={toolInput as { query?: string; max_results?: number }} result={resultContent} />;
    case 'Task': case 'Agent': return <TaskTool input={toolInput} result={resultContent} toolUseId={toolUseId} childrenMessages={childrenMessages} toolResults={toolResults} isStreaming={isStreaming} renderChildMessage={renderChildMessage} />;
    case 'TaskOutput': return <TaskOutputTool input={toolInput as { task_id?: string; block?: boolean; timeout?: number }} result={resultContent} />;
    case 'TaskCreate': case 'TaskUpdate': return <TaskManagementTool input={toolInput} result={resultContent} isUpdate={toolName === 'TaskUpdate'} />;
    case 'EnterPlanMode': return null;
    case 'exit_plan_mode': case 'ExitPlanMode': return <PlanTool input={toolInput} result={resultContent} onApprove={onPlanApprove} onReject={onPlanReject} />;
    case 'AskUserQuestion': return <AskUserQuestionTool input={toolInput} result={resultContent} questionId={questionId} onAnswer={onAnswerQuestion} isPending={isPending} />;
    case 'TeamCreate': return <TeamCreateTool input={toolInput as { team_name?: string; description?: string }} result={resultContent} isPending={isPending} isStreaming={isStreaming} />;
    case 'SendMessage': return <SendMessageTool input={toolInput as { type?: 'message' | 'broadcast' | 'shutdown_request' | 'shutdown_response' | 'plan_approval_response'; recipient?: string; content?: string; summary?: string; approve?: boolean }} result={resultContent} isPending={isPending} isStreaming={isStreaming} />;
    case 'TeamDelete': return <TeamDeleteTool result={resultContent} isPending={isPending} isStreaming={isStreaming} />;
    default:
      if (toolName.startsWith('mcp__')) return <McpTool toolName={toolName} input={toolInput} result={resultContent} />;
      return <FallbackTool toolName={toolName} input={toolInput} result={resultContent} />;
  }
}
