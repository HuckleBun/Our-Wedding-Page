export type TemplateVars = Record<string, string>;

/** Replaces {{name}} placeholders; unknown names become empty. Safe to use in the browser. */
export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
