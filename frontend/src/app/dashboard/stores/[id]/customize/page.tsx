import { redirect } from 'next/navigation';

export default async function StoreCustomizeRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/stores/${id}/editor`);
}