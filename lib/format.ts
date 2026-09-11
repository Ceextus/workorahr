/**
 * Shared display formatting.
 *
 * Lives in lib/ rather than a feature because payroll, the employee profile and
 * expenses all render money, and a currency guess duplicated across three files
 * defined here once so the three screens that render money always agree.
 */

/*
 * CURRENCY IS A SINGLE CONSTANT, ON PURPOSE.
 *
 * Money endpoints return a bare number — `salary: 85000`, `netSalary: 70000` —
 * with no currency code, so the symbol is decided here and nowhere else.
 *
 * Defined once means every screen agrees. If the API later returns a code per
 * record, this becomes a parameter and every call site keeps working unchanged.
 */
const CURRENCY = "NGN";

/** `null` in, `null` out — so callers can decide what "not set" looks like. */
export function money(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact money for tight columns: ₦1.2M rather than ₦1,200,000.00 */
export function moneyCompact(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** "14 Sep 2026" from a YYYY-MM-DD or ISO string. */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "14 Sep 2026, 12:00" — for timestamps rather than plain dates. */
export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
 * `Intl` throughout rather than string concatenation. It places the symbol on
 * the correct side, groups thousands the way the reader's locale expects, and
 * gets the decimal separator right — all things that quietly differ between
 * users and all things that look like bugs when wrong.
 *
 * Passing `undefined` as the locale means "use the reader's", which is why every
 * one of these is called from a Client Component. Formatted on the server they
 * would use the server's locale instead.
 */
