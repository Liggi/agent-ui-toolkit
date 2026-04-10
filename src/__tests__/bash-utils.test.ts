import { describe, it, expect } from 'vitest';
import { summarizeCommand, parseBackgroundOutputPath } from '../components/tools/BashTool.js';

describe('summarizeCommand', () => {
  it('returns short commands unchanged', () => {
    expect(summarizeCommand('ls -la')).toBe('ls -la');
    expect(summarizeCommand('git status')).toBe('git status');
  });

  it('truncates long commands', () => {
    const long = 'a'.repeat(100);
    const result = summarizeCommand(long);
    expect(result.length).toBeLessThanOrEqual(81); // 80 + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('strips shell wrapper prefixes', () => {
    expect(summarizeCommand("bash -c 'echo hello'")).toBe('echo hello');
    expect(summarizeCommand("sh -c 'ls -la'")).toBe('ls -la');
  });

  it('takes first meaningful line of multiline commands', () => {
    const result = summarizeCommand('echo first\necho second\necho third');
    expect(result).toContain('echo first');
  });

  it('skips comment lines', () => {
    const result = summarizeCommand('# comment\necho actual');
    expect(result).toContain('echo actual');
  });
});

describe('parseBackgroundOutputPath', () => {
  it('extracts output path from result', () => {
    expect(parseBackgroundOutputPath('Output is being written to: /tmp/output.log'))
      .toBe('/tmp/output.log');
  });

  it('returns null when no match', () => {
    expect(parseBackgroundOutputPath('Command completed successfully')).toBeNull();
    expect(parseBackgroundOutputPath('')).toBeNull();
  });
});
