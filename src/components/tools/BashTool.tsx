import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { codeToHtml } from 'shiki';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { useToolkitTheme } from '../../context.js';
import { tk } from '../../tokens.js';
import type { BackgroundTaskOutput } from '../../types.js';

function ShellHighlight({ code }: { code: string }): React.JSX.Element {
  const theme = useToolkitTheme();
  const shikiTheme = theme === 'dark' ? 'github-dark-default' : 'github-light-default';
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    codeToHtml(code, { lang: 'shellscript', theme: shikiTheme })
      .then(setHtml).catch(() => setHtml(null));
  }, [code, shikiTheme]);

  if (!html) {
    return (
      <pre className={`m-0 font-mono text-[10px] whitespace-pre-wrap break-all leading-relaxed ${tk.text.primary}`}>
        {code}
      </pre>
    );
  }

  return (
    <div
      className="[&_pre]:!bg-transparent [&_pre]:m-0 [&_pre]:text-[10px] [&_pre]:leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:!bg-transparent"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface BashToolProps {
  input: { command?: string; description?: string; run_in_background?: boolean };
  result: string;
  workingDirectory?: string;
  isPending?: boolean;
  /** Optional: provide a function to fetch background task output. Without this, background output display is disabled. */
  fetchBackgroundOutput?: (path: string) => Promise<BackgroundTaskOutput | null>;
}

const BG_OUTPUT_PATTERN = /Output is being written to:\s*(\S+)/;
const POLL_INTERVAL_MS = 2000;
const MAX_DISPLAY_CHARS = 100_000;

export function parseBackgroundOutputPath(result: string): string | null {
  const match = result.match(BG_OUTPUT_PATTERN);
  return match ? match[1] : null;
}

export function summarizeCommand(command: string, maxLen: number = 80): string {
  let cmd = command.trim();
  const shellWrapperMatch = cmd.match(/^(?:bash|sh|zsh)\s+-c\s+['"](.+)['"]$/s);
  if (shellWrapperMatch) cmd = shellWrapperMatch[1];
  if (cmd.includes('\n')) {
    const firstLine = cmd.split('\n').find(l => l.trim() && !l.trim().startsWith('#')) || cmd.split('\n')[0];
    cmd = firstLine.trim();
    if (cmd.length <= maxLen) cmd += ' …';
  }
  return cmd.length > maxLen ? cmd.slice(0, maxLen) + '…' : cmd;
}

interface TaskOutputState {
  content: string;
  size: number;
  truncated: boolean;
  done: boolean;
}

function useBackgroundTaskOutput(
  outputPath: string | null,
  isExpanded: boolean,
  fetcher?: (path: string) => Promise<BackgroundTaskOutput | null>,
): TaskOutputState {
  const [state, setState] = useState<TaskOutputState>({ content: '', size: 0, truncated: false, done: false });
  const lastSizeRef = useRef(0);
  const stableSinceRef = useRef(0);

  const poll = useCallback(async () => {
    if (!outputPath || !fetcher) return;
    try {
      const data = await fetcher(outputPath);
      if (!data) return;
      if (data.size === lastSizeRef.current && data.size > 0) stableSinceRef.current++;
      else stableSinceRef.current = 0;
      lastSizeRef.current = data.size;
      const done = stableSinceRef.current >= 3;
      let content = data.content;
      let truncated = data.truncated;
      if (content.length > MAX_DISPLAY_CHARS) { content = content.slice(-MAX_DISPLAY_CHARS); truncated = true; }
      setState({ content, size: data.size, truncated, done });
    } catch { /* network error */ }
  }, [outputPath, fetcher]);

  useEffect(() => {
    if (!outputPath || !fetcher || !isExpanded || state.done) return;
    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [outputPath, fetcher, isExpanded, state.done, poll]);

  return state;
}

function countOutputLines(text: string): number {
  if (!text) return 0;
  return text.split('\n').filter(line => line.trim()).length;
}

const AUTO_EXPAND_THRESHOLD = 5;

export function BashTool({ input, result, isPending = false, fetchBackgroundOutput }: BashToolProps): React.JSX.Element {
  const resultLines = countOutputLines(result);
  const [isExpanded, setIsExpanded] = useState(() => !isPending && resultLines > 0 && resultLines <= AUTO_EXPAND_THRESHOLD);

  const command = input?.command || '';
  const description = input?.description || '';
  const bgOutputPath = useMemo(() => parseBackgroundOutputPath(result), [result]);
  const taskOutput = useBackgroundTaskOutput(bgOutputPath, isExpanded, fetchBackgroundOutput);

  const displayOutput = bgOutputPath && taskOutput.content ? taskOutput.content : result;
  const displayCommand = useMemo(() => summarizeCommand(command), [command]);
  const isBackgroundRunning = bgOutputPath && !taskOutput.done;

  const outputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (outputRef.current && isExpanded && bgOutputPath) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [taskOutput.content, isExpanded, bgOutputPath]);

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName="border-orange-500/20 bg-orange-500/5"
      headerContent={(
        <>
          <div className="flex items-center gap-2 shrink-0">
            {isBackgroundRunning && <Loader2 size={12} className="text-orange-400/80 animate-spin" />}
            <Terminal size={14} className="text-orange-400/80" />
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>
            {description || displayCommand}
          </span>
        </>
      )}
      content={(
        <>
          {command && (
            <div className={`border-t ${tk.separator} ${tk.codeBg} px-3 py-2.5`}>
              <div className="flex gap-2">
                <span className="text-emerald-400/60 font-mono text-[10px] select-none shrink-0 leading-relaxed">$</span>
                <ShellHighlight code={command} />
              </div>
            </div>
          )}
          {bgOutputPath && taskOutput.content && (
            <div className={`border-t ${tk.separator} ${tk.codeBg} px-3 py-2.5 max-h-96 overflow-auto`} ref={outputRef}>
              {taskOutput.truncated && (
                <div className={`text-[10px] ${tk.text.faint} mb-1`}>
                  … showing last {(MAX_DISPLAY_CHARS / 1000).toFixed(0)}K chars
                </div>
              )}
              <ShellHighlight code={taskOutput.content} />
            </div>
          )}
          {bgOutputPath && !taskOutput.content && (
            <div className={`border-t ${tk.separator} px-3 py-2 text-[10px] ${tk.text.muted} ${tk.codeBgSubtle} flex items-center gap-2`}>
              <Loader2 size={12} className="animate-spin" />
              <span>Waiting for output…</span>
            </div>
          )}
          {!bgOutputPath && result && (
            <div className={`border-t ${tk.separator} ${tk.codeBg} px-3 py-2.5`}>
              <ShellHighlight code={result} />
            </div>
          )}
          {!bgOutputPath && !result && isPending && (
            <div className={`border-t ${tk.separator} px-3 py-2 text-[10px] ${tk.text.muted} ${tk.codeBgSubtle}`}>
              Waiting for stdout...
            </div>
          )}
        </>
      )}
    />
  );
}
