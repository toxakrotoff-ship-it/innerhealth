'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/button';

interface ImportSectionProps {
  onImportSuccess: () => void;
}

export function ImportSection({ onImportSuccess }: ImportSectionProps) {
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      setError('Пожалуйста, загрузите или введите содержимое CSV');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setError(null);

    try {
      // Имитация вызова серверного действия
      // В реальном приложении здесь будет вызов importProductsFromCSV
      
      // Для демонстрации просто имитируем успешный импорт
      setImportResult('Импорт завершен успешно!');
      onImportSuccess(); // Refresh product list
    } catch (err) {
      console.error('Ошибка импорта CSV:', err);
      setError('Ошибка при импорте данных');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="import-section">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Импорт товаров</h3>
      <p className="text-gray-600 mb-4">Загрузите CSV файл для импорта товаров</p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Загрузить CSV файл
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="form-input"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="csvContent" className="block text-sm font-medium text-gray-700 mb-2">
          Или вставить содержимое CSV
        </label>
        <textarea
          id="csvContent"
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          placeholder="Вставьте содержимое CSV файла здесь..."
          rows={10}
          className="form-textarea"
        />
      </div>

      <div className="flex space-x-3">
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
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
        >
          Очистить
        </Button>
      </div>

      {error && (
        <div className="mt-4 alert error">
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
        <div className="mt-4 alert success">
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