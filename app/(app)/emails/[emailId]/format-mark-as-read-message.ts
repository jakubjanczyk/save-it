export function formatMarkAsReadMessage(discarded: number): string {
  const suffix =
    discarded > 0
      ? ` Discarded ${discarded} pending ${discarded === 1 ? "link" : "links"}.`
      : "";

  return `Marked as read.${suffix}`;
}
