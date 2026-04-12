import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, XCircle, ExternalLink } from 'lucide-react';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { cn } from '../../utils/cn.js';
import { tk, accent } from '../../tokens.js';

interface LinearToolProps {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
}

// ── Types ──

interface LinearIssue {
  identifier: string;
  title: string;
  url?: string;
  state?: { name: string; type: string; color?: string };
  assignee?: { name: string } | null;
  priority?: number;
  labels?: { nodes: Array<{ name: string; color?: string }> };
}

interface LinearProject {
  name: string;
  url?: string;
  state?: string;
  description?: string;
}

type ParsedLinear =
  | { kind: 'issues'; issues: LinearIssue[] }
  | { kind: 'mutation'; success: boolean; issue?: LinearIssue }
  | { kind: 'project'; project: LinearProject }
  | { kind: 'projects'; projects: LinearProject[] }
  | null;

// ── Parsing ──

function parseLinearResult(result: string): ParsedLinear {
  let parsed: Record<string, unknown>;
  try {
    const raw = JSON.parse(result);
    // MCP results arrive as content block arrays: [{"type":"text","text":"..."}]
    if (Array.isArray(raw)) {
      const textBlock = raw.find((b: { type?: string; text?: string }) => b.type === 'text' && b.text);
      if (textBlock?.text) {
        parsed = JSON.parse(textBlock.text);
      } else {
        return null;
      }
    } else {
      parsed = raw;
    }
  } catch { return null; }

  // search_issues / search_issues_by_identifier
  const issues = parsed.issues as { nodes?: LinearIssue[] } | undefined;
  if (issues?.nodes && Array.isArray(issues.nodes)) {
    return { kind: 'issues', issues: issues.nodes };
  }

  // create_issue
  const create = parsed.issueCreate as { success?: boolean; issue?: LinearIssue } | undefined;
  if (create) {
    return { kind: 'mutation', success: !!create.success, issue: create.issue };
  }

  // edit_issue
  const update = parsed.issueUpdate as { success?: boolean; issue?: LinearIssue } | undefined;
  if (update) {
    return { kind: 'mutation', success: !!update.success, issue: update.issue };
  }

  // delete_issue
  const del = parsed.issueDelete as { success?: boolean } | undefined;
  if (del) {
    return { kind: 'mutation', success: !!del.success };
  }

  // get_issue
  const issue = parsed.issue as LinearIssue | undefined;
  if (issue?.identifier) {
    return { kind: 'issues', issues: [issue] };
  }

  // list_projects
  const projects = parsed.projects as { nodes?: LinearProject[] } | undefined;
  if (projects?.nodes && Array.isArray(projects.nodes)) {
    return { kind: 'projects', projects: projects.nodes };
  }

  // get_project
  const project = parsed.project as LinearProject | undefined;
  if (project?.name) {
    return { kind: 'project', project };
  }

  return null;
}

// ── Helpers ──

function getAction(toolName: string): string {
  const match = toolName.match(/^mcp__(?:claude_ai_)?[Ll]inear__(.+)$/);
  return match ? match[1].replace(/_/g, ' ') : toolName;
}

function getInputSummary(input: Record<string, unknown>): string {
  const keys = ['query', 'title', 'identifiers', 'id', 'issueId'] as const;
  for (const key of keys) {
    const val = input[key];
    if (typeof val === 'string' && val.length > 0) return val.length > 80 ? val.slice(0, 77) + '…' : val;
    if (Array.isArray(val)) return val.join(', ').slice(0, 80);
  }
  return '';
}

const STATE_ICON: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  canceled: XCircle,
};

const STATE_COLOR: Record<string, string> = {
  completed: 'text-emerald-600 dark:text-emerald-400/80',
  canceled: 'text-zinc-400 dark:text-zinc-500',
  started: 'text-amber-600 dark:text-amber-400/80',
  unstarted: 'text-stone-400 dark:text-zinc-500',
  triage: 'text-orange-500 dark:text-orange-400/80',
  backlog: 'text-stone-400 dark:text-zinc-600',
};

const PRIORITY_LABELS = ['No priority', 'Urgent', 'High', 'Medium', 'Low'];

// ── Sub-renderers ──

function IssueRow({ issue }: { issue: LinearIssue }): React.JSX.Element {
  const stateType = issue.state?.type || 'unstarted';
  const StateIcon = STATE_ICON[stateType] || Circle;
  const stateColor = STATE_COLOR[stateType] || tk.text.faint;

  return (
    <div className="px-3 py-1.5 flex items-center gap-2 min-w-0">
      <StateIcon size={12} className={cn('flex-shrink-0', stateColor)} />
      <span className={cn('text-[13px] font-mono flex-shrink-0', tk.text.faint)}>{issue.identifier}</span>
      <span className={cn('text-[13px] truncate flex-1 min-w-0', tk.text.primary)}>{issue.title}</span>
      {issue.assignee && (
        <span className={cn('text-[11px] flex-shrink-0', tk.text.faint)}>{issue.assignee.name}</span>
      )}
      {issue.labels?.nodes && issue.labels.nodes.length > 0 && (
        <div className="flex gap-1 flex-shrink-0">
          {issue.labels.nodes.slice(0, 2).map((label) => (
            <span
              key={label.name}
              className="text-[9px] px-1 py-0.5 rounded"
              style={label.color ? { backgroundColor: `${label.color}20`, color: label.color } : undefined}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      {issue.url && (
        <a href={issue.url} target="_blank" rel="noopener noreferrer" className={cn('flex-shrink-0', tk.text.faint, 'hover:text-indigo-500')}>
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

function MutationResult({ success, issue }: { success: boolean; issue?: LinearIssue }): React.JSX.Element {
  return (
    <div className="px-3 py-2 flex items-center gap-2">
      {success ? (
        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400/80 flex-shrink-0" />
      ) : (
        <XCircle size={12} className="text-red-600 dark:text-red-400/80 flex-shrink-0" />
      )}
      {issue ? (
        <>
          <span className={cn('text-[13px] font-mono', tk.text.faint)}>{issue.identifier}</span>
          <span className={cn('text-[13px] truncate flex-1', tk.text.primary)}>{issue.title}</span>
          {issue.url && (
            <a href={issue.url} target="_blank" rel="noopener noreferrer" className={cn('flex-shrink-0', tk.text.faint, 'hover:text-indigo-500')}>
              <ExternalLink size={10} />
            </a>
          )}
        </>
      ) : (
        <span className={cn('text-[13px]', tk.text.secondary)}>{success ? 'Success' : 'Failed'}</span>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: LinearProject }): React.JSX.Element {
  return (
    <div className="px-3 py-1.5 flex items-center gap-2 min-w-0">
      <Circle size={10} className={cn('flex-shrink-0', tk.text.faint)} />
      <span className={cn('text-[13px] truncate flex-1 min-w-0', tk.text.primary)}>{project.name}</span>
      {project.state && (
        <span className={cn('text-[9px] px-1 py-0.5 rounded', 'bg-stone-200/60 dark:bg-zinc-800/50', tk.text.faint)}>
          {project.state}
        </span>
      )}
      {project.url && (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className={cn('flex-shrink-0', tk.text.faint, 'hover:text-indigo-500')}>
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

// ── Linear icon (inline SVG to avoid adding a dep) ──

function LinearIcon({ size = 14, className }: { size?: number; className?: string }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" className={className}>
      <path d="M1.22541 61.5228c-.97401-1.6679-.9621-3.7358.02515-5.393L42.2113 1.7038c1.0762-1.81266 3.3714-2.41393 5.1357-1.34447 1.7643 1.06946 2.3512 3.34827 1.2749 5.16094L7.66132 59.946c-.98736 1.6629-3.29117 2.2133-4.96353 1.2006-.59502-.3603-1.06135-.8799-1.37738-1.4706-.0527-.0985-.10188-.1997-.1474-.3034-.0159-.0363-.03138-.0728-.04644-.1096Z" />
      <path d="M12.1816 77.934c-.7543-1.2904-.5323-2.9344.5671-3.9832l45.1186-43.0733c1.1466-1.0946 2.9483-1.0419 4.0275.1176 1.0793 1.1596 1.028 2.9791-.1186 4.0738L16.6576 78.1423c-1.1466 1.0946-2.9483 1.0419-4.0276-.1176-.1622-.1741-.2995-.3651-.4109-.5672-.0171-.031-.0337-.0623-.0497-.0939Z" />
      <path d="M22.9861 85.7189c-.5308-.9079-.2765-2.0785.576-2.6838l38.3729-27.2402c.8897-.6314 2.1128-.4117 2.734.491.6213.9028.4032 2.1398-.4866 2.7712L25.8095 86.2973c-.89.6314-2.1129.4117-2.734-.491-.0358-.052-.069-.1057-.0994-.161Z" />
      <path d="M32.4431 90.7801c-.3628-.6207-.0959-1.409.5883-1.7282l30.3399-14.1616c.7125-.3327 1.561-.0273 1.8977.6831.3367.7104.0327 1.5613-.6798 1.894l-30.34 14.1616c-.7124.3326-1.5609.0273-1.8976-.6831-.0326-.0687-.0599-.1396-.0818-.2132-.0057-.019-.011-.0381-.0158-.0574Z" />
      <path d="M42.0827 93.402c-.1652-.5006.0993-1.0424.5898-1.2147l23.4313-8.2326c.5116-.1797 1.0727.0908 1.2547.6039.182.513-.0892 1.0756-.6009 1.2553L43.326 93.9874c-.5117.1797-1.0727-.0908-1.2548-.6039-.0029-.0041-.0032-.0081-.0046-.0122l.0161.0307Z" />
    </svg>
  );
}

// ── Main component ──

export function LinearTool({ toolName, input, result }: LinearToolProps): React.JSX.Element {
  const action = getAction(toolName);
  const parsed = useMemo(() => parseLinearResult(result), [result]);
  const summary = getInputSummary(input);

  const itemCount = parsed?.kind === 'issues' ? parsed.issues.length
    : parsed?.kind === 'projects' ? parsed.projects.length
    : 0;

  const [isExpanded, setIsExpanded] = useState(() => {
    if (!parsed) return false;
    if (parsed.kind === 'mutation') return true;
    if (itemCount > 0 && itemCount <= 10) return true;
    return false;
  });

  // Fall back to raw JSON if we can't parse the result
  if (!parsed) {
    let display = result;
    try { display = JSON.stringify(JSON.parse(result), null, 2); } catch { /* keep raw */ }
    return (
      <CollapsibleToolCard
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
        cardClassName={accent.indigo.card}
        headerContent={(
          <>
            <div className="flex items-center gap-2 flex-shrink-0">
              <LinearIcon size={14} className={accent.indigo.icon} />
              <span className={`text-xs ${tk.text.muted}`}>{action}</span>
            </div>
            <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{summary}</span>
          </>
        )}
        content={(
          <div className={`border-t ${tk.separator}`}>
            <pre className={cn(
              'm-0 px-3 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-auto',
              tk.codeBg, tk.text.primary, tk.scrollbar,
            )}>
              {display}
            </pre>
          </div>
        )}
      />
    );
  }

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName={accent.indigo.card}
      headerContent={(
        <>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LinearIcon size={14} className={accent.indigo.icon} />
            <span className={`text-xs ${tk.text.muted}`}>{action}</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{summary}</span>
          {itemCount > 0 && (
            <span className={`text-[13px] ${tk.text.faint} flex-shrink-0`}>{itemCount}</span>
          )}
        </>
      )}
      content={(
        <div className={`border-t ${tk.separator}`}>
          {parsed.kind === 'issues' && (
            <div className={`divide-y ${tk.separator} max-h-80 overflow-y-auto ${tk.scrollbar}`}>
              {parsed.issues.map((issue, i) => <IssueRow key={issue.identifier || i} issue={issue} />)}
            </div>
          )}
          {parsed.kind === 'mutation' && <MutationResult success={parsed.success} issue={parsed.issue} />}
          {parsed.kind === 'projects' && (
            <div className={`divide-y ${tk.separator} max-h-80 overflow-y-auto ${tk.scrollbar}`}>
              {parsed.projects.map((project, i) => <ProjectRow key={project.name || i} project={project} />)}
            </div>
          )}
          {parsed.kind === 'project' && <ProjectRow project={parsed.project} />}
        </div>
      )}
    />
  );
}
