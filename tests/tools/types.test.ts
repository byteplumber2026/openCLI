import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS } from '../../src/tools/definitions.js';
import type { ToolCall, ToolResult } from '../../src/tools/types.js';

describe('Tool Types', () => {
  it('has 5 tool definitions', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(5);
  });

  it('all tools have required fields', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
    }
  });

  it('ToolCall type works correctly', () => {
    const call: ToolCall = { id: '1', name: 'file_read', arguments: { path: 'test.txt' } };
    expect(call.name).toBe('file_read');
  });
});
