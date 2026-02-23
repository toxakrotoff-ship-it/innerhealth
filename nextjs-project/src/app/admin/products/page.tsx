'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';

export default function ProductsPage() {
  const router = useRouter();
  const base = useAdminBasePath();
  const [products] = useState([
    { id: 1, name: 'Товар 1', price: 1000, inStock: true },
    { id: 2, name: 'Товар 2', price: 2000, inStock: false },
    { id: 3, name: 'Товар 3', price: 1500, inStock: true },
  ]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text">Управление товарами</h1>
        <div className="flex space-x-3">
          <Button
            onClick={() => router.push(`/${base}/products/new`)}
          >
            Добавить новый
          </Button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-xl">
        <ul className="divide-y divide-gray-200">
          {products.map((product) => (
            <li key={product.id}>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-text">{product.name}</h3>
                  <p className="text-gray-500">Цена: {product.price} ₽</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 text-sm rounded-full ${product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.inStock ? 'В наличии' : 'Скрыт'}
                  </span>
                  <Button variant="secondary" size="sm">Редактировать</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
