import type { GenericId } from "convex/values";

export interface EmailNavigationResult<
  Email extends { _id: GenericId<"emails"> },
> {
  email: Email | null;
  emailIndex: number;
  nextEmailId?: GenericId<"emails">;
  prevEmailId?: GenericId<"emails">;
}

export function getEmailNavigation<Email extends { _id: GenericId<"emails"> }>(
  emails: readonly Email[],
  emailId: GenericId<"emails">
): EmailNavigationResult<Email> {
  const emailIndex = emails.findIndex((email) => email._id === emailId);
  const email = emailIndex >= 0 ? (emails[emailIndex] ?? null) : null;
  const prevEmailId = emailIndex > 0 ? emails[emailIndex - 1]?._id : undefined;
  const nextEmailId = emailIndex >= 0 ? emails[emailIndex + 1]?._id : undefined;

  return {
    email,
    emailIndex,
    nextEmailId,
    prevEmailId,
  };
}
