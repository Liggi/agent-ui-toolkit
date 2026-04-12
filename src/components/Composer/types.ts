import type { AttachmentBlock } from '../../hooks/useAttachments.js';

export interface FileSystemEntry {
  name: string;
  type: 'file' | 'directory';
  depth?: number;
}

export interface Command {
  name: string;
  type: 'builtin' | 'custom';
  description?: string;
  argumentHint?: string;
}

export interface ComposerCoreConfig {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit: (
    message: string,
    options?: {
      workingDirectory?: string;
      attachments?: AttachmentBlock[];
    },
  ) => void | Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  sessionId?: string;
}

export interface ComposerFeatureConfig {
  enableAttachments?: boolean;
  enableFileAutocomplete?: boolean;
  showStatusBar?: boolean;
  /** When true, shows the menu toggle button and renders menuSlot when open. */
  showMenu?: boolean;
}

export interface ComposerRuntimeConfig {
  isSessionActive?: boolean;
  isSessionConnected?: boolean;
  isStopRequested?: boolean;
  isInitializing?: boolean;
  hasBackgroundTasks?: boolean;
  sessionStartTime?: number;
  fileSystemEntries?: FileSystemEntry[];
  onFetchFileSystem?: (directory: string) => Promise<FileSystemEntry[]>;
  availableCommands?: Command[];
  onFetchCommands?: (workingDirectory?: string) => Promise<Command[]>;
  queuedMessages?: Array<{
    id: string;
    content: string;
    timestamp: string;
    status?: 'pending' | 'dispatching';
  }>;
  sessionUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    contextTokens?: number;
  } | null;
}

export interface ComposerProps {
  core?: ComposerCoreConfig;
  features?: ComposerFeatureConfig;
  workingDirectory?: string;
  permissionConfig?: {
    onStop?: () => void | Promise<void>;
    onInterrupt?: () => void | Promise<void>;
  };
  runtimeConfig?: ComposerRuntimeConfig;
  /** Extra class names applied to the root wrapper. */
  className?: string;
  /**
   * Render prop for the menu area below the input.
   * Called when showMenu is enabled and the menu is open.
   * Return your menu UI; use onClose to dismiss.
   */
  renderMenu?: (props: { onClose: () => void }) => React.ReactNode;
}

export interface ComposerRef {
  focusInput: () => void;
}
