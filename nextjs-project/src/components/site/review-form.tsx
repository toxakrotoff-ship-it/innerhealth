'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  onSuccess?: () => void;
  isSprintTheme?: boolean;
}

export function ReviewForm({ onSuccess, isSprintTheme = false }: ReviewFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.set('authorName', authorName.trim());
      formData.set('socialLink', socialLink.trim());
      formData.set('text', text.trim());
      if (file) formData.set('photo', file);

      const res = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { error?: string } | { success?: boolean };

      if (res.ok) {
        setStatus('success');
        setAuthorName('');
        setSocialLink('');
        setText('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage('error' in data ? data.error : 'Произошла ошибка');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Ошибка сети. Попробуйте позже.');
    }
  };

  if (status === 'success') {
    return (
      <div
        className={cn(
          'rounded-2xl border p-8 text-center',
          isSprintTheme
            ? 'border-emerald-600/40 bg-emerald-500/10'
            : 'border-gray-200 bg-green-50/80'
        )}
      >
        <p className={cn('text-lg font-medium', isSprintTheme ? 'text-emerald-300' : 'text-green-800')}>
          Спасибо! Ваш отзыв отправлен и скоро появится на странице.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6 2xl:space-y-7 3xl:space-y-8">
      <div>
        <label
          htmlFor="review-authorName"
          className={cn('mb-1.5 block text-sm font-medium', isSprintTheme ? 'text-slate-300' : 'text-gray-700')}
        >
          Имя <span className="text-red-500">*</span>
        </label>
        <Input
          id="review-authorName"
          type="text"
          required
          placeholder="Ваше имя"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          disabled={status === 'loading'}
          maxLength={120}
          className={cn(
            'w-full',
            isSprintTheme &&
              'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#7AA2FF] focus-visible:ring-offset-[#0F172A]'
          )}
        />
      </div>
      <div>
        <label
          htmlFor="review-socialLink"
          className={cn('mb-1.5 block text-sm font-medium', isSprintTheme ? 'text-slate-300' : 'text-gray-700')}
        >
          Ссылка на профиль в соцсети
        </label>
        <Input
          id="review-socialLink"
          type="url"
          placeholder="https://t.me/username или ссылка на Instagram, VK и т.д."
          value={socialLink}
          onChange={(e) => setSocialLink(e.target.value)}
          disabled={status === 'loading'}
          className={cn(
            'w-full',
            isSprintTheme &&
              'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#7AA2FF] focus-visible:ring-offset-[#0F172A]'
          )}
        />
      </div>
      <div>
        <label
          htmlFor="review-text"
          className={cn('mb-1.5 block text-sm font-medium', isSprintTheme ? 'text-slate-300' : 'text-gray-700')}
        >
          Ваш отзыв <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="review-text"
          required
          placeholder="Расскажите о вашем опыте"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={status === 'loading'}
          rows={5}
          minLength={10}
          maxLength={3000}
          className={cn(
            'w-full resize-y',
            isSprintTheme &&
              'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus-visible:ring-[#7AA2FF] focus-visible:ring-offset-[#0F172A]'
          )}
        />
      </div>
      <div>
        <label
          htmlFor="review-photo"
          className={cn('mb-1.5 block text-sm font-medium', isSprintTheme ? 'text-slate-300' : 'text-gray-700')}
        >
          Фото (по желанию)
        </label>
        <input
          ref={fileInputRef}
          id="review-photo"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={status === 'loading'}
          className={cn(
            'flex h-10 w-full rounded-[16px] border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium',
            isSprintTheme &&
              'border-slate-600 bg-slate-900 text-slate-200 file:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7AA2FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]'
          )}
        />
        {file && (
          <p className={cn('mt-1 text-sm text-muted-foreground', isSprintTheme && 'text-slate-400')}>
            Выбрано: {file.name} ({(file.size / 1024).toFixed(1)} КБ)
          </p>
        )}
      </div>
      {errorMessage && (
        <p className={cn('text-sm', isSprintTheme ? 'text-red-300' : 'text-red-600')} role="alert">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        disabled={status === 'loading'}
        className={cn(
          'w-full sm:w-auto',
          isSprintTheme && 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]'
        )}
      >
        {status === 'loading' ? 'Отправка…' : 'Отправить отзыв'}
      </Button>
    </form>
  );
}
