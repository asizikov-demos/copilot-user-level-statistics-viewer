import { describe, it, expect } from 'vitest';
import { normalizeLanguage } from '../languageNormalizer';

describe('normalizeLanguage', () => {
  it.each([
    ['csharp', 'C#'],
    ['cpp', 'C++'],
    ['py', 'Python'],
    ['js', 'JavaScript'],
    ['ts', 'TypeScript'],
    ['md', 'Markdown'],
    ['hcl', 'Terraform'],
    ['sh', 'Shell'],
    ['puml', 'PlantUML'],
    ['powershell', 'PowerShell'],
    ['graphql', 'GraphQL'],
    ['text', 'Plain Text'],
    ['plaintext', 'Plain Text'],
  ])('normalizes representative language IDs and aliases (%s)', (raw, expected) => {
    expect(normalizeLanguage(raw)).toBe(expected);
  });

  it('trims input and resolves aliases case-insensitively', () => {
    expect(normalizeLanguage(' CSHARP ')).toBe('C#');
    expect(normalizeLanguage('  PowerShell  ')).toBe('PowerShell');
  });

  it('trims but otherwise preserves unknown language names', () => {
    expect(normalizeLanguage('  Elixir  ')).toBe('Elixir');
  });
});
