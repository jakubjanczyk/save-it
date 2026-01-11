import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FocusRedirect(props: {
  searchParams?:
    | { linkId?: string | string[] }
    | Promise<{ linkId?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const linkId =
    typeof searchParams?.linkId === "string" ? searchParams.linkId : null;

  if (linkId) {
    redirect(`/?linkId=${encodeURIComponent(linkId)}`);
  }

  redirect("/");
}
