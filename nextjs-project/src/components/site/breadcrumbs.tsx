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
}

/**
 * Breadcrumb navigation. Last item is current page (no link).
 * Link: hover:text-action-blue transition-colors. Current: text-text font-medium. Separator: / with mx-2.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Breadcrumb className="pb-1 pt-4 text-sm text-gray-500 2xl:text-base 3xl:text-lg">
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
                      className="desktop-microtext-scale min-h-[32px] inline-flex items-center hover:text-action-blue transition-colors hover:no-underline"
                    >
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="desktop-microtext-scale text-text font-medium">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 && (
                <BreadcrumbSeparator className="mx-2 desktop-microtext-scale [&>svg]:hidden">
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
