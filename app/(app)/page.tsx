import MatchPage from "./match/page";

export const dynamic = "force-dynamic";

type MatchPageProps = Parameters<typeof MatchPage>[0];

export default async function Page(props: MatchPageProps) {
  return await MatchPage(props);
}
