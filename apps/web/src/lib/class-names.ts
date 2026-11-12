/** Une clases CSS ignorando valores vacíos o falsos. */
export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
