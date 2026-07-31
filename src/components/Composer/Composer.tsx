import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Send, Loader2, Square, X, FileText, ChevronUp, ChevronDown, Paperclip, Image, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip.js';
import { cn } from '../../utils/cn.js';
import { storage } from '../../utils/storage.js';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { useAttachments } from '../../hooks/useAttachments.js';
import { AutocompleteDropdown } from './AutocompleteDropdown.js';
import type { ComposerProps, ComposerRef, FileSystemEntry, Command } from './types.js';

interface AutocompleteState {
  isActive: boolean;
  triggerIndex: number;
  query: string;
  suggestions: FileSystemEntry[] | Command[];
  focusedIndex: number;
  type: 'file' | 'command';
}

// Per-session draft storage key
const getDraftStorageKey = (sessionId?: string) =>
  sessionId ? `composer-draft-${sessionId}` : 'composer-draft-home';

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return `${tokens}`;
}

function formatModelName(model: string): string {
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '');
}

// Textarea auto-grow cap: 3 rows of text.
// text-sm (14px) x leading-relaxed (1.625) = 22.75px per row; py-2 adds 16px of
// vertical padding. 3 x 22.75 + 16 = 84.25 -> 85 avoids sub-pixel clipping of row 3.
// Single source of truth: used by the JS clamp AND applied inline as max-height,
// so there is no Tailwind max-h class to drift out of sync.
const TEXTAREA_MAX_HEIGHT_PX = 85;

/*
 * Touch targets.
 *
 * The composer's icon buttons are deliberately 32px so the bar stays dense, but
 * 32px is below the 44x44 minimum in Apple's HIG and WCAG 2.5.5. These classes
 * keep the 32px visual box and grow only the *tappable* area, using a centred
 * absolutely-positioned pseudo-element. Because it is out of flow, nothing
 * reflows — the button occupies exactly the same space it did before.
 *
 * `w-full` + `min-w-11` means "at least 44px wide, but never narrower than the
 * button itself", so it also fits the wider Stop button in its "Stopping" state.
 */
const TOUCH_TARGET_44 =
  "relative before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-full before:min-w-11 " +
  "before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

/*
 * Smaller variant for the attachment chip's remove button. The chip is only
 * ~26px tall, so a 44px target would spill past the chip strip and turn taps on
 * the textarea below it into "remove attachment" — a destructive misfire. 32x32
 * quadruples the tappable area while staying inside the strip.
 */
const TOUCH_TARGET_32 =
  "relative before:absolute before:top-1/2 before:left-1/2 before:h-8 before:w-8 " +
  "before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

const ACCEPTED_FILE_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,text/html,text/css,text/javascript,application/json,application/xml,text/xml,.json,.md,.txt,.csv,.html,.css,.js,.ts,.yaml,.yml';

export const Composer = forwardRef<ComposerRef, ComposerProps>(function Composer(
  props: ComposerProps,
  ref: React.Ref<ComposerRef>,
) {
  const onSubmit = props.core?.onSubmit ?? (() => {});
  const controlledValue = props.core?.value;
  const onControlledChange = props.core?.onChange;
  const placeholder = props.core?.placeholder ?? 'Type a message...';
  const disabled = props.core?.disabled ?? false;
  const sessionId = props.core?.sessionId;

  const enableAttachments = props.features?.enableAttachments ?? true;
  const enableFileAutocomplete = props.features?.enableFileAutocomplete ?? false;
  const showStatusBar = props.features?.showStatusBar ?? true;
  const showMenu = props.features?.showMenu ?? false;

  const workingDirectory = props.workingDirectory ?? '';
  const onStop = props.permissionConfig?.onStop;
  const onInterrupt = props.permissionConfig?.onInterrupt;
  const renderStatusExtra = props.renderStatusExtra;

  const isSessionActive = props.runtimeConfig?.isSessionActive ?? false;
  const isSessionConnected = props.runtimeConfig?.isSessionConnected ?? isSessionActive;
  const isStopRequested = props.runtimeConfig?.isStopRequested ?? false;
  const isInitializing = props.runtimeConfig?.isInitializing ?? false;
  const hasBackgroundTasks = props.runtimeConfig?.hasBackgroundTasks ?? false;
  const sessionStartTime = props.runtimeConfig?.sessionStartTime;
  const fileSystemEntries = props.runtimeConfig?.fileSystemEntries ?? [];
  const onFetchFileSystem = props.runtimeConfig?.onFetchFileSystem;
  const availableCommands = props.runtimeConfig?.availableCommands ?? [];
  const onFetchCommands = props.runtimeConfig?.onFetchCommands;
  const queuedMessages = props.runtimeConfig?.queuedMessages ?? [];
  const sessionUsage = props.runtimeConfig?.sessionUsage ?? null;
  const sessionModel = props.runtimeConfig?.sessionModel ?? null;
  const sessionModelFallback = props.runtimeConfig?.sessionModelFallback ?? false;
  const availableModels = props.runtimeConfig?.availableModels ?? [];
  const selectedModel = props.runtimeConfig?.selectedModel ?? null;
  const onModelChange = props.runtimeConfig?.onModelChange;
  const isModelSelectorEnabled = availableModels.length > 0 && !!onModelChange;
  const defaultModel = availableModels.find((m) => m.isDefault);
  const effectiveModel = selectedModel
    ? availableModels.find((m) => m.id === selectedModel)
    : defaultModel;

  const availableEfforts = props.runtimeConfig?.availableEfforts ?? [];
  const selectedEffort = props.runtimeConfig?.selectedEffort ?? null;
  const onEffortChange = props.runtimeConfig?.onEffortChange;
  const effortProvided = availableEfforts.length > 0;
  const isEffortSelectorEnabled = effortProvided && isModelSelectorEnabled;
  const defaultEffort = availableEfforts.find((e) => e.isDefault);
  const effectiveEffort = selectedEffort
    ? availableEfforts.find((e) => e.id === selectedEffort)
    : defaultEffort;
  // Show the effort label on the badge only when a non-default effort is active.
  const badgeEffortLabel =
    isEffortSelectorEnabled && effectiveEffort && !effectiveEffort.isDefault
      ? effectiveEffort.label
      : null;

  // ── Status derivation ──

  const currentStatus = isInitializing
    ? 'Starting'
    : isStopRequested
      ? 'Stopping'
      : isSessionActive
        ? 'Working'
        : hasBackgroundTasks && isSessionConnected
          ? 'Waiting for background task'
          : isSessionConnected
            ? 'Ready'
            : 'Off';

  const prevStatusRef = useRef(currentStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = currentStatus;
    if (prev === currentStatus) return;
    if (prev === 'Ready' && currentStatus === 'Starting') {
      console.error(
        `[Composer] ILLEGAL STATUS TRANSITION: ${prev} → ${currentStatus}. ` +
          `Ready means the process is alive, Starting means starting a new one.\n` +
          `  isSessionActive=${isSessionActive}, isSessionConnected=${isSessionConnected}, ` +
          `isInitializing=${isInitializing}, isStopRequested=${isStopRequested}`,
      );
    }
  }, [currentStatus, isSessionActive, isSessionConnected, isInitializing, isStopRequested]);

  // ── Attachments ──

  const {
    attachments,
    addFiles,
    removeAttachment,
    clearAll: clearAttachments,
    getContentBlocks,
    isProcessing: isProcessingAttachments,
    hasAttachments,
    error: attachmentError,
  } = useAttachments();

  // ── Draft persistence ──

  const draftStorageKey = getDraftStorageKey(sessionId);
  const [storedDraft, setStoredDraft] = useLocalStorage<string>(draftStorageKey, '');

  const [uncontrolledValue, setUncontrolledValue] = useState(storedDraft);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = (newValue: string) => {
    if (controlledValue === undefined) setUncontrolledValue(newValue);
    onControlledChange?.(newValue);
  };

  useEffect(() => {
    if (controlledValue === undefined) setStoredDraft(uncontrolledValue);
  }, [uncontrolledValue, setStoredDraft, controlledValue]);

  useEffect(() => {
    if (controlledValue === undefined) setUncontrolledValue(storedDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStorageKey]);

  // ── Local state ──

  const [localFileSystemEntries, setLocalFileSystemEntries] = useState<FileSystemEntry[]>([]);
  const [localCommands, setLocalCommands] = useState<Command[]>([]);
  const effectiveFileSystemEntries =
    localFileSystemEntries.length > 0 ? localFileSystemEntries : fileSystemEntries;
  const effectiveCommands = localCommands.length > 0 ? localCommands : availableCommands;

  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({
    isActive: false,
    triggerIndex: -1,
    query: '',
    suggestions: [],
    focusedIndex: -1,
    type: 'file',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileSystemFetchInFlightRef = useRef<Promise<FileSystemEntry[]> | null>(null);
  const commandsFetchInFlightRef = useRef<Promise<Command[]> | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuListRef = useRef<HTMLDivElement>(null);
  const modelTriggerRef = useRef<HTMLButtonElement>(null);
  const [modelMenuFocusIndex, setModelMenuFocusIndex] = useState(-1);

  // ── Elapsed time ──

  const [elapsedTime, setElapsedTime] = useState<string>('0:00');
  const [hasSessionStartTime, setHasSessionStartTime] = useState(false);

  useEffect(() => {
    setLocalFileSystemEntries([]);
    setLocalCommands([]);
    fileSystemFetchInFlightRef.current = null;
    commandsFetchInFlightRef.current = null;
  }, [workingDirectory]);

  const isSessionAlive = isSessionActive || isSessionConnected;
  useEffect(() => {
    if (!isSessionAlive) {
      setElapsedTime('0:00');
      setHasSessionStartTime(false);
      return;
    }
    if (!sessionStartTime) {
      setHasSessionStartTime(false);
      return;
    }

    setHasSessionStartTime(true);
    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isSessionAlive, sessionStartTime]);

  // ── Model selector dismissal ──

  const closeModelMenu = useCallback((returnFocus: boolean) => {
    setIsModelMenuOpen(false);
    setModelMenuFocusIndex(-1);
    if (returnFocus) modelTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isModelMenuOpen) return;
    const handlePointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        modelMenuRef.current?.contains(target) ||
        modelMenuListRef.current?.contains(target)
      ) {
        return;
      }
      closeModelMenu(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [isModelMenuOpen, closeModelMenu]);

  // Flat list of every selectable row across both sections, so roving focus and
  // keyboard nav span "Model" + "Reasoning" as one list. Effort rows are only
  // present when the effort props are provided.
  const menuRows: Array<
    | { kind: 'model'; id: string; isDefault?: boolean }
    | { kind: 'effort'; id: string; isDefault?: boolean }
  > = [
    ...availableModels.map((m) => ({ kind: 'model' as const, id: m.id, isDefault: m.isDefault })),
    ...(isEffortSelectorEnabled
      ? availableEfforts.map((eff) => ({ kind: 'effort' as const, id: eff.id, isDefault: eff.isDefault }))
      : []),
  ];

  // Activate a row: choosing a model closes the menu (returning focus to the
  // trigger); choosing an effort keeps the menu open (users often set both).
  const activateMenuRow = useCallback(
    (row: { kind: 'model' | 'effort'; id: string; isDefault?: boolean }) => {
      if (row.kind === 'model') {
        onModelChange?.(row.isDefault ? null : row.id);
        closeModelMenu(true);
      } else {
        onEffortChange?.(row.isDefault ? null : row.id);
      }
    },
    [onModelChange, onEffortChange, closeModelMenu],
  );

  // Open the menu focused on the effective model's row.
  useEffect(() => {
    if (!isModelMenuOpen) return;
    const idx = availableModels.findIndex((m) => m.id === (effectiveModel?.id ?? null));
    setModelMenuFocusIndex(idx >= 0 ? idx : 0);
  }, [isModelMenuOpen, availableModels, effectiveModel]);

  // Move DOM focus onto the active row as it changes.
  useEffect(() => {
    if (!isModelMenuOpen || modelMenuFocusIndex < 0 || !modelMenuListRef.current) return;
    const items = modelMenuListRef.current.querySelectorAll<HTMLElement>('[data-menu-option]');
    items[modelMenuFocusIndex]?.focus();
  }, [isModelMenuOpen, modelMenuFocusIndex]);

  const handleModelMenuKeyDown = (e: React.KeyboardEvent) => {
    const count = menuRows.length;
    if (count === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setModelMenuFocusIndex((i) => (i < 0 ? 0 : (i + 1) % count));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setModelMenuFocusIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setModelMenuFocusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setModelMenuFocusIndex(count - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (modelMenuFocusIndex >= 0) activateMenuRow(menuRows[modelMenuFocusIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        closeModelMenu(true);
        break;
    }
  };

  // ── Ref ──

  useImperativeHandle(ref, () => ({
    focusInput: () => textareaRef.current?.focus(),
  }));

  // ── Fetch helpers ──

  const fetchFileSystemEntries = useCallback(async (): Promise<FileSystemEntry[]> => {
    if (!enableFileAutocomplete || !onFetchFileSystem) return [];
    if (!workingDirectory || workingDirectory === 'Select directory') return [];
    if (fileSystemFetchInFlightRef.current) return fileSystemFetchInFlightRef.current;

    const request = onFetchFileSystem(workingDirectory)
      .then((entries) => {
        setLocalFileSystemEntries(entries);
        return entries;
      })
      .catch((error) => {
        console.error('Failed to fetch file system entries:', error);
        return [];
      })
      .finally(() => {
        fileSystemFetchInFlightRef.current = null;
      });

    fileSystemFetchInFlightRef.current = request;
    return request;
  }, [enableFileAutocomplete, onFetchFileSystem, workingDirectory]);

  const fetchCommands = useCallback(async (): Promise<Command[]> => {
    if (!onFetchCommands) return [];
    if (commandsFetchInFlightRef.current) return commandsFetchInFlightRef.current;

    const request = onFetchCommands(
      workingDirectory !== 'Select directory' ? workingDirectory : undefined,
    )
      .then((commands) => {
        setLocalCommands(commands);
        return commands;
      })
      .catch((error) => {
        console.error('Failed to fetch commands:', error);
        return [];
      })
      .finally(() => {
        commandsFetchInFlightRef.current = null;
      });

    commandsFetchInFlightRef.current = request;
    return request;
  }, [onFetchCommands, workingDirectory]);

  // Fetch on focus
  useEffect(() => {
    if (!enableFileAutocomplete || !onFetchFileSystem) return;
    const textarea = textareaRef.current;
    if (textarea) {
      const handleFocus = () => void fetchFileSystemEntries();
      textarea.addEventListener('focus', handleFocus);
      return () => textarea.removeEventListener('focus', handleFocus);
    }
  }, [enableFileAutocomplete, onFetchFileSystem, fetchFileSystemEntries]);

  useEffect(() => {
    if (!onFetchCommands) return;
    const textarea = textareaRef.current;
    if (textarea) {
      const handleFocus = () => void fetchCommands();
      textarea.addEventListener('focus', handleFocus);
      return () => textarea.removeEventListener('focus', handleFocus);
    }
  }, [onFetchCommands, fetchCommands]);

  // ── Autocomplete ──

  const detectAutocomplete = (val: string, cursorPosition: number) => {
    const beforeCursor = val.substring(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return null;

    const afterAt = beforeCursor.substring(lastAtIndex + 1);
    if (afterAt.includes(' ') || afterAt.includes('\n')) return null;

    return { triggerIndex: lastAtIndex, query: afterAt, type: 'file' as const };
  };

  const detectSlashCommandAutocomplete = (val: string, cursorPosition: number) => {
    const beforeCursor = val.substring(0, cursorPosition);
    const lastSlashIndex = beforeCursor.lastIndexOf('/');
    if (lastSlashIndex === -1) return null;

    const beforeSlash = beforeCursor.substring(0, lastSlashIndex);
    if (beforeSlash.trim() !== '' && !beforeSlash.endsWith('\n') && !beforeSlash.endsWith(' '))
      return null;

    const afterSlash = beforeCursor.substring(lastSlashIndex + 1);
    if (afterSlash.includes(' ') || afterSlash.includes('\n')) return null;

    return { triggerIndex: lastSlashIndex, query: afterSlash, type: 'command' as const };
  };

  const filterSuggestions = (query: string): FileSystemEntry[] => {
    if (!effectiveFileSystemEntries) return [];
    if (!query) return effectiveFileSystemEntries.slice(0, 50);
    const lowerQuery = query.toLowerCase();
    return effectiveFileSystemEntries
      .filter((entry) => entry.name.toLowerCase().includes(lowerQuery))
      .slice(0, 50);
  };

  const filterCommandSuggestions = (query: string): Command[] => {
    if (!effectiveCommands) return [];
    if (!query) return effectiveCommands.slice(0, 50);
    const lowerQuery = query.toLowerCase();
    return effectiveCommands
      .filter((command) => command.name.toLowerCase().includes(lowerQuery))
      .slice(0, 50);
  };

  const resetAutocomplete = () => {
    setAutocomplete({
      isActive: false,
      triggerIndex: -1,
      query: '',
      suggestions: [],
      focusedIndex: -1,
      type: 'file',
    });
  };

  const handleAutocompleteSelection = (selection: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;

    if (autocomplete.type === 'command') {
      const newText =
        value.substring(0, autocomplete.triggerIndex) +
        selection +
        ' ' +
        value.substring(cursorPos);
      setValue(newText);
      resetAutocomplete();
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = autocomplete.triggerIndex + selection.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 0);
    } else {
      const newText =
        value.substring(0, autocomplete.triggerIndex + 1) +
        selection +
        ' ' +
        value.substring(cursorPos);
      setValue(newText);
      resetAutocomplete();
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = autocomplete.triggerIndex + 1 + selection.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 0);
    }
  };

  // ── Text input ──

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    adjustTextareaHeight();

    const cursorPos = e.target.selectionStart;

    const commandAutocompleteInfo = detectSlashCommandAutocomplete(newValue, cursorPos);
    if (commandAutocompleteInfo && onFetchCommands) {
      if (effectiveCommands.length === 0) void fetchCommands();
      const suggestions = filterCommandSuggestions(commandAutocompleteInfo.query);
      setAutocomplete((prev) => ({
        isActive: true,
        triggerIndex: commandAutocompleteInfo.triggerIndex,
        query: commandAutocompleteInfo.query,
        suggestions,
        type: commandAutocompleteInfo.type,
        focusedIndex:
          prev.focusedIndex >= 0 && prev.focusedIndex < suggestions.length
            ? prev.focusedIndex
            : -1,
      }));
      return;
    }

    if (enableFileAutocomplete) {
      const fileAutocompleteInfo = detectAutocomplete(newValue, cursorPos);
      if (fileAutocompleteInfo) {
        if (effectiveFileSystemEntries.length === 0) void fetchFileSystemEntries();
        const suggestions = filterSuggestions(fileAutocompleteInfo.query);
        setAutocomplete((prev) => ({
          isActive: true,
          triggerIndex: fileAutocompleteInfo.triggerIndex,
          query: fileAutocompleteInfo.query,
          suggestions,
          type: fileAutocompleteInfo.type,
          focusedIndex:
            prev.focusedIndex >= 0 && prev.focusedIndex < suggestions.length
              ? prev.focusedIndex
              : -1,
        }));
        return;
      }
    }

    resetAutocomplete();
  };

  // ── Submit ──

  const handleSubmit = () => {
    const currentValue = textareaRef.current?.value ?? value;
    const trimmedValue = currentValue.trim();
    if (!trimmedValue && !hasAttachments) return;
    if (isProcessingAttachments) return;

    const attachmentBlocks = hasAttachments ? getContentBlocks() : undefined;

    // Save draft backup before clearing
    const backupKey = `${draftStorageKey}-backup`;
    try {
      localStorage.setItem(backupKey, currentValue);
    } catch {
      /* quota exceeded */
    }

    void onSubmit(trimmedValue, {
      workingDirectory: workingDirectory || undefined,
      attachments: attachmentBlocks,
      ...(isModelSelectorEnabled ? { model: selectedModel ?? undefined } : {}),
      ...(effortProvided ? { effort: selectedEffort ?? undefined } : {}),
    });

    setValue('');
    storage.set(draftStorageKey, '');
    clearAttachments();
    resetAutocomplete();
  };

  // ── Keyboard ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (autocomplete.isActive) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (autocomplete.suggestions.length > 0) {
            setAutocomplete((prev) => ({
              ...prev,
              focusedIndex:
                prev.focusedIndex < 0 ? 0 : (prev.focusedIndex + 1) % prev.suggestions.length,
            }));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (autocomplete.suggestions.length > 0) {
            setAutocomplete((prev) => ({
              ...prev,
              focusedIndex:
                prev.focusedIndex < 0
                  ? prev.suggestions.length - 1
                  : prev.focusedIndex === 0
                    ? prev.suggestions.length - 1
                    : prev.focusedIndex - 1,
            }));
          }
          break;
        case 'Enter':
        case 'Tab':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            if (autocomplete.suggestions.length > 0) {
              const targetIndex =
                autocomplete.focusedIndex >= 0 ? autocomplete.focusedIndex : 0;
              const suggestion = autocomplete.suggestions[targetIndex];
              const suggestionName =
                autocomplete.type === 'command'
                  ? (suggestion as Command).name
                  : (suggestion as FileSystemEntry).name;
              handleAutocompleteSelection(suggestionName);
            }
          }
          break;
        case ' ':
          resetAutocomplete();
          break;
        case 'Escape':
          e.preventDefault();
          resetAutocomplete();
          setTimeout(() => textareaRef.current?.focus(), 0);
          break;
      }
    } else if (e.key === 'Enter') {
      if (e.shiftKey) return; // Allow newline
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'c' && e.ctrlKey && (isSessionActive || isSessionConnected)) {
      e.preventDefault();
      void onInterrupt?.();
    }
  };

  // ── Textarea auto-resize ──

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    }
  };

  useEffect(() => adjustTextareaHeight(), [value]);
  useEffect(() => {
    const handleResize = () => adjustTextareaHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── File attachment handlers ──

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!enableAttachments) return;
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableAttachments) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!enableAttachments) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableAttachments) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  // ── Status color class ──
  // Uses the composer-* CSS custom properties so consumers can re-theme.

  // Light mode uses bolder opacities so colors read on light surfaces;
  // dark: variants restore the subtler values that work on dark backgrounds.
  const statusColorClasses = isInitializing || isStopRequested
    ? { border: 'border-composer-caution dark:border-composer-caution/60', bg: 'bg-composer-caution/30 dark:bg-composer-caution/10', borderInner: 'border-composer-caution/60 dark:border-composer-caution/25', text: 'text-composer-caution', textDim: 'text-composer-caution dark:text-composer-caution/70' }
    : isSessionActive
      ? { border: 'border-composer-active dark:border-composer-active/60', bg: 'bg-composer-active/30 dark:bg-composer-active/10', borderInner: 'border-composer-active/60 dark:border-composer-active/25', text: 'text-composer-active', textDim: 'text-composer-active dark:text-composer-active/70' }
      : isSessionConnected
          ? { border: 'border-composer-ready dark:border-composer-ready/40', bg: 'bg-composer-ready/25 dark:bg-composer-ready/5', borderInner: 'border-composer-ready/50 dark:border-composer-ready/15', text: 'text-composer-ready', textDim: 'text-composer-ready dark:text-composer-ready/60' }
          : { border: 'border-composer-border', bg: 'bg-composer-muted/15 dark:bg-composer-muted/5', borderInner: 'border-composer-border/50', text: 'text-composer-muted', textDim: 'text-composer-muted/70 dark:text-composer-muted/40' };

  // ── Render ──

  return (
    <TooltipProvider>
      <div ref={composerRef} className={cn('w-full relative', props.className)}>
        {/* Hidden file input */}
        {enableAttachments && (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={handleFileInputChange}
          />
        )}

        {/* Main container */}
        <div
          data-composer-status={
            isInitializing ? 'starting'
            : isStopRequested ? 'stopping'
            : isSessionActive ? 'active'
            : isSessionConnected ? 'ready'
            : 'off'
          }
          className={cn(
            'relative rounded-md overflow-hidden border bg-composer-surface/85 backdrop-blur-sm transition-all duration-200',
            showStatusBar ? statusColorClasses.border : 'border-composer-border/70',
          )}
        >
          {/* Status Bar */}
          {showStatusBar && (
            <div
              className={cn(
                'relative flex min-h-[36px] sm:min-h-[44px] items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 border-b',
                statusColorClasses.bg,
                statusColorClasses.borderInner,
              )}
            >
              {/* Left: status indicator */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isInitializing ? (
                  <>
                    <Loader2 size={12} className={cn('animate-spin', statusColorClasses.text)} />
                    <span
                      className={cn(
                        'text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider',
                        statusColorClasses.text,
                      )}
                    >
                      Starting
                    </span>
                  </>
                ) : isStopRequested ? (
                  <>
                    <Loader2 size={12} className={cn('animate-spin', statusColorClasses.text)} />
                    <span
                      className={cn(
                        'text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider',
                        statusColorClasses.text,
                      )}
                    >
                      Stopping
                    </span>
                  </>
                ) : isSessionActive ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span
                        className={cn(
                          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                          'bg-composer-active',
                        )}
                      />
                      <span
                        className={cn(
                          'relative inline-flex rounded-full h-2 w-2',
                          'bg-composer-active',
                        )}
                      />
                    </span>
                    <span
                      className={cn(
                        'text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider',
                        statusColorClasses.text,
                      )}
                    >
                      Working
                    </span>
                    {hasSessionStartTime && (
                      <span
                        className={cn(
                          'text-[8px] sm:text-[10px] font-mono tabular-nums',
                          statusColorClasses.textDim,
                        )}
                      >
                        {elapsedTime}
                      </span>
                    )}
                  </>
                ) : hasBackgroundTasks && isSessionConnected ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-composer-caution opacity-50" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-composer-caution/70" />
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-composer-caution/70">
                      Waiting for background task
                    </span>
                  </>
                ) : isSessionConnected ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-composer-ready dark:bg-composer-ready/50" />
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-composer-ready dark:text-composer-ready/60">
                      Ready
                    </span>
                  </>
                ) : (
                  <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-composer-text-faint">
                    Idle
                  </span>
                )}
              </div>

              {/* Right: model + token usage + queued messages */}
              <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
                {isModelSelectorEnabled ? (
                  <div className="relative" ref={modelMenuRef} data-testid="model-selector">
                    <button
                      ref={modelTriggerRef}
                      type="button"
                      onClick={() => (isModelMenuOpen ? closeModelMenu(false) : setIsModelMenuOpen(true))}
                      className={cn(
                        'composer-model-badge flex items-center rounded-sm border p-0.5 transition-colors cursor-pointer',
                        sessionModelFallback
                          ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'
                          : 'border-composer-border/50 bg-composer-surface-elevated/50 hover:border-composer-border hover:bg-composer-surface-elevated hover:text-composer-text',
                      )}
                      data-testid="session-model"
                      aria-haspopup="menu"
                      aria-expanded={isModelMenuOpen}
                      title={sessionModelFallback && sessionModel ? `Select model. Serving model differs from the session's configured model (${sessionModel})` : 'Select model'}
                    >
                      <span
                        className={cn(
                          'pl-1.5 sm:pl-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
                          sessionModelFallback ? 'text-amber-500 dark:text-amber-400' : 'text-composer-muted',
                        )}
                        data-model={selectedModel ?? undefined}
                        data-effort={selectedEffort ?? undefined}
                      >
                        {effectiveModel?.label ?? (sessionModel ? formatModelName(sessionModel) : 'Model')}
                        {badgeEffortLabel && (
                          <span className="text-composer-muted"> · {badgeEffortLabel}</span>
                        )}
                        {!selectedModel && defaultModel && (
                          <span className="ml-1 text-composer-text-faint normal-case font-normal">default</span>
                        )}
                      </span>
                      <ChevronDown
                        size={10}
                        className={cn(
                          'mr-1 text-composer-muted transition-transform',
                          isModelMenuOpen && 'rotate-180',
                        )}
                      />
                    </button>
                  </div>
                ) : sessionModel ? (
                  <div
                    className={cn(
                      'flex items-center rounded-sm border p-0.5',
                      sessionModelFallback
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-composer-border/50 bg-composer-surface-elevated/50',
                    )}
                    data-testid="session-model"
                    title={sessionModelFallback ? `Serving model differs from the session's configured model (${sessionModel})` : sessionModel}
                  >
                    <span
                      className={cn(
                        'px-1.5 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
                        sessionModelFallback ? 'text-amber-500 dark:text-amber-400' : 'text-composer-muted',
                      )}
                      data-model={sessionModel}
                    >
                      {formatModelName(sessionModel)}
                    </span>
                  </div>
                ) : null}
                {/* Host-app status content, adjacent to the model badge. */}
                {renderStatusExtra?.()}
                {sessionUsage && (() => {
                  const tokens = sessionUsage.contextTokens ?? (sessionUsage.inputTokens + sessionUsage.cacheCreationInputTokens + sessionUsage.cacheReadInputTokens);
                  const tokenColor = tokens >= 500_000 ? 'text-red-500 dark:text-red-400' : tokens >= 200_000 ? 'text-amber-500 dark:text-amber-400' : isSessionActive ? 'text-composer-active' : isSessionConnected ? 'text-composer-ready' : 'text-composer-muted';
                  return (
                    <div className="flex items-center rounded-sm border border-composer-border/50 bg-composer-surface-elevated/50 p-0.5" data-testid="token-usage">
                      <span
                        className={cn(
                          'px-1.5 sm:px-3 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
                          tokenColor,
                        )}
                        data-tokens={tokens}
                      >
                        {formatTokenCount(tokens)} tokens
                      </span>
                    </div>
                  );
                })()}
                {queuedMessages.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setQueueDialogOpen(true)}
                        className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-sm border border-composer-caution/35 bg-composer-caution/10 text-composer-caution text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider hover:border-composer-caution/60 hover:bg-composer-caution/20 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Queue {queuedMessages.length}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Per-session message queue. These auto-send in order when the current run finishes.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          )}

          {/* Input area with drag-drop */}
          <div
            className={cn(
              'flex flex-col items-center justify-center w-full bg-transparent cursor-text relative',
              isDragOver && 'ring-2 ring-composer-active/50 ring-inset bg-composer-active/5',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-composer-active/10 z-10 pointer-events-none">
                <div className="flex items-center gap-2 text-composer-active font-medium">
                  <Paperclip size={20} />
                  <span>Drop files to attach</span>
                </div>
              </div>
            )}

            {/* Attachment preview strip */}
            {hasAttachments && (
              <div className="flex gap-2 px-3 py-2 w-full border-b border-composer-border/50 overflow-x-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-composer-surface-elevated/50 border border-composer-border/50"
                  >
                    {att.type === 'image' ? (
                      <Image size={14} className="text-composer-active" />
                    ) : (
                      <FileText size={14} className="text-composer-caution" />
                    )}
                    <span className="text-xs text-composer-text-secondary max-w-[100px] truncate">
                      {att.name}
                    </span>
                    {att.status === 'processing' && (
                      <Loader2 size={12} className="animate-spin text-composer-text-secondary" />
                    )}
                    {att.status === 'error' && (
                      <span className="text-composer-danger text-xs">!</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      aria-label={`Remove ${att.name}`}
                      className={cn(
                        TOUCH_TARGET_32,
                        'ml-1 p-0.5 rounded hover:bg-composer-danger/20 text-composer-text-secondary hover:text-composer-danger transition-colors',
                      )}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {attachmentError && (
                  <span className="text-xs text-composer-danger self-center">
                    {attachmentError}
                  </span>
                )}
              </div>
            )}

            <div className="relative flex w-full min-h-[44px] items-center">
              <div className="relative flex flex-1 min-h-[44px] items-center">
                <textarea
                  ref={textareaRef}
                  data-testid="composer-input"
                  className="w-full border-none bg-transparent text-composer-text leading-relaxed resize-none outline-none overflow-y-auto min-h-[40px] py-2 pl-12 pr-28 text-sm tracking-[0.01em] placeholder:text-composer-text-faint"
                  style={{ maxHeight: TEXTAREA_MAX_HEIGHT_PX }}
                  placeholder={placeholder}
                  value={value}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  disabled={disabled}
                />
              </div>

              {/* Attachment button */}
              {enableAttachments && (
                <div className="absolute flex items-center justify-center left-1.5 bottom-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    aria-label="Add attachment"
                    className={cn(
                      TOUCH_TARGET_44,
                      'flex h-8 w-8 items-center justify-center rounded-sm border border-composer-active dark:border-composer-active/30 text-composer-active transition-all duration-100 hover:border-composer-active hover:bg-composer-active/20 dark:hover:bg-composer-active/5 disabled:opacity-45 disabled:cursor-not-allowed',
                    )}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="absolute flex items-center justify-center gap-2 right-1.5 bottom-1.5">
                <div className="flex items-center gap-1.5">
                  {/* Menu toggle */}
                  {!isSessionActive && !isSessionConnected && showMenu && (
                    <button
                      key="menu"
                      type="button"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      title="Menu"
                      className={cn(
                        TOUCH_TARGET_44,
                        'flex items-center justify-center px-2 h-8 rounded-sm border transition-all duration-100 cursor-pointer',
                        isMenuOpen
                          ? 'bg-composer-surface-elevated border-composer-border text-composer-text-secondary'
                          : 'border-composer-border text-composer-text-faint hover:border-composer-text-faint hover:text-composer-text-secondary hover:bg-composer-surface-elevated/50',
                      )}
                    >
                      <ChevronUp size={14} />
                    </button>
                  )}
                  {/* Send button */}
                  <button
                    key="send"
                    type="button"
                    data-testid="send-button"
                    disabled={disabled || isProcessingAttachments}
                    aria-disabled={
                      (!value.trim() && !hasAttachments) || disabled || isProcessingAttachments
                    }
                    onClick={handleSubmit}
                    aria-label="Send message"
                    className={cn(
                      TOUCH_TARGET_44,
                      'flex h-8 w-8 items-center justify-center rounded-sm border transition-all duration-100',
                      (!value.trim() && !hasAttachments) || disabled || isProcessingAttachments
                        ? 'border-composer-border text-composer-text-faint cursor-not-allowed'
                        : 'border-composer-active dark:border-composer-active/50 text-composer-active hover:border-composer-active hover:bg-composer-active/20 dark:hover:bg-composer-active/10 cursor-pointer',
                    )}
                  >
                    <Send size={14} />
                  </button>
                  {/* Stop button */}
                  {(isSessionActive || isStopRequested) && (
                    <button
                      key="stop"
                      type="button"
                      className={cn(
                        TOUCH_TARGET_44,
                        'relative h-8 flex items-center justify-center gap-1 rounded-sm border text-[10px] font-semibold uppercase tracking-wider transition-all duration-100',
                        isStopRequested ? 'px-2' : 'w-8',
                        isStopRequested
                          ? 'border-composer-caution/50 text-composer-caution bg-composer-caution/10'
                          : 'border-composer-danger/30 text-composer-danger hover:border-composer-danger hover:bg-composer-danger/5',
                      )}
                      onClick={() => onStop?.()}
                      data-testid="stop-button"
                      aria-label={isStopRequested ? 'Stop requested' : 'Stop session'}
                    >
                      {isStopRequested ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Square size={14} />
                      )}
                      {isStopRequested && (
                        <span className="hidden sm:inline">Stopping</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Queue dialog */}
            <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-composer-caution">
                    Queued Messages ({queuedMessages.length})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-composer-text-secondary">
                    Per-session queue. These auto-send in order when the current run finishes.
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                  {queuedMessages.map((queuedMessage) => (
                    <div
                      key={queuedMessage.id}
                      className="border border-composer-border/50 rounded-sm px-2.5 py-2 bg-composer-surface/80"
                    >
                      <p className="text-xs text-composer-text whitespace-pre-wrap break-words">
                        {queuedMessage.content}
                      </p>
                      <p className="text-[10px] text-composer-text-faint mt-1 font-mono">
                        {queuedMessage.status === 'dispatching'
                          ? 'sending...'
                          : `queued ${new Date(queuedMessage.timestamp).toLocaleTimeString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Model selector menu — rendered at the root wrapper so it escapes the
            main card's `overflow-hidden` clipping, mirroring the autocomplete
            dropdown's escape pattern. Anchors to the trigger position (top-right). */}
        {isModelSelectorEnabled && isModelMenuOpen && (() => {
          // Semantic class hooks for product skinning (the toolkit's established
          // inversion pattern — consumers restyle these via CSS, not by forking):
          //   composer-model-menu              — the popover panel
          //   composer-model-menu-section      — a section header ("Model"/"Reasoning")
          //   composer-model-menu-item         — a selectable row
          //   composer-model-menu-item-label   — the row's primary label
          //   composer-model-menu-item-description — the row's secondary description
          //   composer-model-badge             — the interactive trigger badge (above)
          const renderRow = (
            row: { id: string; label: string; description?: string; isDefault?: boolean },
            kind: 'model' | 'effort',
            flatIndex: number,
            isChecked: boolean,
          ) => (
            <button
              key={row.id}
              type="button"
              role="menuitemradio"
              aria-checked={isChecked}
              data-menu-option
              tabIndex={flatIndex === modelMenuFocusIndex ? 0 : -1}
              onClick={() => activateMenuRow({ kind, id: row.id, isDefault: row.isDefault })}
              className={cn(
                'composer-model-menu-item flex w-full items-start gap-2 rounded-sm px-2 py-1 text-left transition-colors cursor-pointer outline-none',
                'hover:bg-composer-active/5 focus:bg-composer-active/5 focus-visible:bg-composer-active/5',
                isChecked && 'bg-composer-active/10',
              )}
              data-testid={`${kind}-option-${row.id}`}
            >
              <span className="mt-px w-3.5 shrink-0">
                {isChecked && <Check size={14} className="text-composer-active" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="composer-model-menu-item-label text-[10px] font-semibold uppercase tracking-wider text-composer-text truncate">
                    {row.label}
                  </span>
                  {row.isDefault && (
                    <span className="text-[8px] uppercase tracking-wider text-composer-text-faint border border-composer-border/60 rounded-sm px-1 py-px whitespace-nowrap">
                      server default
                    </span>
                  )}
                </span>
                {row.description && (
                  <span className="composer-model-menu-item-description block text-[10px] leading-tight text-composer-text-faint normal-case mt-0.5">
                    {row.description}
                  </span>
                )}
              </span>
            </button>
          );

          const sectionHeader = (label: string) => (
            <div className="composer-model-menu-section px-2 pt-1 pb-0.5 text-[8px] font-semibold uppercase tracking-wider text-composer-muted">
              {label}
            </div>
          );

          return (
            <div
              ref={modelMenuListRef}
              role="menu"
              data-testid="model-menu"
              onKeyDown={handleModelMenuKeyDown}
              className="composer-model-menu absolute right-0 bottom-full z-50 mb-1 min-w-[180px] max-w-[min(280px,calc(100vw-2rem))] rounded-sm border border-composer-border bg-composer-surface/95 backdrop-blur-sm shadow-md py-1"
            >
              {isEffortSelectorEnabled && sectionHeader('Model')}
              {availableModels.map((model, i) =>
                renderRow(model, 'model', i, model.id === (effectiveModel?.id ?? null)),
              )}
              {isEffortSelectorEnabled && (
                <>
                  {sectionHeader('Reasoning')}
                  {availableEfforts.map((eff, i) =>
                    renderRow(
                      eff,
                      'effort',
                      availableModels.length + i,
                      eff.id === (effectiveEffort?.id ?? null),
                    ),
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Menu slot */}
        {showMenu && isMenuOpen && props.renderMenu?.({ onClose: () => setIsMenuOpen(false) })}

        {/* Autocomplete dropdown */}
        {(enableFileAutocomplete || onFetchCommands) && (
          <AutocompleteDropdown
            suggestions={autocomplete.suggestions}
            onSelect={handleAutocompleteSelection}
            onClose={resetAutocomplete}
            isOpen={autocomplete.isActive && autocomplete.suggestions.length > 0}
            focusedIndex={autocomplete.focusedIndex}
            type={autocomplete.type}
            onFocusReturn={() => textareaRef.current?.focus()}
          />
        )}
      </div>
    </TooltipProvider>
  );
});
