# @liggi/agent-ui-toolkit

React components for rendering Claude Code tool calls — diffs, file reads, bash output, task trees, MCP tools — with theming and a composer.

Live component gallery: **https://liggi.github.io/agent-ui-toolkit/** (deploys from `main`).

```bash
pnpm add @liggi/agent-ui-toolkit
```

## Requirements

- **React 18 or 19.** Both `react` and `react-dom` are peer dependencies (`>=18`).
- **Styling — pick one of two modes.** The components are built from Tailwind utility classes, so nothing renders correctly until one of these is in place.

### Mode A — precompiled stylesheet (no Tailwind needed)

Import the stylesheet once, anywhere in your app. Works in any React app — Vite, Next.js, CRA, whatever.

```ts
import '@liggi/agent-ui-toolkit/styles.css';
```

This ships every utility class the components use, plus the theme tokens. It deliberately **does not** include Tailwind's preflight reset, so it will not touch your app's own element styling. See [Precompiled CSS: what's in it](#precompiled-css-whats-in-it).

### Mode B — you already use Tailwind v4

Skip the stylesheet and let your own Tailwind build scan the package, so the toolkit's classes are compiled into your existing CSS alongside your app's:

```css
/* your css entry, e.g. app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@source "../node_modules/@liggi/agent-ui-toolkit/dist";
```

In this mode you own the theme, so you also need to register the tokens the components reference. `src/styles/toolkit.css` in this repo is the reference for what those are: the `--color-composer-*` set, and the `--color-parchment-*` light-mode palette used throughout `tokens.ts`.

Do not use both modes at once — you'll ship the same utilities twice.

## Quickstart

Wrap your tree in `ToolkitProvider` and hand `ToolUseRenderer` a `tool_use` block plus its result.

```tsx
import { ToolkitProvider, ToolUseRenderer } from '@liggi/agent-ui-toolkit';
import '@liggi/agent-ui-toolkit/styles.css';

export function Example() {
  return (
    <div className="dark">
      <ToolkitProvider theme="dark">
        <ToolUseRenderer
          toolUse={{
            type: 'tool_use',
            id: '1',
            name: 'Read',
            input: { file_path: '/project/src/app.tsx' },
          }}
          toolResult={{
            status: 'completed',
            result:
              '1\timport React from "react";\n2\t\n3\texport default function App() {\n4\t  return <h1>Hello</h1>;\n5\t}',
          }}
          workingDirectory="/project"
        />
      </ToolkitProvider>
    </div>
  );
}
```

`ToolUseRenderer` picks the renderer from `toolUse.name`, wraps it in an error boundary, and falls back to a generic card for tool names it doesn't recognise. A `toolResult` with `status: 'pending'` (or `isStreaming`) renders an in-progress row instead.

### Key props

| Prop | Type | Purpose |
| --- | --- | --- |
| `toolUse` | `{ type, id, name, input }` | The tool call to render. Required. |
| `toolResult` | `ToolResult` | `{ status, result?, is_error? }`. Omit while the call is in flight. |
| `workingDirectory` | `string` | Used to shorten absolute file paths in headers. |
| `isStreaming` | `boolean` | Renders the pending/in-progress state. |
| `customRenderers` | `Record<string, CustomToolRenderer>` | Consumer renderers, checked before the defaults. |
| `childrenMessages` | `Record<string, ChatMessage[]>` | Sub-agent messages, keyed by `tool_use_id` — drives the `Task` tree. |
| `toolResults` | `Record<string, ToolResult>` | Results for nested tool calls inside a `Task`. |
| `onPlanApprove` / `onPlanReject` | `() => void \| Promise<void>` | Approval callbacks for `ExitPlanMode`. |
| `planOutcomes` | `Record<string, 'approved' \| 'rejected'>` | Historical plan decisions, keyed by `tool_use_id`. |
| `onAnswerQuestion` | `(questionId, answers) => void` | Submit handler for `AskUserQuestion`. |
| `fetchBackgroundOutput` | `(path) => Promise<BackgroundTaskOutput \| null>` | Lets `BashTool` pull output for backgrounded commands. |
| `renderChildMessage` | `(message: ChatMessage) => ReactNode` | How to render non-tool messages inside a `Task` tree. |

## Renderer catalog

`ToolContent` routes on tool name. Every renderer uses `CollapsibleToolCard`, so all cards share the same collapsed header / expandable body chrome.

| Component | Handles | Renders |
| --- | --- | --- |
| `ReadTool` | `Read` | File contents with syntax highlighting and line numbers; inline images for image reads. |
| `EditTool` | `Edit`, `MultiEdit` | Word-level diff with syntax coloring and line numbers. |
| `WriteTool` | `Write` | New file contents with syntax highlighting and line numbers, shortened path header, line count. |
| `BashTool` | `Bash` | Formatted command, output with JSON detection, background-task output polling. |
| `SearchTool` | `Grep`, `Glob`, `LS` | Match lists grouped by file, with match counts; file listings for `Glob`/`LS`. |
| `WebTool` | `WebSearch`, `WebFetch` | Search result lists and fetched page prose. |
| `TaskTool` | `Task`, `Agent` | Sub-agent tree — nested tool calls and messages under the spawning call. |
| `TaskOutputTool` | `TaskOutput` | Output pulled back from a background task. |
| `TaskManagementTool` | `TaskCreate`, `TaskUpdate` | Task create/update summary. |
| `TodoTool` | `TodoRead`, `TodoWrite` | Todo list with per-item status. |
| `PlanTool` | `ExitPlanMode`, `exit_plan_mode` | Plan markdown with approve / reject actions and prior-outcome state. |
| `AskUserQuestionTool` | `AskUserQuestion` | Question options as selectable answers. |
| `MonitorTool` | `Monitor` | Monitored command, timeout, persistence flag. |
| `ScheduleWakeupTool` | `ScheduleWakeup` | Scheduled fire time, delay, reason, prompt. |
| `ToolSearchTool` | `ToolSearch` | Tool-schema lookup query and matches. (`select:` queries render nothing — they're internal preloading.) |
| `TeamCreateTool`, `SendMessageTool`, `TeamDeleteTool` | `TeamCreate`, `SendMessage`, `TeamDelete` | Multi-agent team lifecycle and inter-agent messages. |
| `SlackTool` | `mcp__*slack__*` | Channel history, message search results, user lookups. |
| `NotionTool` | `mcp__*notion__*` | Page results with titles and timestamps. |
| `ChromeDevToolsTool` | `mcp__*chrome[-_]devtools__*` | Page actions (click, fill, hover, navigate), console output, network requests, performance and Lighthouse runs. |
| `LinearTool` | `mcp__*linear__*` | Structured issue display. |
| `McpTool` | any other `mcp__*` | Generic MCP card — decoded arguments and result. |
| `FallbackTool` | anything unrecognised | Name, raw input, raw result. |

Errors (`is_error: true`) are intercepted before routing and rendered as an error card, except for `ExitPlanMode`, which becomes a pending-approval plan.

## Custom renderers

Pass `customRenderers` to override a built-in or add your own tool. It's checked before the default routing table.

```tsx
<ToolUseRenderer
  customRenderers={{
    'mcp__notion__search': (props) => <NotionSearchCards {...props} />,
  }}
/>
```

A renderer receives `{ toolName, input, result, isError, isPending, toolUseId, workingDirectory, isStreaming }` and may return `null` to render nothing.

The building blocks are exported so custom cards match the built-ins: `CollapsibleToolCard`, `CollapsedToolGroup`, `CodeHighlight`, `LazyCodeHighlight`, `DiffViewer`, `SearchResultContent`, `FetchResultContent`, `ProseResultContent`, `ErrorBoundary`, the `Collapsible` / `Dialog` / `Tooltip` primitives, and the `tk`, `PROSE_CLASSES`, `PROSE_CLASSES_SM` tokens.

## Theming

**Dark mode** is driven by a `dark` class on an ancestor element. Set it on a wrapper and pass the matching `theme` to `ToolkitProvider` — the class drives the Tailwind `dark:` variants, and `theme` selects the Shiki syntax-highlighting theme.

```tsx
<div className={isDark ? 'dark' : ''}>
  <ToolkitProvider theme={isDark ? 'dark' : 'light'}>{children}</ToolkitProvider>
</div>
```

**Agent colors.** `resolveAgentColor` maps an agent or team-member name to a color key (`blue`, `green`, `yellow`, `purple`, `red`, `cyan`), used to tint task and team cards:

```tsx
<ToolkitProvider theme="dark" resolveAgentColor={(name) => teamColors[name]}>
```

**Composer colors** are CSS custom properties. Override them anywhere in your cascade — they're consumed through `var()`, so no rebuild is needed:

```css
:root {
  --color-composer-active: #60a5fa;            /* "Working" */
  --color-composer-ready: #34d399;             /* "Ready" */
  --color-composer-caution: #fbbf24;           /* "Starting" / "Stopping" */
  --color-composer-danger: #fb7185;            /* "Stop" */
  --color-composer-muted: #a1a1aa;             /* "Off" / inactive */

  --color-composer-surface: #ffffff;
  --color-composer-surface-elevated: #f4f4f5;
  --color-composer-border: #e4e4e7;
  --color-composer-text: #18181b;
  --color-composer-text-secondary: #71717a;
  --color-composer-text-faint: #a1a1aa;
}
```

The `.dark` class overrides the surface, border and text values; the five status colors are shared across both themes.

The light-mode neutrals (`--color-parchment-50` … `--color-parchment-950`) are overridable the same way.

## Composer

`Composer` is an input surface for driving an agent session — text entry, file autocomplete, slash commands, attachments, and a status bar. Props are grouped:

- **`core`** — `onSubmit(message, { workingDirectory, attachments })` (required), plus `value` / `onChange` for controlled use, `placeholder`, `isLoading`, `disabled`, `sessionId`.
- **`features`** — toggles: `enableAttachments`, `enableFileAutocomplete`, `showStatusBar`, `showMenu`.
- **`runtimeConfig`** — what the status bar reports and what the autocompletes offer: `isSessionActive`, `isSessionConnected`, `isStopRequested`, `isInitializing`, `hasBackgroundTasks`, `scheduledWakeup`, `sessionStartTime`, `sessionUsage` (token counts), `sessionModel` / `sessionModelFallback` (the model actually serving, flagged when it differs from the configured one), `queuedMessages`, and the file/command sources `fileSystemEntries` / `onFetchFileSystem` / `availableCommands` / `onFetchCommands`.
- **`permissionConfig`** — `onStop`, `onInterrupt`.
- **`renderMenu`** — render prop for the menu area below the input, called with `{ onClose }` when `showMenu` is on.

`ComposerRef` exposes `focusInput()`.

## Precompiled CSS: what's in it

`dist/styles/toolkit.css` is compiled by the Tailwind v4 CLI from `src/styles/toolkit.dist.css`. Three choices are worth knowing about:

- **No preflight.** Tailwind's preflight is a global reset — it zeroes margins everywhere, strips list styling from every `ul`/`ol`, and sets `display: block` on every `img`. A component library has no business doing that to its host, so the build imports only the `theme` and `utilities` layers. If your app has no CSS reset of its own, you'll want one; this file won't provide it.
- **Class-based dark mode.** Tailwind v4's stock `dark:` variant follows `prefers-color-scheme`, which would make the shipped stylesheet track the OS and ignore your app's theme toggle. The build overrides it so `dark:` responds to the `.dark` class instead. In Mode B, the `dark:` behaviour is whatever your own Tailwind config says.
- **Tokens are baked in but stay overridable.** The parchment and composer palettes ship as defaults so light mode isn't blank out of the box. Emitted utilities reference them via `var()`, so redefining the properties on `:root` re-themes the toolkit without recompiling.

The typography plugin is included, so `PROSE_CLASSES` and markdown rendering work in both modes.

One known gap: `tokens.ts` references `scrollbar-thin` / `scrollbar-thumb-*` classes from the `tailwind-scrollbar` plugin, which isn't a dependency. Those classes are inert in both modes — scrollbars fall back to browser defaults.

## Where it fits

```
agent-ui-harness   (protocol: events, classify, group, extract)
       ↓
agent-ui-toolkit   (components: tool cards, groups, result renderers)
       ↓
your app           (product: layout, state, themes, API integration)
```

The layer below is [`@liggi/agent-ui-harness`](https://www.npmjs.com/package/@liggi/agent-ui-harness) — it turns a raw Claude Code event stream into classified, grouped tool calls. This package renders them. Product concerns (team color lookup, plan approval, background output fetching) are inverted into the props and context described above, so nothing product-specific lives here.

## Development

```bash
pnpm install
pnpm build        # tsc → dist/, then Tailwind CLI → dist/styles/toolkit.css
pnpm typecheck
pnpm test         # vitest
pnpm test:ct      # Playwright component tests
pnpm storybook    # dev server on :6006
```

## Status

0.x — the API is not stable yet and minor versions may break it.
