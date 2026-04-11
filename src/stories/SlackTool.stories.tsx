import type { Meta, StoryObj } from '@storybook/react';
import { SlackTool } from '../components/tools/SlackTool';

const meta: Meta<typeof SlackTool> = {
  title: 'Tools/SlackTool',
  component: SlackTool,
};

export default meta;
type Story = StoryObj<typeof SlackTool>;

const SEARCH_RESULT = `MsgID,UserID,UserName,RealName,Channel,ThreadTs,Text,Time,Reactions,BotName,FileCount,AttachmentIDs,HasMedia,Cursor
1774623567.853709,U09D30R0HEG,jason,Jason Liggi,#async-jason-daniel,1774623567.853709,"quick thought: consolidate all proj-ash-builder, proj-slingshot-analyst, lattice, idris channels all into tooling

agree / disagree?",2026-03-27T14:59:27Z,,,0,,false,
1771416619.359199,U09D30R0HEG,jason,Jason Liggi,#async-jason-daniel,1771416619.359199,"Ive been evaluating these two companies for cloud stuff for Lattice btw, might also be useful for us if we want to do the persistent VM thing.",2026-02-18T12:10:19Z,,,0,,false,
1771256041.773919,U06GMGK832T,luka,Luka Smyth,#feedback,1771256041.773919,Lattice feedback Ill dump stuff here - no preassure to look at it,2026-02-16T15:34:01Z,,,0,,false,`;

export const SearchMessages: Story = {
  args: {
    toolName: 'mcp__slack__conversations_search_messages',
    input: { search_query: 'lattice', limit: 3 },
    result: SEARCH_RESULT,
  },
};

const CHANNEL_HISTORY = `MsgID,UserID,UserName,RealName,Channel,ThreadTs,Text,Time,Reactions,BotName,FileCount,AttachmentIDs,HasMedia,Cursor
1775940000.000001,U09D30R0HEG,jason,Jason Liggi,#general,,Good morning! Pushing the new background task status feature today.,2026-04-11T10:00:00Z,,,0,,false,
1775940120.000002,U06GMGK832T,luka,Luka Smyth,#general,,Nice — excited to see how it looks in the UI,2026-04-11T10:02:00Z,,,0,,false,
1775940300.000003,U09D30R0HEG,jason,Jason Liggi,#general,,It shows "Waiting for background task" in the composer status bar. Amber pulsing dot.,2026-04-11T10:05:00Z,,,0,,false,`;

export const ChannelHistory: Story = {
  args: {
    toolName: 'mcp__slack__conversations_history',
    input: { channel_id: '#general', limit: '1d' },
    result: CHANNEL_HISTORY,
  },
};

export const SingleMessage: Story = {
  args: {
    toolName: 'mcp__slack__conversations_search_messages',
    input: { search_query: 'deploy' },
    result: `MsgID,UserID,UserName,RealName,Channel,ThreadTs,Text,Time,Reactions,BotName,FileCount,AttachmentIDs,HasMedia,Cursor
1775940000.000001,U09D30R0HEG,jason,Jason Liggi,#deployments,,Just deployed v1.7.0 to production. All green.,2026-04-11T10:00:00Z,,,0,,false,`,
  },
};

export const EmptyResult: Story = {
  args: {
    toolName: 'mcp__slack__conversations_search_messages',
    input: { search_query: 'xyznonexistent' },
    result: 'No messages found matching the query.',
  },
};

export const UnreadChannels: Story = {
  args: {
    toolName: 'mcp__slack__conversations_unreads',
    input: {},
    result: `Channel,UnreadCount,MentionCount,LastRead
#general,5,1,2026-04-11T09:30:00Z
#async-jason-daniel,2,0,2026-04-11T08:00:00Z
#eng-shipping,12,3,2026-04-10T18:00:00Z`,
  },
};
