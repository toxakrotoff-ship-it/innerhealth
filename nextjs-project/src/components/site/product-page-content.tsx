import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { ProductTabs } from '@/components/site/product-tabs'
import { CompareToggleButton } from '@/components/site/compare-toggle-button'
import { RecentlyViewedTracker } from '@/components/site/recently-viewed-tracker'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'
import { ProductCard } from '@/components/site/product-card'
import { GroupedProductCard } from '@/components/site/grouped-product-card'
import { WishlistToggleButton } from '@/components/site/wishlist-toggle-button'
import { QuickOrderDialog } from '@/components/site/quick-order-dialog'
import { PurchaseTrustStrip } from '@/components/site/purchase-trust-strip'
import { ProductRelatedCategoryLinks } from '@/components/site/product-related-category-links'
import { ProductMediaGallery } from '@/components/site/product-media-gallery'
import { ProductFlavorSelector } from '@/components/site/product-flavor-selector'
import { ProductDocumentsSection } from '@/components/site/product-documents-section'
import { Breadcrumbs, type BreadcrumbItemType } from '@/components/site/breadcrumbs'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import type { ProductGalleryPhoto } from '@/lib/product-gallery'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { Heading1, Heading2 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { cn } from '@/lib/utils'
import { groupProductsForListing } from '@/lib/product-grouping'
import { normalizeInnerProductContent, parseProductTabsJson } from '@/lib/product-tabs'
import { isLegacyDocumentSectionTitle } from '@/lib/product-documents'
import { hasVisibleProductText, shouldHideInnerProductDescription } from '@/lib/product-description-dedupe'
import {
  DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT,
  type ProductDocumentsPlacement,
} from '@/lib/product-page-layout'

interface ProductPageContentProps {
  product: {
    id: string
    title: string
    brand: string | null
    sku: string | null
    description: string | null
    text: string | null
    tabs?: unknown
    weight?: number | null
    price: number
    priceOld: number | null
    photo: string | null
    photos?: unknown
    quantity?: number | null
    isPreorderEnabled?: boolean
    slug: string | null
    isPromoEligible?: boolean
    discountPrice?: number | null
  }
  flavorVariants?: Array<{
    id: string
    parentUid: string | null
    title: string
    brand: string | null
    sku: string | null
    weight?: number | null
    price: number
    priceOld: number | null
    quantity?: number | null
    photo: string | null
    slug: string | null
    isPromoEligible: boolean
    discountPrice: number | null
    isPreorderEnabled?: boolean
  }>
  tabs: { title: string; content: string }[]
  photos: ProductGalleryPhoto[]
  /** When omitted, uses Главная → Каталог → title */
  breadcrumbItems?: BreadcrumbItemType[]
  /** Primary category title for contextual internal links */
  relatedProductsCategoryTitle?: string | null
  /** Primary category slug, used e.g. to pick the flavor/format selector label */
  relatedProductsCategorySlug?: string | null
  relatedProducts: Array<{
    id: string
    parentUid: string | null
    title: string
    brand: string | null
    sku: string | null
    price: number
    priceOld: number | null
    photo: string | null
    photos?: unknown
    slug: string | null
    isPromoEligible: boolean
    discountPrice: number | null
    quantity?: number | null
    isPreorderEnabled?: boolean
  }>
  relationSections?: Array<{
    type: 'RELATED' | 'RECOMMENDED' | 'CROSS_SELL' | 'UPSELL' | 'ALTERNATIVE' | 'BUNDLE'
    title: string
    items: Array<{
      id: string
      parentUid: string | null
      title: string
      brand: string | null
      sku: string | null
      weight?: number | null
      price: number
      priceOld: number | null
      photo: string | null
      photos?: unknown
      slug: string | null
      isPromoEligible: boolean
      discountPrice: number | null
      quantity?: number | null
      isPreorderEnabled?: boolean
    }>
  }>
  structuredDocuments?: Array<{
    id: string
    title: string
    typeLabel: string
    fileUrl: string
    fileName: string | null
    mimeType: string | null
    fileSize: number | null
    documentNumber?: string | null
    issuedAt?: string | null
    expiresAt?: string | null
  }>
  /** Where to render structured documents relative to description tabs. */
  documentsPlacement?: ProductDocumentsPlacement
  isSprintTheme?: boolean
}

interface StockBadgeState {
  label: string
  className: string
}

function getStockBadge(quantity: number | null | undefined, isSprintTheme: boolean): StockBadgeState {
  if (isSprintTheme) {
    if (quantity == null)
      return {
        label: 'В наличии',
        className: 'border border-emerald-800/70 bg-emerald-950/55 text-emerald-200',
      }
    if (quantity <= 0)
      return {
        label: 'Товар временно закончился',
        className: 'border border-slate-600 bg-slate-800/80 text-slate-300',
      }
    if (quantity >= 10)
      return {
        label: 'В наличии',
        className: 'border border-emerald-800/70 bg-emerald-950/55 text-emerald-200',
      }
    return {
      label: 'Заканчивается',
      className: 'border border-amber-800/60 bg-amber-950/45 text-amber-100',
    }
  }
  if (quantity == null) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  if (quantity <= 0) return { label: 'Товар временно закончился', className: 'bg-gray-100 text-gray-700' }
  if (quantity >= 10) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  return { label: 'Заканчивается', className: 'bg-orange-100 text-orange-700' }
}

/** HTML snippet vs plain text — must not mix `dangerouslySetInnerHTML` with children on one node. */
function looksLikeHtmlMarkup(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text.trim())
}

function ProductShortDescription({
  description,
  isSprintTheme,
}: {
  description: string
  isSprintTheme: boolean
}) {
  const className = cn(
    'mt-4 min-w-0 max-w-2xl break-words text-sm leading-6 [overflow-wrap:anywhere] sm:text-base [&_p]:my-0 [&_p+p]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold',
    isSprintTheme
      ? 'text-slate-300 [&_strong]:text-slate-100'
      : 'text-gray-700 [&_strong]:text-gray-900'
  )

  if (looksLikeHtmlMarkup(description)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: description }} />
  }

  return (
    <div className={className}>
      <p className="whitespace-pre-line">{description}</p>
    </div>
  )
}

function ProductLongTextBlock({ text, isSprintTheme }: { text: string; isSprintTheme: boolean }) {
  const className = cn(
    'prose prose-sm max-w-none [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal',
    isSprintTheme
      ? 'prose-invert text-slate-300 prose-headings:text-slate-100 [&_p]:text-slate-300 [&_li]:text-slate-300 [&_strong]:text-slate-100'
      : 'text-text [&_p]:text-text [&_li]:text-text [&_strong]:text-gray-900'
  )
  if (looksLikeHtmlMarkup(text)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: text }} />
  }
  return (
    <div className={className}>
      <span className="whitespace-pre-line">{text}</span>
    </div>
  )
}

export function ProductPageContent({
  product,
  photos,
  flavorVariants = [],
  relatedProducts,
  relationSections = [],
  structuredDocuments = [],
  documentsPlacement = DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT,
  breadcrumbItems,
  relatedProductsCategoryTitle,
  relatedProductsCategorySlug,
  isSprintTheme = false,
}: ProductPageContentProps) {
  const normalizedContent = normalizeInnerProductContent(product)
  const explicitTabs = parseProductTabsJson(product.tabs)
  const shortDescription = normalizedContent.shortDescription
  const shouldRenderShortDescription =
    !!shortDescription && !shouldHideInnerProductDescription(shortDescription, product.text)
  const shouldRenderLongText =
    hasVisibleProductText(product.text) &&
    Array.isArray(explicitTabs) &&
    explicitTabs.length > 0
  const hasStructuredDocuments = structuredDocuments.length > 0
  const visibleContentSections = normalizedContent.sections.filter(
    (section) => !(hasStructuredDocuments && isLegacyDocumentSectionTitle(section.title))
  )
  const displayWeight =
    typeof product.weight === 'number' && Number.isFinite(product.weight) && product.weight > 0
      ? `${product.weight.toLocaleString('ru-RU')} г`
      : null
  const isOutOfStock = product.quantity != null && product.quantity <= 0
  const isPreorderEnabled = product.isPreorderEnabled === true
  const isUnavailable = isOutOfStock && !isPreorderEnabled
  const stock = isOutOfStock && isPreorderEnabled
    ? {
        label: 'Предзаказ',
        className: isSprintTheme
          ? 'border border-amber-800/60 bg-amber-950/45 text-amber-100'
          : 'bg-amber-100 text-amber-700',
      }
    : getStockBadge(product.quantity, isSprintTheme)
  const crumbs: BreadcrumbItemType[] =
    breadcrumbItems ??
    [
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/catalog' },
      { label: product.title },
    ]
  const relatedListingItems = groupProductsForListing(relatedProducts)
  const hasManualRelationSections = relationSections.length > 0
  const shouldRenderAutomaticRelated = relatedProducts.length > 0 && !hasManualRelationSections
  const showDocumentsBeforeTabs =
    hasStructuredDocuments && documentsPlacement === 'before-tabs'
  const showDocumentsAfterTabs =
    hasStructuredDocuments && documentsPlacement === 'after-tabs'
  const showDocumentsAsTab =
    hasStructuredDocuments && documentsPlacement === 'as-tab'

  const documentsSection = showDocumentsBeforeTabs || showDocumentsAfterTabs ? (
    <ScalableSpacing size="md">
      <div id="product-documents" tabIndex={-1} className="scroll-mt-28">
        <ProductDocumentsSection documents={structuredDocuments} productTitle={product.title} isSprintTheme={isSprintTheme} />
      </div>
    </ScalableSpacing>
  ) : null

  const productTabItems = [
    ...visibleContentSections.map((section) => ({
      title: section.title,
      content: section.content,
      anchorId: isLegacyDocumentSectionTitle(section.title) ? 'product-documents' : undefined,
    })),
    ...(showDocumentsAsTab
      ? [
          {
            title: 'Документы',
            content: '',
            anchorId: 'product-documents',
            node: (
              <ProductDocumentsSection
                documents={structuredDocuments}
                productTitle={product.title}
                isSprintTheme={isSprintTheme}
              />
            ),
          },
        ]
      : []),
  ]

  return (
    <AdaptiveContainer
      maxWidth="default"
      adaptivePadding={false}
      style={{ maxWidth: '1360px' }}
      className={`px-5 py-6 sm:px-8 sm:py-10 ${isSprintTheme ? 'text-slate-100' : ''}`}
    >
      <Breadcrumbs
        items={crumbs}
        isInverted={isSprintTheme}
        hideCurrentPageOnMobile
      />
      <RecentlyViewedTracker productId={product.id} />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div
          className={cn(
            isSprintTheme && 'lg:self-start'
          )}
        >
          <ProductMediaGallery title={product.title} photos={photos} isSprintTheme={isSprintTheme} />
        </div>
        <div
          className={cn(
            'min-w-0',
            isSprintTheme && 'lg:self-start'
          )}
        >
          <Heading1
            className={cn(
              'min-w-0 max-w-full break-words leading-[1.08] max-sm:text-[1.72rem] max-sm:font-semibold max-sm:tracking-tight sm:text-[clamp(30px,2.2vw,42px)]',
              isSprintTheme && 'text-slate-100'
            )}
          >
            {product.title}
          </Heading1>
          {shouldRenderShortDescription && shortDescription && (
            <ProductShortDescription description={shortDescription} isSprintTheme={isSprintTheme} />
          )}
          <div className="mt-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${stock.className}`}>
              {stock.label}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className={`text-2xl font-semibold ${isSprintTheme ? 'text-white' : 'text-text'}`}>
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            {product.priceOld != null && product.priceOld > product.price && (
              <span className={`text-lg line-through ${isSprintTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                {product.priceOld.toLocaleString('ru-RU')} ₽
              </span>
            )}
          </div>
          <ProductFlavorSelector
            activeProductId={product.id}
            variants={flavorVariants}
            isSprintTheme={isSprintTheme}
            categorySlug={relatedProductsCategorySlug}
          />
          {displayWeight && (
            <p className={cn('mt-4 text-sm', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
              Вес: {displayWeight}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton
              productId={product.id}
              title={product.title}
              price={product.price}
              photo={product.photo}
              slug={product.slug}
              hasPromoPrice={product.priceOld != null && product.priceOld > product.price}
              isPromoEligible={product.isPromoEligible}
              discountPrice={product.discountPrice}
              disabled={isUnavailable}
              disabledLabel="Товар закончился"
              className={isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : undefined}
            />
            <WishlistToggleButton
              productId={product.id}
              className={cn(
                'min-h-[44px]',
                isSprintTheme &&
                  'border-slate-600 bg-slate-800 text-slate-100 hover:border-[#7AA2FF] hover:bg-slate-700 hover:text-[#9AB8FF]'
              )}
            />
            <QuickOrderDialog
              productId={product.id}
              productTitle={product.title}
              disabled={isUnavailable}
              isSprintTheme={isSprintTheme}
            />
          </div>
          <div className="mt-3">
            <CompareToggleButton productId={product.id} isSprintTheme={isSprintTheme} />
          </div>
          <PurchaseTrustStrip isSprintTheme={isSprintTheme} />
          {(hasStructuredDocuments || visibleContentSections.some((section) => isLegacyDocumentSectionTitle(section.title))) && (
            <a
              href="#product-documents"
              className={cn(
                'mt-3 inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium no-underline transition-colors hover:no-underline',
                isSprintTheme
                  ? 'border-slate-700 text-[#9AB8FF] hover:bg-slate-800'
                  : 'border-gray-300 text-gray-700 hover:border-action-blue hover:bg-gray-50'
              )}
            >
              Документы на этот товар
            </a>
          )}
        </div>
      </div>

      {shouldRenderLongText && product.text && (
        <section className="mt-8 sm:mt-10">
          <ProductLongTextBlock text={product.text} isSprintTheme={isSprintTheme} />
        </section>
      )}

      {showDocumentsBeforeTabs ? documentsSection : null}

      {productTabItems.length > 0 && (
        <ProductTabs
          key={product.id}
          tabs={productTabItems}
          isSprintTheme={isSprintTheme}
        />
      )}

      {showDocumentsAfterTabs ? documentsSection : null}

      {relationSections.map((section) => {
        const sectionItems = groupProductsForListing(section.items)
        if (sectionItems.length === 0) return null

        return (
          <ScalableSpacing size="lg" key={section.type}>
            <section
              className={
                visibleContentSections.length > 0 || hasStructuredDocuments
                  ? 'pt-6 sm:pt-8'
                  : isSprintTheme
                    ? 'border-t border-slate-700 pt-6 sm:pt-8'
                    : 'border-t border-gray-200 pt-6 sm:pt-8'
              }
            >
              <Heading2 className={cn('mb-4', isSprintTheme && 'text-slate-100')}>
                {section.title}
              </Heading2>
              <FluidGrid
                cols={2}
                colsTablet={3}
                colsDesktop={4}
                colsXl={4}
                cols2xl={4}
                cols3xl={4}
                cols4xl={4}
                cols5xl={4}
                cols6xl={4}
                gap={4}
                adaptiveGap
                className="max-sm:grid-cols-1"
              >
                {sectionItems.map((item) =>
                  item.kind === 'single' ? (
                    <ProductCard
                      key={item.product.id}
                      id={item.product.id}
                      title={item.product.title}
                      brand={item.product.brand}
                      sku={item.product.sku}
                      weight={item.product.weight}
                      price={item.product.price}
                      priceOld={item.product.priceOld}
                      photo={item.product.photo}
                      photos={item.product.photos}
                      slug={item.product.slug}
                      isPromoEligible={item.product.isPromoEligible}
                      discountPrice={item.product.discountPrice}
                      quantity={item.product.quantity}
                      isPreorderEnabled={item.product.isPreorderEnabled}
                      isPartner={item.product.isPartner}
                      blurDataURL={getFirstPhotoBlurDataURL(item.product.photos)}
                    />
                  ) : (
                    <GroupedProductCard key={item.parentUid} group={item} />
                  )
                )}
              </FluidGrid>
            </section>
          </ScalableSpacing>
        )
      })}

      {shouldRenderAutomaticRelated && (
        <ScalableSpacing size="lg">
          <section
            className={
              visibleContentSections.length > 0 || hasStructuredDocuments
                ? 'pt-6 sm:pt-8'
                : isSprintTheme
                  ? 'border-t border-slate-700 pt-6 sm:pt-8'
                  : 'border-t border-gray-200 pt-6 sm:pt-8'
            }
          >
            <Heading2 className={cn('mb-1', isSprintTheme && 'text-slate-100')}>Из той же категории</Heading2>
            <p className={`mb-4 max-w-2xl text-sm ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>
              Подборка похожих позиций из каталога — удобно сравнить состав и цену.
            </p>
            <FluidGrid
              cols={2}
              colsTablet={3}
              colsDesktop={4}
              colsXl={4}
              cols2xl={4}
              cols3xl={4}
              cols4xl={4}
              cols5xl={4}
              cols6xl={4}
              gap={4}
              adaptiveGap
              className="max-sm:grid-cols-1"
            >
              {relatedListingItems.map((item) =>
                item.kind === 'single' ? (
                  <ProductCard
                    key={item.product.id}
                    id={item.product.id}
                    title={item.product.title}
                    brand={item.product.brand}
                    sku={item.product.sku}
                    weight={item.product.weight}
                    price={item.product.price}
                    priceOld={item.product.priceOld}
                    photo={item.product.photo}
                    photos={item.product.photos}
                    slug={item.product.slug}
                    isPromoEligible={item.product.isPromoEligible}
                    discountPrice={item.product.discountPrice}
                    quantity={item.product.quantity}
                    isPreorderEnabled={item.product.isPreorderEnabled}
                    isPartner={item.product.isPartner}
                    blurDataURL={getFirstPhotoBlurDataURL(item.product.photos)}
                  />
                ) : (
                  <GroupedProductCard key={item.parentUid} group={item} />
                )
              )}
            </FluidGrid>
            {relatedProductsCategoryTitle ? (
              <ProductRelatedCategoryLinks
                categoryTitle={relatedProductsCategoryTitle}
                items={relatedProducts}
                isSprintTheme={isSprintTheme}
              />
            ) : null}
          </section>
        </ScalableSpacing>
      )}

      <RecentlyViewedProducts excludeProductId={product.id} isSprintTheme={isSprintTheme} />
    </AdaptiveContainer>
  )
}
