import { describe, it, expect } from 'vitest';
import { ChatMessageSchema } from '../schemas';

describe('AI Coach Schema Validation', () => {
  it('should validate a valid ChatMessage object', () => {
    const validMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'assistant',
      content: 'Hallo! Ich bin dein AI-Coach. Wie kann ich dir heute helfen?',
      createdAt: new Date(),
    };

    const parsed = ChatMessageSchema.safeParse(validMessage);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid role in ChatMessage', () => {
    const invalidMessage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'invalid_role',
      content: 'Helpful content',
      createdAt: new Date(),
    };

    const parsed = ChatMessageSchema.safeParse(invalidMessage);
    expect(parsed.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const incompleteMessage = {
      role: 'user',
      content: 'Helpful content',
    };

    const parsed = ChatMessageSchema.safeParse(incompleteMessage);
    expect(parsed.success).toBe(false);
  });
});
