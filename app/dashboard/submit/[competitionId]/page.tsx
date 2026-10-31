import { WorkspaceApp } from "@/components/workspace";

export default async function SubmissionRoute({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = await params;
  return <WorkspaceApp view="submit" competitionId={competitionId} />;
}
