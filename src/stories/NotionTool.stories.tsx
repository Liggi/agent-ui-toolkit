import type { Meta, StoryObj } from '@storybook/react';
import { NotionTool } from '../components/tools/NotionTool';

const meta: Meta<typeof NotionTool> = {
  title: 'Tools/NotionTool',
  component: NotionTool,
};

export default meta;
type Story = StoryObj<typeof NotionTool>;

export const SearchResults: Story = {
  args: {
    toolName: 'mcp__claude_ai_Notion__notion-search',
    input: { query: 'product roadmap', filters: {} },
    result: JSON.stringify({
      results: [
        {
          id: 'ec72b169-81d9-4e0d-990e-5b64e499e802',
          title: "Product Roadmap Summer '23",
          url: 'ec72b16981d94e0d990e5b64e499e802',
          type: 'page',
          highlight: 'Documentation within the Product',
          timestamp: '2023-09-17T04:18:00.000Z',
        },
        {
          id: '3103cacb-75f7-80fd-bee1-fd493e01a7cd',
          title: 'Clinical Research Roadmap',
          url: '3103cacb75f780fdbee1fd493e01a7cd',
          type: 'page',
          highlight: "AI's flagship product, Ash. We aim to build a body of evidence demonstrating efficacy, safety,...",
          timestamp: '2026-03-17T19:35:00.000Z',
        },
        {
          id: 'ccc95c65-7fdc-481c-a075-00e08889f6b7',
          title: "Product Roadmap Workstreams (Workflows) '23",
          url: 'ccc95c657fdc481ca07500e08889f6b7',
          type: 'page',
          highlight: "Product Roadmap Workstreams (Workflows) '23",
          timestamp: '2023-10-05T20:31:00.000Z',
        },
      ],
      type: 'workspace_search',
    }),
  },
};

export const DatabaseResults: Story = {
  args: {
    toolName: 'mcp__notion__API-post-search',
    input: { query: 'sprint planning' },
    result: JSON.stringify({
      results: [
        {
          id: 'aaa-111',
          title: 'Sprint 14 Planning',
          type: 'database_entry',
          highlight: 'Focus areas: auth middleware rewrite, mobile onboarding flow, analytics dashboard v2',
          timestamp: '2026-04-01T10:00:00.000Z',
        },
        {
          id: 'bbb-222',
          title: 'Sprint 13 Retro',
          type: 'page',
          highlight: 'What went well: shipped config experiment on time. What to improve: test coverage on mobile.',
          timestamp: '2026-03-18T15:30:00.000Z',
        },
      ],
    }),
  },
};

export const SinglePage: Story = {
  args: {
    toolName: 'mcp__claude_ai_Notion__notion-fetch',
    input: { id: 'ec72b169-81d9-4e0d-990e-5b64e499e802' },
    result: '# Product Roadmap\n\n## Q3 Goals\n\n1. Launch config experiment\n2. Ship mobile onboarding v2\n3. Integrate AlloyDB analytics\n\n## Status\n\nOn track for all three workstreams.',
  },
};

export const EmptySearch: Story = {
  args: {
    toolName: 'mcp__claude_ai_Notion__notion-search',
    input: { query: 'xyznonexistent', filters: {} },
    result: JSON.stringify({ results: [], type: 'workspace_search' }),
  },
};

export const ManyResults: Story = {
  args: {
    toolName: 'mcp__claude_ai_Notion__notion-search',
    input: { query: 'meeting notes', filters: {} },
    result: JSON.stringify({
      results: Array.from({ length: 8 }, (_, i) => ({
        id: `page-${i}`,
        title: `Team Standup ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Mon', 'Tue', 'Wed'][i]} Apr ${3 + i}`,
        type: 'page',
        highlight: `Discussed ${['auth rewrite', 'mobile bugs', 'analytics', 'deployment', 'testing', 'planning', 'design review', 'retrospective'][i]} progress and blockers.`,
        timestamp: new Date(2026, 3, 3 + i).toISOString(),
      })),
    }),
  },
};
