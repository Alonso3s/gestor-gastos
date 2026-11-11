import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatMonth, shiftMonth } from './format';

describe('format', () => {
  it('formatea montos en colones', () => {
    expect(formatCurrency('312500.50')).toMatch(/^₡\s?312\s?500,50$/);
  });

  it('formatea fechas sin correrlas de día por la zona horaria', () => {
    expect(formatDate('2026-11-01')).toContain('1 nov');
    expect(formatMonth('2026-11')).toBe('noviembre de 2026');
  });

  it('avanza y retrocede meses cruzando de año', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });
});
