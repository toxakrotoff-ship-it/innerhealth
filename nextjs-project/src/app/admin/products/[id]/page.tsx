import { ViewProductPageClient } from './ViewProductPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ViewProductPageClient productId={id} />;
}
