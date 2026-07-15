# PR-3: категории Inner Health

Фактический список категорий `inner` в проде на момент проверки:

- `bulony`
- `collagen`
- `gribnaya-kollekciya`
- `nutrienty`
- `podarochnie-sertifikaty`
- `aktsii`
- `novinki`
- `podarkovye-nabory`

Категории, которые наполняются управляемым контентом в текущей версии PR-3:

- `podarkovye-nabory`
- `bulony`
- `collagen`
- `gribnaya-kollekciya`
- `nutrienty`
- `podarochnie-sertifikaty`
- `aktsii`
- `novinki`

Что обновляется в рамках PR-3:

- `title`
- `pageTitle`
- `catalogTeaser`
- `linePageBodyRichJson`
- `seoTitle`
- `seoDescription`
- `seoKeywords`
- `image`
- `imageAlt`
- `showLegacyLinePageBlocks=false`

Скрипт наполнения:

```bash
npm run seed:inner-category-content
```

Проверочный прогон без записи:

```bash
npm run seed:inner-category-content -- --dry-run
```

Источник фактического ассортимента для этой версии PR:

- сервер `inner`
- Postgres-контейнер `nextjs-project-db-1`
- slugs: `bulony`, `collagen`, `gribnaya-kollekciya`

Проверенные опубликованные товары на сервере:

- `bulony`: говяжьи концентраты 105/210 г, куриный концентрат 210 г, пептидный костный куриный бульон
- `collagen`: коллаген II типа, мультикомплексы I/II/III, коллаген с черной макой
- `gribnaya-kollekciya`: ежовик, кордицепс, рейши, траметес, лисички, комбинация ежовик + кордицепс
- `nutrienty`: биойодин, биоферин
- `podarkovye-nabory`: опубликованных товаров в категории сейчас нет
- `podarochnie-sertifikaty`: опубликованных товаров в категории сейчас нет
- `aktsii`: опубликованных товаров в категории сейчас нет, но раздел используется для подарочных промо
- `novinki`: опубликованных товаров в категории сейчас нет
