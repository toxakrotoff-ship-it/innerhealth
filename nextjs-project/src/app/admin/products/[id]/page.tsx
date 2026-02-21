'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/button';
import { Category, getProductCategories } from '@/app/admin/catalog/actions';

interface Product {
  id: string;
  tildaUid: string;
  brand: string | null;
  sku: string | null;
  mark: string | null;
  category: string | null;
  title: string;
  description: string | null;
  text: string | null;
  photo: string | null;
  price: number;
  quantity: number | null;
  priceOld: number | null;
  discountPrice: number | null;
  editions: string | null;
  modifications: string | null;
  externalId: string | null;
  parentUid: string | null;
  characteristicsNutrition100g: string | null;
  characteristicsKkal: string | null;
  characteristicsContraindications: string | null;
  characteristicsShelfLife: string | null;
  characteristicsShelfLife2: string | null;
  characteristicsNutrition100gProduct: string | null;
  characteristicsEnergyValue100g: string | null;
  characteristicsNutrition100g2: string | null;
  characteristicsNutritionPerPortion5g: string | null;
  characteristicsComposition: string | null;
  characteristicsKkal100gDailyDose: string | null;
  characteristicsFormulation: string | null;
  characteristicsCalorie: string | null;
  characteristicsFlacon200ml: string | null;
  characteristicsStorage: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  seoTitle: string | null;
  seoDescr: string | null;
  seoKeywords: string | null;
  fbTitle: string | null;
  fbDescr: string | null;
  tab1: string | null;
  tab2: string | null;
  tab3: string | null;
  tab4: string | null;
  isPromoEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ViewProductPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productCategories, setProductCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // Проверим, что ID существует
        const id = Array.isArray(params.id) ? params.id[0] : params.id;
        if (!id) {
          setError('Invalid product ID');
          setLoading(false);
          return;
        }
        
        console.log('Fetching product with ID:', id);
        const response = await fetch(`/api/admin/products?id=${id}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error response:', errorText);
          throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setProduct(data);
        
        // Получаем категории товара
        const categories = await getProductCategories(id);
        setProductCategories(categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Fetch product error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, []);

  const handleEdit = () => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    router.push(`/admin/products/${id}/edit`);
  };

  const handleBack = () => {
    router.push('/admin/catalog');
  };

  if (loading) {
    return <div className="p-8">Загрузка данных товара...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">Ошибка: {error}</p>
        </div>
        <Button onClick={handleBack}>Назад к каталогу</Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-700">Товар не найден</p>
        </div>
        <Button onClick={handleBack}>Назад к каталогу</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Просмотр товара</h1>
        <p className="text-gray-600">ID: {product.id}</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Фото товара */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6">
            {product.photo ? (
              <div className="flex items-center justify-center w-48 h-48">
                <img
                  src={product.photo}
                  alt={product.title}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-gray-200 rounded-md flex items-center justify-center">
                <span className="text-gray-500">Нет фото</span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text">{product.title}</h2>
              <p className="text-gray-600 mt-1">Категория: {product.category || 'Не указана'}</p>
              {productCategories.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-600">Категории:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {productCategories.map(category => (
                      <span key={category.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {category.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-gray-600 mt-1">Бренд: {product.brand || 'Не указан'}</p>
              <p className="text-gray-600 mt-1">Артикул: {product.sku || 'Не указан'}</p>
            </div>
          </div>
        </div>

        {/* Основная информация */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Цена</p>
              <p className="font-medium">
                {product.discountPrice ? (
                  <span>
                    <span className="line-through text-gray-400 mr-2">{product.price} ₽</span>
                    <span className="font-bold text-red-600">{product.discountPrice} ₽</span>
                  </span>
                ) : (
                  `${product.price} ₽`
                )}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Старая цена</p>
              <p className="font-medium">{product.priceOld ? `${product.priceOld} ₽` : 'Не указана'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Сток</p>
              <p className="font-medium">{product.quantity || 'Не указан'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Промо-акция</p>
              <p className="font-medium">{product.isPromoEligible ? 'Да' : 'Нет'}</p>
            </div>
          </div>
        </div>

        {/* Описание */}
        {product.description && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Описание</h3>
            <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {/* Текст */}
        {product.text && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Текст</h3>
            <p className="text-gray-700 whitespace-pre-line">{product.text}</p>
          </div>
        )}

        {/* SEO */}
        {(product.seoTitle || product.seoDescr || product.seoKeywords) && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">SEO</h3>
            <div className="space-y-2">
              {product.seoTitle && (
                <div>
                  <p className="text-sm text-gray-500">Заголовок</p>
                  <p className="font-medium">{product.seoTitle}</p>
                </div>
              )}
              {product.seoDescr && (
                <div>
                  <p className="text-sm text-gray-500">Описание</p>
                  <p className="font-medium">{product.seoDescr}</p>
                </div>
              )}
              {product.seoKeywords && (
                <div>
                  <p className="text-sm text-gray-500">Ключевые слова</p>
                  <p className="font-medium">{product.seoKeywords}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={handleBack}
          >
            Назад
          </Button>
          <Button
            onClick={handleEdit}
          >
            Редактировать
          </Button>
        </div>
      </div>
    </div>
  );
}