// Browser helper: reads every [name] field inside a container, including
// Polaris web components (<s-text-field>, <s-checkbox>, <s-select> …),
// by their live properties. Checkboxes give "on" or "".
export function collectFields(root: HTMLElement | null): Record<string, string> {
  const data: Record<string, string> = {};
  if (!root) return data;
  root.querySelectorAll<HTMLElement>("[name]").forEach((node) => {
    const el = node as any;
    const name = node.getAttribute("name");
    if (!name) return;
    const tag = node.tagName.toLowerCase();
    if (tag === "s-checkbox" || tag === "s-switch" || el.type === "checkbox") {
      data[name] = el.checked ? "on" : "";
      return;
    }
    data[name] = el.value == null ? "" : String(el.value);
  });
  return data;
}

/** Spread helper for boolean attributes on web components (React 18 would write "false"). */
export function bool(on: boolean | undefined, attr: string) {
  return on ? { [attr]: true } : {};
}
