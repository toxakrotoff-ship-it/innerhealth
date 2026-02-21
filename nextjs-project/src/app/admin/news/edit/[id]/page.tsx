import { EditNewsPageClient } from './EditNewsPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <EditNewsPageClient postId={id} />;
}
