export function formatArchiveMessage(discarded: number): string {
  const suffix =
    discarded > 0
      ? ` Discarded ${discarded} pending ${discarded === 1 ? "link" : "links"}.`
      : "";

  return `Archived.${suffix}`;
}
