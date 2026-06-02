import ProfileClient from "./ProfileClient";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const params = await searchParams;
  return <ProfileClient initialViewUserId={params?.userId ?? null} />;
}
