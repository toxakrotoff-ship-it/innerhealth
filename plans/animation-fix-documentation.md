# Документация по устранению анимации поднятия контейнеров

## Проблема
В админ-панели происходило нежелательное поднятие контейнеров вверх при наведении курсора мыши. Это вызывало некрасивое поведение интерфейса и нарушало ожидаемую стабильность расположения элементов.

## Причина проблемы
Анимации поднятия были реализованы через CSS-свойства `transform: translateY(-2px)` и `transform: translateY(-1px)` для следующих элементов:
1. Карточки (.card) - строка 801 в globals.css
2. Статистические карточки (.stat-card) - строка 838 в globals.css  
3. Кнопки действия (.action-button) - строки 926 и 939 в globals.css

## Внесенные изменения
В файле `nextjs-project/src/app/globals.css` были закомментированы следующие строки:

1. Для карточек (.card):
   ```css
   .card:hover {
     box-shadow: var(--shadow-md);
     /* transform: translateY(-2px); */
   }
   ```

2. Для статистических карточек (.stat-card):
   ```css
   .stat-card:hover {
     box-shadow: var(--shadow-md);
     /* transform: translateY(-2px); */
   }
   ```

3. Для первичных кнопок действия (.action-button.primary):
   ```css
   .action-button.primary:hover {
     background-color: var(--color-primary-dark);
     /* transform: translateY(-1px); */
     box-shadow: var(--shadow-md);
   }
   ```

4. Для вторичных кнопок действия (.action-button.secondary):
   ```css
   .action-button.secondary:hover {
     background-color: var(--color-gray-50);
     border-color: var(--color-gray-400);
     /* transform: translateY(-1px); */
     box-shadow: var(--shadow-sm);
   }
   ```

## Результат
- Контейнеры больше не поднимаются вверх при наведении
- Интерфейс стал более стабильным и предсказуемым
- Анимации сохранены в виде теней и цветовых изменений
- Функциональность не пострадала

## Технические детали
- Все изменения затронули только CSS-стили
- Никаких изменений в логике работы компонентов не требуется
- Стили по-прежнему обеспечивают визуальную обратную связь при наведении