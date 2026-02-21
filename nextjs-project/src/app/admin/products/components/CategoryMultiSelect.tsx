'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  title: string;
  slug: string;
}

interface CategoryMultiSelectProps {
  selectedCategoryIds: string[];
  onCategoryChange: (categoryIds: string[]) => void;
  categories?: Category[] | null;
}

export function CategoryMultiSelect({ 
  selectedCategoryIds, 
  onCategoryChange,
  categories = []
}: CategoryMultiSelectProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedCategoryIds);

  useEffect(() => {
    setLocalSelected(selectedCategoryIds);
  }, [selectedCategoryIds]);

  const toggleCategory = (categoryId: string) => {
    const newSelected = localSelected.includes(categoryId)
      ? localSelected.filter(id => id !== categoryId)
      : [...localSelected, categoryId];
    
    setLocalSelected(newSelected);
    onCategoryChange(newSelected);
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Категории
      </label>
      <div className="flex flex-wrap gap-2">
        {(categories ?? []).map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => toggleCategory(category.id)}
            className={`px-3 py-1 rounded-full text-sm ${
              localSelected.includes(category.id)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>
    </div>
  );
}