#!/usr/bin/env node

/**
 * Расширенный скрипт для тестирования адаптивной системы
 * 
 * Проверяет:
 * - Конфигурацию Tailwind (брейкпоинты, контейнеры)
 * - CSS-переменные адаптивности
 * - Наличие адаптивных компонентов
 * - Систему токенов adaptive-tokens.ts
 * - Хуки адаптивности
 * - Навигационные компоненты
 * 
 * Использование:
 *   node scripts/test-adaptive-enhanced.js
 * 
 * С флагом --verbose:
 *   node scripts/test-adaptive-enhanced.js --verbose
 */

const fs = require('fs');
const path = require('path');

const VERBOSE = process.argv.includes('--verbose');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ✅ ${message}`, 'green');
}

function logError(message) {
  log(`  ❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  if (VERBOSE) {
    log(`  ℹ️  ${message}`, 'cyan');
  }
}

function logSection(title) {
  log(`\n${'='.repeat(50)}`, 'blue');
  log(`📋 ${title}`, 'blue');
  log('='.repeat(50), 'blue');
}

// Счетчики
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function check(condition, successMsg, failMsg, warnMsg = null) {
  totalChecks++;
  if (condition) {
    logSuccess(successMsg);
    passedChecks++;
  } else {
    if (warnMsg) {
      logWarning(warnMsg);
      warnings++;
    } else {
      logError(failMsg);
      failedChecks++;
    }
  }
  return condition;
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function readFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

// ============================================
// 1. ПРОВЕРКА КОНФИГУРАЦИИ TAILWIND
// ============================================
function checkTailwindConfig() {
  logSection('Конфигурация Tailwind');

  const content = readFile('../tailwind.config.js');
  if (!content) {
    logError('Файл tailwind.config.js не найден');
    failedChecks++;
    return;
  }

  // Проверка кастомных screens
  const hasMobile = content.includes("'mobile'");
  const hasTablet = content.includes("'tablet'");
  const hasDesktop = content.includes("'desktop'");

  check(hasMobile, 'Брейкпоинт mobile (320px)', 'Отсутствует брейкпоинт mobile');
  check(hasTablet, 'Брейкпоинт tablet (768px)', 'Отсутствует брейкпоинт tablet');
  check(hasDesktop, 'Брейкпоинт desktop (1024px)', 'Отсутствует брейкпоинт desktop');

  // Проверка кастомных цветов
  const hasActionBlue = content.includes("'action-blue'");
  const hasSoftBackground = content.includes("'soft-background'");

  check(hasActionBlue, 'Кастомный цвет action-blue', 'Отсутствует цвет action-blue');
  check(hasSoftBackground, 'Кастомный цвет soft-background', 'Отсутствует цвет soft-background');

  // Проверка кастомных fontSize
  const has2xs = content.includes("'2xs'");

  check(has2xs, 'Кастомный размер шрифта 2xs (10px)', 'Отсутствует размер 2xs');

  logInfo(`Размер файла: ${content.length} байт`);
}

// ============================================
// 2. ПРОВЕРКА CSS-ПЕРЕМЕННЫХ
// ============================================
function checkCSSVariables() {
  logSection('CSS-переменные');

  const content = readFile('../src/app/globals.css');
  if (!content) {
    logError('Файл globals.css не найден');
    failedChecks++;
    return;
  }

  // Проверка основных CSS-переменных
  const variables = [
    { name: '--scale-3xl', pattern: /--scale-3xl:\s*1\.15/ },
    { name: '--scale-4xl', pattern: /--scale-4xl:\s*1\.2/ },
    { name: '--container-3xl', pattern: /--container-3xl/ },
    { name: '--container-4xl', pattern: /--container-4xl/ },
  ];

  variables.forEach(({ name, pattern }) => {
    const found = pattern.test(content);
    check(found, `CSS-переменная ${name}`, `Отсутствует ${name}`);
  });

  // Проверка медиа-запросов для больших экранов
  const has3xlMedia = content.includes('@media (min-width: 1920px)') || 
                       content.includes('@media (min-width: 120rem)');
  const has4xlMedia = content.includes('@media (min-width: 2560px)') || 
                       content.includes('@media (min-width: 160rem)');

  check(has3xlMedia, 'Медиа-запрос для 3xl (1920px)', 'Отсутствует медиа-запрос для 3xl', 'Рекомендуется добавить');
  check(has4xlMedia, 'Медиа-запрос для 4xl (2560px)', 'Отсутствует медиа-запрос для 4xl', 'Рекомендуется добавить');
}

// ============================================
// 3. ПРОВЕРКА СИСТЕМЫ ТОКЕНОВ
// ============================================
function checkAdaptiveTokens() {
  logSection('Система токенов (adaptive-tokens.ts)');

  const content = readFile('../src/lib/adaptive-tokens.ts');
  if (!content) {
    logError('Файл adaptive-tokens.ts не найден');
    failedChecks++;
    return;
  }

  // Проверка структуры токенов
  const structures = [
    { name: 'breakpoints', pattern: /breakpoints:\s*\{/ },
    { name: 'containerWidths', pattern: /containerWidths:\s*\{/ },
    { name: 'containerFixedWidths', pattern: /containerFixedWidths:\s*\{/ },
    { name: 'scaleFactors', pattern: /scaleFactors:\s*\{/ },
    { name: 'typography', pattern: /typography:\s*\{/ },
    { name: 'spacing', pattern: /spacing:\s*\{/ },
    { name: 'colors', pattern: /colors:\s*\{/ },
    { name: 'shadows', pattern: /shadows:\s*\{/ },
  ];

  structures.forEach(({ name, pattern }) => {
    const found = pattern.test(content);
    check(found, `Структура ${name}`, `Отсутствует структура ${name}`);
  });

  // Проверка функций
  const functions = [
    { name: 'getContainerWidth', pattern: /export function getContainerWidth/ },
    { name: 'getScaledSize', pattern: /export function getScaledSize/ },
    { name: 'generateCSSVariables', pattern: /export function generateCSSVariables/ },
    { name: 'useAdaptiveTokens', pattern: /export function useAdaptiveTokens/ },
  ];

  functions.forEach(({ name, pattern }) => {
    const found = pattern.test(content);
    check(found, `Функция ${name}`, `Отсутствует функция ${name}`);
  });

  // Проверка типов
  const hasTypes = content.includes('export type Breakpoint') && 
                   content.includes('export type ContainerWidth') &&
                   content.includes('export type ScaleFactor');

  check(hasTypes, 'TypeScript типы экспортированы', 'Отсутствуют TypeScript типы');
}

// ============================================
// 4. ПРОВЕРКА ХУКОВ
// ============================================
function checkHooks() {
  logSection('Хуки адаптивности');

  // use-overlap-detection
  const overlapContent = readFile('../src/hooks/use-overlap-detection.ts');
  if (overlapContent) {
    const hasUseOverlapDetection = overlapContent.includes('export function useOverlapDetection');
    const hasUseMediaConflict = overlapContent.includes('export function useMediaConflictDetection');
    const hasResizeObserver = overlapContent.includes('ResizeObserver');

    check(hasUseOverlapDetection, 'Хук useOverlapDetection', 'Отсутствует хук useOverlapDetection');
    check(hasUseMediaConflict, 'Хук useMediaConflictDetection', 'Отсутствует хук useMediaConflictDetection');
    check(hasResizeObserver, 'Использование ResizeObserver', 'Не используется ResizeObserver');
  } else {
    logError('Файл use-overlap-detection.ts не найден');
    failedChecks++;
  }

  // use-mounted
  const mountedContent = readFile('../src/hooks/use-mounted.ts');
  check(!!mountedContent, 'Хук use-mounted существует', 'Отсутствует хук use-mounted');
}

// ============================================
// 5. ПРОВЕРКА КОМПОНЕНТОВ
// ============================================
function checkComponents() {
  logSection('Адаптивные компоненты');

  const components = [
    { path: '../src/components/site/site-header.tsx', name: 'SiteHeader' },
    { path: '../src/components/site/header-nav-mobile.tsx', name: 'HeaderNavMobile' },
    { path: '../src/components/site/adaptive-nav.tsx', name: 'AdaptiveNav' },
    { path: '../src/components/site/site-footer.tsx', name: 'SiteFooter' },
  ];

  components.forEach(({ path: filePath, name }) => {
    const content = readFile(filePath);
    if (content) {
      logSuccess(`Компонент ${name} существует`);
      passedChecks++;
    } else {
      logError(`Компонент ${name} не найден`);
      failedChecks++;
    }
    totalChecks++;
  });

  // Проверка адаптивных классов в компонентах
  const headerContent = readFile('../src/components/site/site-header.tsx');
  if (headerContent) {
    const hasResponsiveClasses = 
      headerContent.includes('xl:') || 
      headerContent.includes('lg:') || 
      headerContent.includes('md:') ||
      headerContent.includes('sm:');

    check(hasResponsiveClasses, 'SiteHeader использует адаптивные классы', 'SiteHeader не использует адаптивные классы');
  }

  const mobileNavContent = readFile('../src/components/site/header-nav-mobile.tsx');
  if (mobileNavContent) {
    const hasXlHidden = mobileNavContent.includes('xl:hidden');
    const hasMinWidth = mobileNavContent.includes('min-w-[');

    check(hasXlHidden, 'HeaderNavMobile скрывается на xl+', 'HeaderNavMobile не скрывается на xl+');
    check(hasMinWidth, 'HeaderNavMobile использует min-width для touch targets', 'Рекомендуется добавить min-width для touch targets', 'Рекомендация');
  }
}

// ============================================
// 6. ПРОВЕРКА ТЕСТОВ
// ============================================
function checkTests() {
  logSection('Тесты адаптивности');

  // Playwright тесты
  const playwrightTests = readFile('../../tests/adaptive/adaptive.spec.ts');
  if (playwrightTests) {
    const hasBreakpointTests = playwrightTests.includes('BREAKPOINTS');
    const hasNavigationTests = playwrightTests.includes('Навигация');
    const hasContainerTests = playwrightTests.includes('Контейнер');
    const hasScreenshotTests = playwrightTests.includes('Скриншот');

    check(hasBreakpointTests, 'Playwright: тесты брейкпоинтов', 'Отсутствуют тесты брейкпоинтов');
    check(hasNavigationTests, 'Playwright: тесты навигации', 'Отсутствуют тесты навигации');
    check(hasContainerTests, 'Playwright: тесты контейнеров', 'Отсутствуют тесты контейнеров');
    check(hasScreenshotTests, 'Playwright: скриншотные тесты', 'Отсутствуют скриншотные тесты');
  } else {
    logWarning('Playwright тесты не найдены');
    warnings++;
  }

  // Vitest тесты
  const vitestTokens = readFile('../src/lib/adaptive-tokens.test.ts');
  check(!!vitestTokens, 'Vitest: тесты adaptive-tokens', 'Отсутствуют тесты adaptive-tokens');

  const vitestHooks = readFile('../src/hooks/use-overlap-detection.test.ts');
  check(!!vitestHooks, 'Vitest: тесты use-overlap-detection', 'Отсутствуют тесты use-overlap-detection');
}

// ============================================
// 7. ПРОВЕРКА ТЕСТОВОЙ СТРАНИЦЫ
// ============================================
function checkTestPage() {
  logSection('Тестовая страница');

  const pageContent = readFile('../src/app/test/adaptive/page.tsx');
  if (pageContent) {
    const hasViewportInfo = pageContent.includes('ViewportInfo');
    const hasBreakpointsTable = pageContent.includes('BreakpointsTable');
    const hasScaleFactors = pageContent.includes('ScaleFactorsDemo');
    const hasGridDemo = pageContent.includes('GridDemo');
    const hasNavigationDemo = pageContent.includes('NavigationDemo');

    check(hasViewportInfo, 'Секция ViewportInfo', 'Отсутствует секция ViewportInfo');
    check(hasBreakpointsTable, 'Секция BreakpointsTable', 'Отсутствует секция BreakpointsTable');
    check(hasScaleFactors, 'Секция ScaleFactorsDemo', 'Отсутствует секция ScaleFactorsDemo');
    check(hasGridDemo, 'Секция GridDemo', 'Отсутствует секция GridDemo');
    check(hasNavigationDemo, 'Секция NavigationDemo', 'Отсутствует секция NavigationDemo');
  } else {
    logWarning('Тестовая страница /test/adaptive не найдена');
    warnings++;
  }
}

// ============================================
// 8. ПРОВЕРКА КОНФИГУРАЦИИ ТЕСТОВ
// ============================================
function checkTestConfig() {
  logSection('Конфигурация тестов');

  const playwrightConfig = readFile('../../playwright.config.ts');
  if (playwrightConfig) {
    const hasProjects = playwrightConfig.includes('projects:');
    const hasChromium = playwrightConfig.includes('chromium');

    check(hasProjects, 'Playwright: настроены projects', 'Не настроены projects в Playwright');
    check(hasChromium, 'Playwright: проект chromium', 'Отсутствует проект chromium');
  } else {
    logWarning('playwright.config.ts не найден');
    warnings++;
  }

  const vitestConfig = readFile('../vitest.config.ts');
  if (vitestConfig) {
    const hasJsdom = vitestConfig.includes('jsdom');
    const hasSetupFiles = vitestConfig.includes('setupFiles');

    check(hasJsdom, 'Vitest: настроен jsdom environment', 'Не настроен jsdom environment');
    check(hasSetupFiles, 'Vitest: настроены setupFiles', 'Не настроены setupFiles');
  } else {
    logWarning('vitest.config.ts не найден');
    warnings++;
  }
}

// ============================================
// ИТОГОВЫЙ ОТЧЕТ
// ============================================
function printSummary() {
  logSection('Итоговый отчет');

  log(`\n📊 Всего проверок: ${totalChecks}`, 'cyan');
  log(`✅ Пройдено: ${passedChecks}`, 'green');
  log(`❌ Провалено: ${failedChecks}`, 'red');
  log(`⚠️  Предупреждений: ${warnings}`, 'yellow');

  const successRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0;
  log(`\n📈 Успешность: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');

  if (failedChecks === 0) {
    log('\n🎉 Все критические проверки пройдены успешно!', 'green');
  } else {
    log(`\n⚠️  Есть ${failedChecks} критических проблем, требующих внимания.`, 'yellow');
  }

  // Рекомендации
  if (warnings > 0) {
    log('\n💡 Рекомендации:', 'cyan');
    log('   • Добавьте недостающие медиа-запросы для больших экранов');
    log('   • Настройте Playwright для запуска адаптивных тестов');
    log('   • Добавьте скриншотные тесты для визуальной регрессии');
  }
}

// ============================================
// ЗАПУСК
// ============================================
function main() {
  log('\n🧪 Тестирование адаптивной системы Inner Health', 'blue');
  log('━'.repeat(50), 'dim');

  checkTailwindConfig();
  checkCSSVariables();
  checkAdaptiveTokens();
  checkHooks();
  checkComponents();
  checkTests();
  checkTestPage();
  checkTestConfig();

  printSummary();

  // Exit code
  process.exit(failedChecks > 0 ? 1 : 0);
}

main();
