/**
 * Maps raw language strings from the API to canonical display names.
 * Lookup is case-insensitive and trims whitespace. Unknown languages are returned trimmed.
 */

// Maps lowercase alias → canonical name
const ALIAS_MAP = new Map<string, string>([
  // C#
  ['c#', 'C#'],
  ['csharp', 'C#'],

  // C++
  ['c++', 'C++'],
  ['cpp', 'C++'],

  // CSV variants
  ['csv', 'CSV'],
  ['csv (semicolon)', 'CSV'],
  ['csv (pipe)', 'CSV'],

  // Common language IDs
  ['yaml', 'YAML'],
  ['json', 'JSON'],
  ['text', 'Plain Text'],
  ['plaintext', 'Plain Text'],
  ['bash', 'Bash'],
  ['sql', 'SQL'],
  ['powershell', 'PowerShell'],
  ['kotlin', 'Kotlin'],
  ['xml', 'XML'],
  ['html', 'HTML'],
  ['dotenv', 'Dotenv'],
  ['tsx', 'TSX'],
  ['java', 'Java'],
  ['mermaid', 'Mermaid'],
  ['css', 'CSS'],
  ['jsonc', 'JSONC'],
  ['github-actions-workflow', 'GitHub Actions Workflow'],
  ['skill', 'Skill'],
  ['ini', 'INI'],
  ['dockerfile', 'Dockerfile'],
  ['properties', 'Properties'],
  ['swift', 'Swift'],
  ['toml', 'TOML'],
  ['vue', 'Vue'],
  ['ignore', 'Ignore'],
  ['zsh', 'Zsh'],
  ['groovy', 'Groovy'],
  ['diff', 'Diff'],
  ['graphql', 'GraphQL'],
  ['chatagent', 'Chat Agent'],
  ['scss', 'SCSS'],
  ['instructions', 'Instructions'],
  ['http', 'HTTP'],
  ['rust', 'Rust'],

  // Report categories
  ['unknown', 'Unknown'],
  ['others', 'Others'],

  // Python
  ['python', 'Python'],
  ['py', 'Python'],

  // JavaScript
  ['javascript', 'JavaScript'],
  ['js', 'JavaScript'],

  // TypeScript
  ['typescript', 'TypeScript'],
  ['ts', 'TypeScript'],

  // Markdown
  ['markdown', 'Markdown'],
  ['md', 'Markdown'],

  // Terraform
  ['terraform', 'Terraform'],
  ['hcl', 'Terraform'],
  ['tf', 'Terraform'],

  // Shell
  ['shell', 'Shell'],
  ['sh', 'Shell'],
  ['shellscript', 'Shell'],

  // PlantUML
  ['plantuml', 'PlantUML'],
  ['puml', 'PlantUML'],
  ['wsd', 'PlantUML'],
]);

export function normalizeLanguage(raw: string): string {
  const key = raw.trim().toLowerCase();
  return ALIAS_MAP.get(key) ?? raw.trim();
}
