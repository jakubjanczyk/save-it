const angleEmailRegex = /<([^>]+)>/;
const tokenEmailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function parseEmailAddress(fromHeader: string): string {
  const angle = fromHeader.match(angleEmailRegex);
  if (angle?.[1]) {
    return angle[1].trim();
  }

  const token = fromHeader.match(tokenEmailRegex);
  return token?.[0]?.trim() ?? fromHeader.trim();
}

export function senderMatches(pattern: string, email: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedPattern.startsWith("*@")) {
    return normalizedEmail.endsWith(normalizedPattern.slice(1));
  }

  return normalizedEmail === normalizedPattern;
}

export function findSenderId<Sender extends { _id: unknown; email: string }>(
  senders: readonly Sender[],
  fromHeader: string
): Sender["_id"] | null {
  const email = parseEmailAddress(fromHeader);
  return (
    senders.find((sender) => senderMatches(sender.email, email))?._id ?? null
  );
}
