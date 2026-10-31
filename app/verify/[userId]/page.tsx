import { WorkspaceApp } from "@/components/workspace";

export default async function VerificationRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <WorkspaceApp view="verify" userId={userId} />;
}
