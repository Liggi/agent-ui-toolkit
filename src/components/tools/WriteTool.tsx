import React, { useState } from 'react';
import { FilePlus } from 'lucide-react';
import { detectLanguageFromPath } from '../../utils/language-detection.js';
import { formatFilePath, countLines } from '../../utils/tool-utils.js';
import { LazyCodeHighlight } from '../shared/LazyCodeHighlight.js';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { tk } from '../../tokens.js';

interface WriteToolProps {
  input: { file_path?: string; content?: string };
  result: string;
  workingDirectory?: string;
}

const AUTO_EXPAND_THRESHOLD = 5;

export function WriteTool({ input, workingDirectory }: WriteToolProps): React.JSX.Element {
  const filePath = input?.file_path || '';
  const content = input?.content || '';
  const lineCount = countLines(content);
  const [isExpanded, setIsExpanded] = useState(() => lineCount > 0 && lineCount <= AUTO_EXPAND_THRESHOLD);
  const displayPath = formatFilePath(filePath, workingDirectory);
  const language = detectLanguageFromPath(filePath);

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName="border-violet-500/20 bg-violet-500/5"
      headerContent={(
        <>
          <div className="flex items-center gap-2">
            <FilePlus size={14} className="text-violet-400/80 flex-shrink-0" />
            <span className={`text-xs ${tk.text.muted}`}>Write</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>{displayPath}</span>
        </>
      )}
      content={content ? (
        <div className={`border-t ${tk.separator}`}>
          <LazyCodeHighlight code={content} language={language} showLineNumbers className="rounded-none" />
        </div>
      ) : undefined}
    />
  );
}
