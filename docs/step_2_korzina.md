# Task: Implement Shopping Cart Logic with Zustand

## Logic Overview:
1. **State Management:** Используй `Zustand` с middleware `persist` (LocalStorage).
2. **Hydration Fix:** Реализуй проверку `isMounted`, чтобы избежать ошибок гидратации при загрузке корзины из LocalStorage.
3. **Calculation:**
   - Валидация цен только на стороне сервера.
   - Формула: `(Сумма товаров с промо * (1 - Скидка/100)) + Сумма товаров без промо`.
4. **UI:** Плавная корзина-шторка (Framer Motion). Кнопки — только Pill-shaped (#3B66F5).