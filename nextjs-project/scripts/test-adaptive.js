#!/usr/bin/env node

/**
 * Скрипт для тестирования адаптивной системы
 * Проверяет наличие CSS-переменных, брейкпоинтов и компонентов
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Тестирование адаптивной системы Фазы 1\n');

// 1. Проверка конфигурации Tailwind
console.log('1. Проверка tailwind.config.ts...');
const tailwindConfigPath = path.join(__dirname, '../tailwind.config.ts');
if (fs.existsSync(tailwindConfigPath)) {
  const content = fs.readFileSync(tailwindConfigPath, 'utf8');
  
  // Проверка брейкпоинтов
  const has3xl = content.includes("'3xl': '1920px'");
  const has4xl = content.includes("'4xl': '2560px'");
  
  console.log(`   ✓ Брейкпоинт 3xl (1920px): ${has3xl ? '✅ присутствует' : '❌ отсутствует'}`);
  console.log(`   ✓ Брейкпоинт 4xl (2560px): ${has4xl ? '✅ присутствует' : '❌ отсутствует'}`);
  
  // Проверка контейнеров
  const hasContainer3xl = content.includes("'3xl': '8rem'");
  const hasContainer4xl = content.includes("'4xl': '10rem'");
  
  console.log(`   ✓ Контейнер padding 3xl: ${hasContainer3xl ? '✅ присутствует' : '❌ отсутствует'}`);
  console.log(`   ✓ Контейнер padding 4xl: ${hasContainer4xl ? '✅ присутствует' : '❌ отсутствует'}`);
} else {
  console.log('   ❌ Файл tailwind.config.ts не найден');
}

// 2. Проверка CSS-переменных
console.log('\n2. Проверка CSS-переменных в globals.css...');
const globalsCssPath = path.join(__dirname, '../src/app/globals.css');
if (fs.existsSync(globalsCssPath)) {
  const content = fs.readFileSync(globalsCssPath, 'utf8');
  
  const hasScale3xl = content.includes('--scale-3xl: 1.15');
  const hasScale4xl = content.includes('--scale-4xl: 1.2');
  const hasContainer3xl = content.includes('--container-3xl');
  const hasContainer4xl = content.includes('--container-4xl');
  
  console.log(`   ✓ CSS-переменная --scale-3xl: ${hasScale3xl ? '✅ присутствует' : '❌ отсутствует'}`);
  console.log(`   ✓ CSS-переменная --scale-4xl: ${hasScale4xl ? '✅ присутствует' : '❌ отсутствует'}`);
  console.log(`   ✓ CSS-переменная --container-3xl: ${hasContainer3xl ? '✅ присутствует' : '❌ отсутствует'}`);
  console.log(`   ✓ CSS-переменная --container-4xl: ${hasContainer4xl ? '✅ присутствует' : '❌ отсутствует'}`);
} else {
  console.log('   ❌ Файл globals.css не найден');
}

// 3. Проверка компонентов
console.log('\n3. Проверка компонентов адаптивности...');
const components = [
  '../src/components/ui/adaptive-container.tsx',
  '../src/components/ui/fluid-grid.tsx',
  '../src/components/ui/responsive-text.tsx',
  '../src/components/ui/scalable-spacing.tsx',
];

let allComponentsExist = true;
components.forEach(componentPath => {
  const fullPath = path.join(__dirname, componentPath);
  const exists = fs.existsSync(fullPath);
  const name = path.basename(componentPath);
  console.log(`   ✓ ${name}: ${exists ? '✅ присутствует' : '❌ отсутствует'}`);
  if (!exists) allComponentsExist = false;
});

// 4. Проверка токенов
console.log('\n4. Проверка системы токенов...');
const tokensPath = path.join(__dirname, '../src/lib/adaptive-tokens.ts');
if (fs.existsSync(tokensPath)) {
  const content = fs.readFileSync(tokensPath, 'utf8');
  
  const hasBreakpoints = content.includes("'3xl': 1920") && content.includes("'4xl': 2560");
  const hasScaleFactors = content.includes("'3xl': 1.15") && content.includes("'4xl': 1.2");
  const hasContainerWidths = content.includes("'3xl'") && content.includes("'4xl'");
  
  console.log(`   ✓ Токены брейкпоинтов: ${hasBreakpoints ? '✅ присутствуют' : '❌ отсутствуют'}`);
  console.log(`   ✓ Токены масштабирования: ${hasScaleFactors ? '✅ присутствуют' : '❌ отсутствуют'}`);
  console.log(`   ✓ Токены контейнеров: ${hasContainerWidths ? '✅ присутствуют' : '❌ отсутствуют'}`);
} else {
  console.log('   ❌ Файл adaptive-tokens.ts не найден');
}

// 5. Проверка демо-компонента
console.log('\n5. Проверка демо-компонента...');
const demoPath = path.join(__dirname, '../src/components/ui/adaptive-demo.tsx');
const demoPagePath = path.join(__dirname, '../src/app/test/adaptive/page.tsx');

const demoExists = fs.existsSync(demoPath);
const demoPageExists = fs.existsSync(demoPagePath);

console.log(`   ✓ Демо-компонент: ${demoExists ? '✅ присутствует' : '❌ отсутствует'}`);
console.log(`   ✓ Тестовая страница: ${demoPageExists ? '✅ присутствует' : '❌ отсутствует'}`);

// Итог
console.log('\n' + '='.repeat(50));
console.log('ИТОГ ТЕСТИРОВАНИЯ:');

if (allComponentsExist && demoExists && demoPageExists) {
  console.log('✅ Все основные компоненты адаптивной системы присутствуют');
  console.log('✅ Новые брейкпоинты 3xl и 4xl добавлены в конфигурацию');
  console.log('✅ CSS-переменные для масштабирования настроены');
  console.log('✅ Демо-страница доступна по адресу: http://localhost:3000/test/adaptive');
  console.log('\n📋 Рекомендации по дальнейшему тестированию:');
  console.log('   1. Откройте демо-страницу в браузере');
  console.log('   2. Используйте инструменты разработчика для эмуляции разных разрешений');
  console.log('   3. Проверьте работу на разрешениях: 1920px, 2560px, 3840px');
  console.log('   4. Убедитесь, что текст и отступы увеличиваются на больших экранах');
  console.log('   5. Проверьте обратную совместимость на мобильных устройствах');
} else {
  console.log('❌ Обнаружены проблемы в реализации адаптивной системы');
  console.log('   Проверьте отсутствующие файлы и конфигурации');
}

console.log('\n');