'use client';

import { useState } from 'react';
import { importProductsFromCSV } from './actions';
import Button from '@/components/ui/button';

export default function ImportFromCSVPage() {
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Функция для импорта данных из CSV
  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      setError('Пожалуйста, введите содержимое CSV');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const result = await importProductsFromCSV(csvContent);
      
      if (result.success) {
        setImportResult(result.message);
      } else {
        setError(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка импорта CSV:', error);
      setError('Ошибка при импорте данных');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Импорт товаров из CSV</h1>
      
      <div className="alert warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="font-medium">Важно</p>
          <p className="text-sm">Введите содержимое CSV файла ниже. Файл должен содержать заголовок и данные в формате, соответствующем Facebook Feed.</p>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="csvContent" className="block text-sm font-medium text-gray-700 mb-1">
          Содержимое CSV файла
        </label>
        <textarea
          id="csvContent"
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder="Вставьте содержимое CSV файла здесь..."
          rows={15}
          className="form-textarea"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <Button variant={isImporting || !csvContent.trim() ? "secondary" : "primary"}
          onClick={handleImportCSV}
          disabled={isImporting || !csvContent.trim()}
        >
          {isImporting ? 'Импорт...' : 'Импортировать товары'}
        </Button>
        
        <Button variant="secondary"
          onClick={() => {
            setCsvContent('');
            setError(null);
            setImportResult(null);
          }}
        >
          Очистить
        </Button>
      </div>

      {error && (
        <div className="mt-6 alert error">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Ошибка импорта</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {importResult && (
        <div className="mt-6 alert success">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">Импорт завершен успешно!</p>
            <p className="text-sm">{importResult}</p>
          </div>
        </div>
      )}
    </div>
  );
}
