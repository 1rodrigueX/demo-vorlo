const DIACRITIC_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/** Nome de empresa -> slug de URL (usado tanto pra criar tenant do zero via
 * checkout quanto no /dev). Extraído de provision-tenant.ts/provision-
 * transportadora.ts, que tinham cópias idênticas desta função. */
export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(DIACRITIC_MARKS_REGEX, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "empresa"
  );
}
