'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function BreadcrumbRoot({
  className,
  ...props
}: React.ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="breadcrumb"
      aria-label="Хлебные крошки"
      className={cn(className)}
      {...props}
    />
  )
}

function BreadcrumbList({
  className,
  ...props
}: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex flex-wrap items-center gap-1.5 break-words text-sm text-gray-600',
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  )
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'a'
  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        'transition-colors hover:text-action-blue hover:underline',
        className
      )}
      {...props}
    />
  )
}

function BreadcrumbPage({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-medium text-gray-900', className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400', className)}
      {...props}
    >
      {children ?? <ChevronRight className="rtl:rotate-180" />}
    </li>
  )
}

export {
  BreadcrumbRoot as Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
}
