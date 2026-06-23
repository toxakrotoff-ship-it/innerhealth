import { describe, expect, it } from 'vitest';
import { sanitizeProductText, sanitizeProductTitleInput } from './sanitize-text';

describe('sanitizeProductTitleInput', () => {
  it('preserves trailing space while typing the next word', () => {
    expect(sanitizeProductTitleInput('Способ ')).toBe('Способ ');
  });

  it('collapses repeated spaces to one', () => {
    expect(sanitizeProductTitleInput('Способ    применения')).toBe('Способ применения');
  });

  it('strips control characters', () => {
    expect(sanitizeProductTitleInput('Способ\u0000 применения')).toBe('Способ применения');
  });
});

describe('sanitizeProductText', () => {
  it('trims edges on save', () => {
    expect(sanitizeProductText('  Способ применения  ')).toBe('Способ применения');
  });
});
