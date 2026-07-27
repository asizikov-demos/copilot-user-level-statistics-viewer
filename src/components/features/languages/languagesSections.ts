interface LanguageContextSection {
  id: string;
  label: string;
}

export const LANGUAGES_SECTIONS: LanguageContextSection[] = [
  { id: 'languages-summary', label: 'Summary' },
  { id: 'languages-daily-charts', label: 'Daily Language Charts' },
  { id: 'languages-top-lists', label: 'Top Language Lists' },
  { id: 'languages-net-impact', label: 'Net Productivity Impact' },
  { id: 'languages-complete-breakdown', label: 'Complete Breakdown' },
];
