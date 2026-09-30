import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Node's experimental localStorage can exist without the Storage methods used by tests.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const items = new Map<string, string>();
  const storage: Storage = {
    get length() { return items.size; },
    clear() { items.clear(); },
    getItem(key) { return items.get(key) ?? null; },
    key(index) { return Array.from(items.keys())[index] ?? null; },
    removeItem(key) { items.delete(key); },
    setItem(key, value) { items.set(key, String(value)); },
  };
  vi.stubGlobal('localStorage', storage);
}

// Avoid Prisma/DB init errors when testing API routes that pull in server deps
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://fake:fake@localhost:5432/fake";
}

// DOM-related mocks only when window is available (jsdom environment)
if (typeof window !== 'undefined') {
  // Мокаем ResizeObserver для тестов адаптивности
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Мокаем matchMedia для тестов медиа-запросов
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Мокаем getComputedStyle для тестов
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = (element: Element) => {
    const style = originalGetComputedStyle(element);
    return {
      ...style,
      display: style.display || 'block',
      visibility: style.visibility || 'visible',
      opacity: style.opacity || '1',
    } as CSSStyleDeclaration;
  };
}
