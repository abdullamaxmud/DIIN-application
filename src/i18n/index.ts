import so from './so.json'

// Every UI string lives in so.json, so other languages (ar, en) can be added later
// by adding a sibling file with the same keys.
type Dict = { [key: string]: string | string[] | Dict }

const dict: Dict = so as Dict

/** Look up a dotted key (e.g. "nav.home") and fill {placeholders}. Missing keys return the key itself. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Dict | undefined)?.[part], dict)
  if (typeof value !== 'string') return key
  return vars ? value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`)) : value
}

/** Look up a list of strings (e.g. "date.days"). */
export function tList(key: string): string[] {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Dict | undefined)?.[part], dict)
  return Array.isArray(value) ? value : []
}
