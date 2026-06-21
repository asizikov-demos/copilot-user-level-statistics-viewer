import { describe, it, expect } from 'vitest';
import { formatAiAdoptionPhase, formatAiAdoptionPhaseName, generateDateRange } from './formatters';

describe('generateDateRange', () => {
  it('returns a single date when start equals end', () => {
    expect(generateDateRange('2024-01-15', '2024-01-15')).toEqual(['2024-01-15']);
  });

  describe('AI adoption phase formatters', () => {
    it('formats known phase numbers using GitHub adoption labels', () => {
      expect(formatAiAdoptionPhase({ phase_number: 0, phase: 'No Cohort', version: 'v1' })).toBe('Phase 0 — No cohort');
      expect(formatAiAdoptionPhase({ phase_number: 1, phase: 'Phase 1', version: 'v1' })).toBe('Phase 1 — Code first');
      expect(formatAiAdoptionPhase({ phase_number: 2, phase: 'Phase 2', version: 'v1' })).toBe('Phase 2 — Agent first');
      expect(formatAiAdoptionPhase({ phase_number: 3, phase: 'Phase 3', version: 'v1' })).toBe('Phase 3 — Multi-agent');
    });

    it('formats phase names without phase numbers for compact header display', () => {
      expect(formatAiAdoptionPhaseName({ phase_number: 2, phase: 'Phase 2', version: 'v1' })).toBe('Agent first');
    });

    it('falls back to API-provided values for unknown phases', () => {
      expect(formatAiAdoptionPhase({ phase_number: 4, phase: 'Experimental', version: 'v2' })).toBe('Experimental');
      expect(formatAiAdoptionPhaseName({ phase_number: 4, phase: 'Experimental', version: 'v2' })).toBe('Experimental');
    });

    it('formats missing phase data as not available', () => {
      expect(formatAiAdoptionPhase()).toBe('N/A');
      expect(formatAiAdoptionPhaseName()).toBe('N/A');
    });
  });

  it('returns all dates inclusive for a multi-day range', () => {
    expect(generateDateRange('2024-01-13', '2024-01-15')).toEqual([
      '2024-01-13',
      '2024-01-14',
      '2024-01-15',
    ]);
  });

  it('returns an empty array when start is after end', () => {
    expect(generateDateRange('2024-01-15', '2024-01-13')).toEqual([]);
  });

  it('correctly crosses a month boundary', () => {
    const result = generateDateRange('2024-01-30', '2024-02-02');
    expect(result).toEqual(['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02']);
  });

  it('correctly crosses a year boundary', () => {
    const result = generateDateRange('2024-12-30', '2025-01-02');
    expect(result).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']);
  });
});
