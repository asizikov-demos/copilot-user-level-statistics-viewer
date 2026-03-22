import { describe, it, expect } from 'vitest';
import { normalizeLanguage } from '../languageNormalizer';

describe('normalizeLanguage', () => {
  it.each([
    // C#
    ['c#', 'C#'],
    ['C#', 'C#'],
    ['csharp', 'C#'],
    ['CSHARP', 'C#'],

    // C++
    ['c++', 'C++'],
    ['C++', 'C++'],
    ['cpp', 'C++'],
    ['CPP', 'C++'],

    // CSV variants
    ['csv', 'CSV'],
    ['CSV', 'CSV'],
    ['csv (semicolumn)', 'CSV'],
    ['csv (pipe)', 'CSV'],

    // Python
    ['python', 'Python'],
    ['Python', 'Python'],
    ['py', 'Python'],
    ['PY', 'Python'],

    // JavaScript
    ['javascript', 'JavaScript'],
    ['JavaScript', 'JavaScript'],
    ['js', 'JavaScript'],
    ['JS', 'JavaScript'],

    // TypeScript
    ['typescript', 'TypeScript'],
    ['TypeScript', 'TypeScript'],
    ['ts', 'TypeScript'],
    ['TS', 'TypeScript'],

    // Markdown
    ['markdown', 'Markdown'],
    ['Markdown', 'Markdown'],
    ['md', 'Markdown'],
    ['MD', 'Markdown'],

    // Terraform
    ['terraform', 'Terraform'],
    ['Terraform', 'Terraform'],
    ['hcl', 'Terraform'],
    ['HCL', 'Terraform'],
    ['tf', 'Terraform'],
    ['TF', 'Terraform'],

    // Shell
    ['shell', 'Shell'],
    ['Shell', 'Shell'],
    ['sh', 'Shell'],
    ['SH', 'Shell'],
    ['shellscript', 'Shell'],
    ['ShellScript', 'Shell'],

    // PlantUML
    ['plantuml', 'PlantUML'],
    ['PlantUML', 'PlantUML'],
    ['puml', 'PlantUML'],
    ['PUML', 'PlantUML'],
    ['wsd', 'PlantUML'],
    ['WSD', 'PlantUML'],
  ])('normalizes "%s" → "%s"', (raw, expected) => {
    expect(normalizeLanguage(raw)).toBe(expected);
  });

  it('passes through unknown languages unchanged', () => {
    expect(normalizeLanguage('Rust')).toBe('Rust');
    expect(normalizeLanguage('Go')).toBe('Go');
    expect(normalizeLanguage('ruby')).toBe('ruby');
  });

  it('trims whitespace before lookup', () => {
    expect(normalizeLanguage('  typescript  ')).toBe('TypeScript');
    expect(normalizeLanguage(' csharp ')).toBe('C#');
  });

  it('trims whitespace on pass-through', () => {
    expect(normalizeLanguage('  Rust  ')).toBe('Rust');
  });
});
