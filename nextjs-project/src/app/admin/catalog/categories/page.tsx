'use client';

import type { JSONContent } from '@tiptap/core';
import type { Prisma } from '@prisma/client';
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
import { Drag } from 'iconoir-react';
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
import { getCategoryPageContentDoc } from '@/content/category-descriptions';
import { CoverImageDropzone } from '@/app/admin/news/components/CoverImageDropzone';
import { useAdminBrand } from '@/app/admin/context/admin-brand';
import { SprintCategoryLineEditor } from '@/app/admin/catalog/components/sprint-category-line-editor';
import { cn } from '@/lib/utils';

const EMPTY_LINE_DOC: JSONContent = { type: 'doc', content: [] };

function isEmptyLineDoc(doc: JSONContent): boolean {
  return !doc.content || doc.content.length === 0;
}

/** Убирает вложенные `undefined` — иначе аргументы Server Action могут не сериализоваться. */
function lineDocToJsonValue(doc: JSONContent): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(doc)) as Prisma.JsonValue;
}

/** Человекочитаемое сообщение для типичных ошибок Next.js после деплоя / skew версий */
function formatCategoryActionError(context: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/Server Action ['"]?[a-f0-9]+['"]? was not found on the server/i.test(raw)) {
    return `${context} Открыта старая версия страницы относительно сервера (часто сразу после деплоя). Сделайте жёсткое обновление: Ctrl+Shift+R или Cmd+Shift+R, либо откройте админку в новой вкладке. При нескольких инстансах задайте DEPLOYMENT_VERSION при сборке — см. nextjs-project/docs/DEPLOY.md.`;
  }
  if (/failed to find server action/i.test(raw)) {
    return `${context} Устаревший кэш после обновления сервера. Жёсткое обновление страницы (Ctrl+Shift+R / Cmd+Shift+R).`;
  }
  if (/An error occurred in the Server Components render/i.test(raw)) {
    return `${context} Next.js скрыл детали (часто — сбой сериализации ответа Server Action или слишком большой payload). Список категорий после сохранения подгружается отдельным запросом; если ошибка повторяется — проверьте логи сервера по digest и лимит тела запроса (см. serverActions.bodySizeLimit в next.config).`;
  }
  return `${context} ${raw}`;
}

interface CategoryFormState {
  title: string;
  pageTitle: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  image: string;
  imageAlt: string;
  sortOrder: number;
  parentId: string;
  isPublished: boolean;
  showInCategoriesBlock: boolean;
  catalogTeaser: string;
  featuredProductId: string;
  linePageBodyRichJson: JSONContent;
  showLegacyLinePageBlocks: boolean;
}

interface CategoryRowProps {
  category: Category;
  categoryNode: FlatCategoryTreeNode;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (category: Category) => void;
  isVisibilityPending: boolean;
}

function CategoryRow({
  category,
  categoryNode,
  onEdit,
  onDelete,
  onToggleVisibility,
  isVisibilityPending,
}: CategoryRowProps) {
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
            <Drag className="w-5 h-5" />
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
              <span>{category.isPublished ? 'Опубликована' : 'Скрыта'}</span>
              <span>сортировка: {category.sortOrder ?? 0}</span>
              <span title="Показывать в блоке категорий на главной">
                {category.showInCategoriesBlock ? 'На витрине' : 'Скрыта с витрины'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleVisibility(category)}
            disabled={isVisibilityPending}
            className={cn(
              category.showInCategoriesBlock
                ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            )}
          >
            {isVisibilityPending
              ? 'Сохранение…'
              : category.showInCategoriesBlock
                ? 'Скрыть'
                : 'Показать'}
          </Button>
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
  const activeBrand = useAdminBrand();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormState>({
    title: '',
    pageTitle: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    image: '',
    imageAlt: '',
    sortOrder: 0,
    parentId: '',
    isPublished: true,
    showInCategoriesBlock: true,
    catalogTeaser: '',
    featuredProductId: '',
    linePageBodyRichJson: EMPTY_LINE_DOC,
    showLegacyLinePageBlocks: false,
  });
  /** Только ошибка первичной загрузки списка — полноэкранный блок */
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Ошибки сохранения / удаления / порядка — баннер, список остаётся доступен */
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibilityPendingId, setVisibilityPendingId] = useState<string | null>(null);

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

  const migrationHint = (message: string): string =>
    /column .+ does not exist|Unknown column|P2022/i.test(message) ||
    /catalogTeaser|linePageBodyRichJson|featuredProductId|showLegacyLinePageBlocks|pageTitle|seoTitle|seoDescription|seoKeywords|imageAlt|isPublished/i.test(message)
      ? ' Похоже, не применена миграция БД (поля категории Sprint). Выполните prisma migrate deploy.'
      : '';

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setActionError(null);
      const cats = await getCategories({ brandId: activeBrand });
      setCategories(cats);
    } catch (error) {
      console.error('Error fetching categories:', error);
      const msg = error instanceof Error ? error.message : String(error);
      setLoadError(`Не удалось загрузить категории.${migrationHint(msg)}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** После create/update без тяжёлого ответа action — снижает риск ошибки сериализации Flight. */
  const refetchCategoriesSilent = async (): Promise<void> => {
    try {
      const cats = await getCategories({ brandId: activeBrand });
      setCategories(cats);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Не удалось обновить список категорий.${migrationHint(msg)}`);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, [activeBrand]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory(
        {
          title: formData.title,
          pageTitle: formData.pageTitle.trim() || null,
          slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
          seoTitle: formData.seoTitle.trim() || null,
          seoDescription: formData.seoDescription.trim() || null,
          seoKeywords: formData.seoKeywords.trim() || null,
          image: formData.image,
          imageAlt: formData.imageAlt.trim() || null,
          sortOrder: formData.sortOrder,
          parentId: formData.parentId || null,
          isPublished: formData.isPublished,
          showInCategoriesBlock: formData.showInCategoriesBlock,
          linePageBodyRichJson: isEmptyLineDoc(formData.linePageBodyRichJson)
            ? undefined
            : lineDocToJsonValue(formData.linePageBodyRichJson),
          ...(activeBrand === 'sprint-power'
            ? {
                catalogTeaser: formData.catalogTeaser.trim() || null,
                featuredProductId: formData.featuredProductId.trim() || null,
                showLegacyLinePageBlocks: formData.showLegacyLinePageBlocks,
              }
            : {}),
        },
        { brandId: activeBrand }
      );

      await refetchCategoriesSilent();
      setFormData({
        title: '',
        pageTitle: '',
        slug: '',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        image: '',
        imageAlt: '',
        sortOrder: 0,
        parentId: '',
        isPublished: true,
        showInCategoriesBlock: true,
        catalogTeaser: '',
        featuredProductId: '',
        linePageBodyRichJson: EMPTY_LINE_DOC,
        showLegacyLinePageBlocks: false,
      });
      setIsCreating(false);
      setActionError(null);
    } catch (error) {
      console.error('Error creating category:', error);
      setActionError(formatCategoryActionError('Ошибка при создании категории:', error));
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    try {
      await updateCategory(
        editingCategory.id,
        {
          title: formData.title,
          pageTitle: formData.pageTitle.trim() || null,
          slug: formData.slug,
          seoTitle: formData.seoTitle.trim() || null,
          seoDescription: formData.seoDescription.trim() || null,
          seoKeywords: formData.seoKeywords.trim() || null,
          image: formData.image,
          imageAlt: formData.imageAlt.trim() || null,
          sortOrder: formData.sortOrder,
          parentId: formData.parentId || null,
          isPublished: formData.isPublished,
          showInCategoriesBlock: formData.showInCategoriesBlock,
          linePageBodyRichJson: isEmptyLineDoc(formData.linePageBodyRichJson)
            ? null
            : lineDocToJsonValue(formData.linePageBodyRichJson),
          ...(activeBrand === 'sprint-power'
            ? {
                catalogTeaser: formData.catalogTeaser.trim() || null,
                featuredProductId: formData.featuredProductId.trim() || null,
                showLegacyLinePageBlocks: formData.showLegacyLinePageBlocks,
              }
            : {}),
        },
        { brandId: activeBrand }
      );

      await refetchCategoriesSilent();
      setEditingCategory(null);
      setFormData({
        title: '',
        pageTitle: '',
        slug: '',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
        image: '',
        imageAlt: '',
        sortOrder: 0,
        parentId: '',
        isPublished: true,
        showInCategoriesBlock: true,
        catalogTeaser: '',
        featuredProductId: '',
        linePageBodyRichJson: EMPTY_LINE_DOC,
        showLegacyLinePageBlocks: false,
      });
      setActionError(null);
    } catch (error) {
      console.error('Error updating category:', error);
      setActionError(formatCategoryActionError('Ошибка при обновлении категории:', error));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return;
    try {
      await deleteCategory(id, { brandId: activeBrand });
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      setActionError(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      setActionError(formatCategoryActionError('Ошибка при удалении категории:', error));
    }
  };

  const handleToggleCategoryVisibility = async (category: Category) => {
    try {
      setVisibilityPendingId(category.id);
      await updateCategory(
        category.id,
        {
          showInCategoriesBlock: !(category.showInCategoriesBlock ?? true),
        },
        { brandId: activeBrand }
      );
      setCategories((prev) =>
        prev.map((item) =>
          item.id === category.id
            ? { ...item, showInCategoriesBlock: !(category.showInCategoriesBlock ?? true) }
            : item
        )
      );
      setActionError(null);
    } catch (error) {
      console.error('Error toggling category visibility:', error);
      setActionError(formatCategoryActionError('Ошибка изменения видимости категории:', error));
    } finally {
      setVisibilityPendingId(null);
    }
  };

  const handleEditCategory = (category: Category) => {
    setActionError(null);
    setEditingCategory(category);
    const rawLine = category.linePageBodyRichJson;
    let lineDoc: JSONContent = EMPTY_LINE_DOC;
    if (rawLine && typeof rawLine === 'object' && !Array.isArray(rawLine)) {
      const obj = rawLine as { type?: string; content?: JSONContent[] };
      if (obj.type === 'doc' && Array.isArray(obj.content)) {
        lineDoc = rawLine as JSONContent;
      }
    }
    if (isEmptyLineDoc(lineDoc)) {
      lineDoc = getCategoryPageContentDoc(category.slug, activeBrand) ?? EMPTY_LINE_DOC;
    }
    setFormData({
      title: category.title,
      pageTitle: category.pageTitle ?? '',
      slug: category.slug,
      seoTitle: category.seoTitle ?? '',
      seoDescription: category.seoDescription ?? '',
      seoKeywords: category.seoKeywords ?? '',
      image: category.image || '',
      imageAlt: category.imageAlt ?? '',
      sortOrder: category.sortOrder || 0,
      parentId: category.parentId || '',
      isPublished: category.isPublished ?? true,
      showInCategoriesBlock: category.showInCategoriesBlock ?? true,
      catalogTeaser: category.catalogTeaser ?? '',
      featuredProductId: category.featuredProductId ?? '',
      linePageBodyRichJson: lineDoc,
      showLegacyLinePageBlocks: category.showLegacyLinePageBlocks ?? false,
    });
  };

  const handleCancelEdit = () => {
    setActionError(null);
    setEditingCategory(null);
    setFormData({
      title: '',
      pageTitle: '',
      slug: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      image: '',
      imageAlt: '',
      sortOrder: 0,
      parentId: '',
      isPublished: true,
      showInCategoriesBlock: true,
      catalogTeaser: '',
      featuredProductId: '',
      linePageBodyRichJson: EMPTY_LINE_DOC,
      showLegacyLinePageBlocks: false,
    });
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
        await updateCategoriesSortOrder(updates, { brandId: activeBrand });
        setCategories((prev) =>
          prev.map((c) => {
            const u = updates.find((x) => x.id === c.id);
            return u ? { ...c, sortOrder: u.sortOrder } : c;
          })
        );
      } catch (err) {
        console.error('Error reordering categories:', err);
        setActionError(formatCategoryActionError('Ошибка сохранения порядка:', err));
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

  if (loadError) {
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
              <p className="font-medium">Не удалось загрузить категории</p>
              <p className="text-sm">{loadError}</p>
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
        {actionError ? (
          <div className="alert error mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm">{actionError}</p>
            <button
              type="button"
              className="shrink-0 text-sm font-medium text-red-800 underline hover:no-underline"
              onClick={() => setActionError(null)}
            >
              Закрыть
            </button>
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div></div>
          <Button variant="primary"
            onClick={() => {
              setActionError(null);
              setIsCreating(true);
            }}
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
              <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Основное</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название категории
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="form-input"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Используется в меню и списках.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    H1 страницы
                  </label>
                  <input
                    type="text"
                    value={formData.pageTitle}
                    onChange={(e) => setFormData({...formData, pageTitle: e.target.value})}
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-gray-500">Основной заголовок страницы. Если пусто, используется название категории.</p>
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

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Опубликована</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    id="showInCategoriesBlock"
                    checked={formData.showInCategoriesBlock ?? true}
                    onChange={(e) => setFormData({ ...formData, showInCategoriesBlock: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Показывать в блоке «Разделы каталога» на главной</span>
                </label>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Изображение</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Фото для карточки на главной
                  </label>
                  <CoverImageDropzone
                    value={formData.image}
                    onChange={(url) => setFormData({ ...formData, image: url })}
                    folder="categories"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Перетащите файл с компьютера или нажмите для выбора. Без фото карточка отобразится без фона.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alt изображения
                  </label>
                  <input
                    type="text"
                    value={formData.imageAlt}
                    onChange={(e) => setFormData({...formData, imageAlt: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">SEO</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Title
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({...formData, seoTitle: e.target.value})}
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-gray-500">Заголовок страницы в поисковой выдаче. Рекомендуемо около 50–65 символов.</p>
                  <p className="mt-1 text-xs text-gray-400">{formData.seoTitle.trim().length} символов</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Description
                  </label>
                  <textarea
                    value={formData.seoDescription}
                    onChange={(e) => setFormData({...formData, seoDescription: e.target.value})}
                    className="form-input min-h-[96px]"
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-gray-500">Описание страницы в поисковой выдаче. Рекомендуемо около 120–170 символов.</p>
                  <p className="mt-1 text-xs text-gray-400">{formData.seoDescription.trim().length} символов</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.seoKeywords}
                    onChange={(e) => setFormData({...formData, seoKeywords: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">Контент страницы</h3>

              {activeBrand === 'sprint-power' ? (
                <>
                  <p className="text-xs text-slate-700 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 leading-relaxed">
                    Ниже — Sprint-специфичные поля для главной и страницы категории. Для Inner Health из этого блока не используются тизер, товар линейки и переключатель старых блоков.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тизер для главной (блок «Вся линейка»)
                    </label>
                    <textarea
                      value={formData.catalogTeaser}
                      onChange={(e) => setFormData({ ...formData, catalogTeaser: e.target.value })}
                      className="form-input min-h-[72px]"
                      rows={3}
                      placeholder="Короткий текст под названием на главной Sprint. Если пусто — показывается число товаров."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID товара для блока «купить» на странице категории
                    </label>
                    <input
                      type="text"
                      value={formData.featuredProductId}
                      onChange={(e) => setFormData({ ...formData, featuredProductId: e.target.value })}
                      className="form-input font-mono text-sm"
                      placeholder="cuid из админки товара"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Товар должен быть уже привязан к этой категории. Оставьте пустым, если блок не нужен.
                    </p>
                  </div>

                  <div>
                    <label className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.showLegacyLinePageBlocks}
                        onChange={(e) =>
                          setFormData({ ...formData, showLegacyLinePageBlocks: e.target.checked })
                        }
                        className="mt-1 rounded border-gray-300"
                      />
                      <span>
                        <span className="font-medium text-gray-800">
                          Показать старые захардкоженные блоки (откат)
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          Bento-коллажи, сетки BCAA/Collagen, экраны Hydro/Nutrient/BoneBroth. По
                          умолчанию выключено — контент только из редактора ниже.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Текст под сеткой каталога (страница категории)
                    </label>
                    <SprintCategoryLineEditor
                      key={editingCategory?.id ?? (isCreating ? 'create' : 'idle')}
                      value={formData.linePageBodyRichJson}
                      onChange={(next) => setFormData({ ...formData, linePageBodyRichJson: next })}
                      placeholder="Описание линейки, таблицы, юридические абзацы…"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текст под сеткой каталога (страница категории)
                  </label>
                  <SprintCategoryLineEditor
                    key={editingCategory?.id ?? (isCreating ? 'create' : 'idle')}
                    value={formData.linePageBodyRichJson}
                    onChange={(next) => setFormData({ ...formData, linePageBodyRichJson: next })}
                    placeholder="Заголовок, списки и абзацы для нижнего блока категории…"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Старый текст из кода подставится сюда при открытии категории. После сохранения этот блок будет редактироваться уже из админки.
                  </p>
                </div>
              )}
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
                      onToggleVisibility={handleToggleCategoryVisibility}
                      isVisibilityPending={visibilityPendingId === category.id}
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
