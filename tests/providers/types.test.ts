import { describe, it, expect } from 'vitest';
import type { Message, Provider, Model } from '../../src/providers/types.js';

describe('Provider types', () => {
  it('Message type accepts valid roles', () => {
    const msg: Message = { role: 'user', content: 'hello' };
    expect(msg.role).toBe('user');
  });

  it('Model type has required fields', () => {
    const model: Model = { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 };
    expect(model.id).toBe('gpt-4o');
  });
});
