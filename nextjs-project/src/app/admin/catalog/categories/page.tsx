'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import Button from '@/components/ui/button';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoriesSortOrder,
  Category,
} from '@/app/admin/catalog/actions';
import {
  buildCategoryTree,
  flattenCategoryTree,
  getDescendantCategoryIds,
  type FlatCategoryTreeNode,
} from '@/lib/category-tree';

interface CategoryFormState {
  title: string;
  slug: string;
  image: string;
  sortOrder: number;
  parentId: string;
}

interface CategoryRowProps {
  category: Category;
  categoryNode: FlatCategoryTreeNode;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

function CategoryRow({ category, categoryNode, onEdit, onDelete }: CategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 transition ${isDragging ? 'opacity-50 bg-gray-100' : 'hover:bg-gray-50'}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            className="touch-none p-1 rounded text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none"
            {...listeners}
            {...attributes}
            aria-label="Перетащить для изменения порядка"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div>
            <div
              className="text-sm font-medium text-gray-900 truncate"
              style={{ paddingLeft: `${categoryNode.depth * 18}px` }}
              title={category.title}
            >
              {categoryNode.depth > 0 && <span className="text-gray-400 mr-1">{'—'.repeat(categoryNode.depth)}</span>}
              {category.title}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
              <span>slug: {category.slug}</span>
              <span>сортировка: {category.sortOrder ?? 0}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" size="sm" onClick={() => onEdit(category)}>
            Ред.
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(category.id)}>
            Удалить
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormState>({
    title: '',
    slug: '',
    image: '',
    sortOrder: 0,
    parentId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const categoryTree = useMemo(() => {
    return buildCategoryTree(
      categories.map((category) => ({
        id: category.id,
        title: category.title,
        slug: category.slug,
        sortOrder: category.sortOrder ?? null,
        parentId: category.parentId ?? null,
      }))
    );
  }, [categories]);

  const flattenedTree = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);

  const disabledParentIds = useMemo(() => {
    if (!editingCategory) {
      return new Set<string>();
    }
    const descendants = getDescendantCategoryIds(categoryTree, editingCategory.id);
    descendants.add(editingCategory.id);
    return descendants;
  }, [categoryTree, editingCategory]);

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
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || null,
      });
      
      setCategories([...categories, newCategory]);
      setFormData({ title: '', slug: '', image: '', sortOrder: 0, parentId: '' });
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
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || null,
      });
      
      const updatedCategories = categories.map(cat =>
        cat.id === editingCategory.id ? updatedCategory : cat
      );
      
      setCategories(updatedCategories);
      setEditingCategory(null);
      setFormData({ title: '', slug: '', image: '', sortOrder: 0, parentId: '' });
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
      sortOrder: category.sortOrder || 0,
      parentId: category.parentId || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData({ title: '', slug: '', image: '', sortOrder: 0, parentId: '' });
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeNode = flattenedTree.find((n) => n.id === active.id);
      const overNode = flattenedTree.find((n) => n.id === over.id);
      if (!activeNode || !overNode || activeNode.parentId !== overNode.parentId) return;

      const siblings = flattenedTree.filter((n) => n.parentId === activeNode.parentId);
      const fromIndex = siblings.findIndex((s) => s.id === active.id);
      const toIndex = siblings.findIndex((s) => s.id === over.id);
      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = [...siblings];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);

      const updates = reordered.map((node, index) => ({
        id: node.id,
        sortOrder: index,
      }));

      try {
        await updateCategoriesSortOrder(updates);
        setCategories((prev) =>
          prev.map((c) => {
            const u = updates.find((x) => x.id === c.id);
            return u ? { ...c, sortOrder: u.sortOrder } : c;
          })
        );
      } catch (err) {
        console.error('Error reordering categories:', err);
        if (err instanceof Error) setError(`Ошибка сохранения порядка: ${err.message}`);
      }
    },
    [flattenedTree]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const getIndentedLabel = (node: FlatCategoryTreeNode) => {
    if (node.depth === 0) return node.title;
    return `${'— '.repeat(node.depth)}${node.title}`;
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Родительская категория
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="form-input"
                >
                  <option value="">Без родителя</option>
                  {flattenedTree.map((categoryNode) => (
                    <option
                      key={categoryNode.id}
                      value={categoryNode.id}
                      disabled={disabledParentIds.has(categoryNode.id)}
                    >
                      {getIndentedLabel(categoryNode)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Выберите родителя для построения иерархии разделов.
                </p>
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

        {/* Дерево категорий */}
        <div className="card min-w-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Дерево категорий</h3>
            <p className="text-xs text-gray-500 mt-1">
              Вложенность отображается с отступами. Перетащите строку за иконку ≡ для изменения порядка среди элементов одного уровня.
            </p>
          </div>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={flattenedTree.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-gray-100">
                {flattenedTree.map((categoryNode) => {
                  const category = categories.find((item) => item.id === categoryNode.id);
                  if (!category) return null;

                  return (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      categoryNode={categoryNode}
                      onEdit={handleEditCategory}
                      onDelete={handleDeleteCategory}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>

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