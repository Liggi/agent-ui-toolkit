import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { countLines, formatFilePath } from '../../utils/tool-utils.js';
import { detectLanguageFromPath } from '../../utils/language-detection.js';
import { LazyCodeHighlight } from '../shared/LazyCodeHighlight.js';
import { CollapsibleToolCard } from '../CollapsibleToolCard.js';
import { tk, accent } from '../../tokens.js';

interface ReadToolProps {
  input: { file_path?: string; offset?: number; limit?: number };
  result: string;
  workingDirectory?: string;
}

function cleanFileContent(content: string): string {
  let cleaned = content.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');
  cleaned = cleaned.replace(/^\s*\d+→/gm, '');
  return cleaned.trimEnd();
}

const AUTO_EXPAND_THRESHOLD = 5;

export function ReadTool({ input, result, workingDirectory }: ReadToolProps): React.JSX.Element {
  const cleanedContent = result ? cleanFileContent(result) : '';
  const lineCount = countLines(cleanedContent);
  const [isExpanded, setIsExpanded] = useState(() => lineCount > 0 && lineCount <= AUTO_EXPAND_THRESHOLD);

  if (!result) return <div />;

  const filePath = input?.file_path || '';
  const displayPath = formatFilePath(filePath, workingDirectory);
  const language = detectLanguageFromPath(filePath);

  return (
    <CollapsibleToolCard
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      cardClassName={accent.blue.card}
      headerContent={(
        <>
          <div className="flex items-center gap-2">
            <FileText size={14} className={`${accent.blue.icon} flex-shrink-0`} />
            <span className={`text-xs ${tk.text.muted}`}>Read</span>
          </div>
          <span className={`text-xs ${tk.text.secondary} truncate flex-1`}>
            {displayPath}
          </span>
        </>
      )}
      content={cleanedContent ? (
        <div className={`border-t ${tk.separator}`}>
          <LazyCodeHighlight code={cleanedContent} language={language} showLineNumbers className="rounded-none" />
        </div>
      ) : undefined}
    />
  );
}
