/**
 * Normalizes a phone number to one canonical form before it is stored.
 *
 * Guardian accounts group brothers by matching `guardianPhone`, so two records
 * that differ only in spacing or digit script must not end up as different people.
 *
 * Handles: Arabic-Indic digits, spaces/dashes/parens, and the Syrian country
 * code written as +963 / 00963 / 963 — all collapse to the local 09XXXXXXXX form.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits → Western
  const western = String(raw)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  // Keep digits only; a leading + is re-expressed as the 00 prefix first
  let digits = western.trim().replace(/^\+/, "00").replace(/\D/g, "");
  if (!digits) return null;

  // Country code → local form
  if (digits.startsWith("00963")) digits = "0" + digits.slice(5);
  else if (digits.startsWith("963") && digits.length > 9) digits = "0" + digits.slice(3);

  // Mobile numbers written without the leading zero (9XXXXXXXX)
  if (digits.length === 9 && digits.startsWith("9")) digits = "0" + digits;

  return digits;
}
