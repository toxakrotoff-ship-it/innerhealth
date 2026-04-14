import * as React from 'react'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface BreadcrumbItemType {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItemType[]
  isInverted?: boolean
}

/**
 * Breadcrumb navigation. Last item is current page (no link).
 * Link: hover:text-action-blue transition-colors. Current: text-text font-medium. Separator: / with mx-2.
 */
export function Breadcrumbs({ items, isInverted = false }: BreadcrumbsProps) {
  const rootClassName = isInverted ? 'text-slate-400' : 'text-gray-500'
  const currentPageClassName = isInverted ? 'text-slate-100' : 'text-text'
  const hoverClassName = isInverted ? 'hover:text-[#7AA2FF]' : 'hover:text-action-blue'
  const separatorClassName = isInverted ? 'text-slate-500' : 'text-gray-400'

  return (
    <Breadcrumb className={`pb-1 pt-4 text-sm 2xl:text-base 3xl:text-lg ${rootClassName}`}>
      <BreadcrumbList className="text-inherit">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link
                      href={item.href}
                      className={`desktop-microtext-scale min-h-[32px] inline-flex items-center font-medium transition-colors hover:no-underline ${hoverClassName}`}
                    >
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className={`desktop-microtext-scale font-medium ${currentPageClassName}`}>
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 && (
                <BreadcrumbSeparator className={`mx-2 desktop-microtext-scale [&>svg]:hidden ${separatorClassName}`}>
                  /
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
