'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  Category
} from '@/app/admin/catalog/actions';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    image: '',
    sortOrder: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Ошибка загрузки категорий');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCategory = await createCategory({
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
        image: formData.image,
        sortOrder: formData.sortOrder
      });
      
      setCategories([...categories, newCategory]);
      setFormData({ title: '', slug: '', image: '', sortOrder: 0 });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating category:', error);
      if (error instanceof Error) {
        setError(`Ошибка при создании категории: ${error.message}`);
      } else {
        setError('Ошибка при создании категории');
      }
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    try {
      const updatedCategory = await updateCategory(editingCategory.id, {
        title: formData.title,
        slug: formData.slug,
        image: formData.image,
        sortOrder: formData.sortOrder
      });
      
      const updatedCategories = categories.map(cat =>
        cat.id === editingCategory.id ? updatedCategory : cat
      );
      
      setCategories(updatedCategories);
      setEditingCategory(null);
      setFormData({ title: '', slug: '', image: '', sortOrder: 0 });
    } catch (error) {
      console.error('Error updating category:', error);
      if (error instanceof Error) {
        setError(`Ошибка при обновлении категории: ${error.message}`);
      } else {
        setError('Ошибка при обновлении категории');
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      if (error instanceof Error) {
        setError(`Ошибка при удалении категории: ${error.message}`);
      } else {
        setError('Ошибка при удалении категории');
      }
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      title: category.title,
      slug: category.slug,
      image: category.image || '',
      sortOrder: category.sortOrder || 0
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({ title: '', slug: '', image: '', sortOrder: 0 });
  };

  if (isLoading) {
    return (
      <div className="admin-container">
        <div className="admin-page-header">
          <h1>Категории товаров</h1>
          <p>Управление категориями каталога</p>
        </div>

        <div className="admin-content">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-10 bg-gray-200 rounded w-40 mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-page-header">
          <h1>Категории товаров</h1>
          <p>Управление категориями каталога</p>
        </div>

        <div className="admin-content">
          <div className="alert error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Ошибка загрузки данных</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-page-header">
        <h1>Категории товаров</h1>
        <p>Управление категориями каталога</p>
      </div>

      <div className="admin-content">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div></div>
          <Button variant="primary"
            onClick={() => setIsCreating(true)}
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить категорию
          </Button>
        </div>

        {/* Форма создания/редактирования */}
        {(isCreating || editingCategory) && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
            </h2>
            <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  placeholder="автоматически генерируется из названия"
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Изображение (URL)
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({...formData, image: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                  className="form-input"
                />
              </div>
              
              <div className="flex space-x-3">
                <Button variant="primary"
                  type="submit"
                >
                  {editingCategory ? 'Сохранить изменения' : 'Создать категорию'}
                </Button>
                <Button variant="secondary"
                  type="button"
                  onClick={editingCategory ? handleCancelEdit : () => setIsCreating(false)}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Список категорий */}
        <div className="card min-w-0">
          <div className="table-responsive">
            <table className="table table-horizontal min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сортировка
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {category.slug}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {category.sortOrder}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-4">
                        <Button variant="secondary" size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          Ред.
                        </Button>
                        <Button variant="destructive" size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {categories.length === 0 && !isCreating && !editingCategory && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет категорий</h3>
              <p className="mt-1 text-sm text-gray-500">Начните с создания первой категории</p>
              <div className="mt-6">
                <Button variant="primary"
                  onClick={() => setIsCreating(true)}
                >
                  Создать категорию
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}