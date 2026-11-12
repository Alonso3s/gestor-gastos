const ISO_DATE_LENGTH = 10;

export interface DateRange {
  /** Inclusive. */
  start: Date;
  /** Exclusivo. */
  end: Date;
}

/** Convierte `YYYY-MM-DD` a la medianoche UTC de ese día, que es como Prisma guarda las columnas `DATE`. */
export function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

/** Rango `[primer día del mes, primer día del mes siguiente)` para un mes `YYYY-MM`. */
export function monthRange(month: string): DateRange {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

/** Mes anterior a `month`, en formato `YYYY-MM`. */
export function previousMonth(month: string): string {
  const { start } = monthRange(month);
  const previous = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  return previous.toISOString().slice(0, 'YYYY-MM'.length);
}
