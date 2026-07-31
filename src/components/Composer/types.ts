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
      model?: string;
      effort?: string;
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
  scheduledWakeup?: { reason: string; expectedAt: number; delaySecs: number };
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
  /** Model id currently serving the session (from the latest assistant message). */
  sessionModel?: string | null;
  /** True when the serving model differs from the session's configured model
   *  (provider capacity fallback, e.g. Fable → Opus). */
  sessionModelFallback?: boolean;
  /** Models the user may pick from. When non-empty and onModelChange is
   *  provided, the model badge becomes an interactive selector. */
  availableModels?: Array<{ id: string; label: string; description?: string; isDefault?: boolean }>;
  /** The model id the user has chosen; null/undefined means "server default". */
  selectedModel?: string | null;
  /** Called when the user picks a model; null means "revert to default". */
  onModelChange?: (modelId: string | null) => void;
  /** Reasoning-effort levels the user may pick from (a second selectable
   *  dimension for providers that expose it). When non-empty and onModelChange
   *  is provided, the menu renders a second "Reasoning" radio section. */
  availableEfforts?: Array<{ id: string; label: string; description?: string; isDefault?: boolean }>;
  /** The effort id the user has chosen; null/undefined means "default". */
  selectedEffort?: string | null;
  /** Called when the user picks an effort; null means "revert to default". */
  onEffortChange?: (effortId: string | null) => void;
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
  /**
   * Render prop for extra status-bar content, placed immediately after the
   * model badge and before the token-usage badge.
   *
   * Host apps use this to surface their own compact session state next to the
   * model. Nothing is rendered when the prop is absent, so consumers that do
   * not pass it are unaffected.
   */
  renderStatusExtra?: () => React.ReactNode;
}

export interface ComposerRef {
  focusInput: () => void;
}
