import { EditProductForm } from './EditProductForm'

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  return <EditProductForm productId={id} />;
}
