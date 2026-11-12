const LOCALE = 'es-CR';
const MONTH_LENGTH = 'YYYY-MM'.length;

const currencyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'CRC' });
// Las fechas de la API no tienen hora: se formatean en UTC para que no se corran de día.
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formatea un monto decimal (string de la API) en colones. */
export function formatCurrency(amount: string | number): string {
  return currencyFormatter.format(Number(amount));
}

/** `2026-11-05` → `5 nov 2026`. */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** `2026-11` → `noviembre de 2026`. */
export function formatMonth(month: string): string {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

/** Fecha de hoy en la zona horaria del usuario, como `YYYY-MM-DD`. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function currentMonth(): string {
  return todayIsoDate().slice(0, MONTH_LENGTH);
}

/** Suma `delta` meses a un mes `YYYY-MM` (negativo para retroceder). */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, MONTH_LENGTH);
}
