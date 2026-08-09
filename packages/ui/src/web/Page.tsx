import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Page scaffolding shared by the merchant and admin apps. Every screen was
 * hand-rolling its own `<header><h1 class="...">` plus ad-hoc loading and error
 * paragraphs, which is why type sizes and spacing drifted between pages. These
 * primitives make the hierarchy — title, description, actions, sections — a
 * property of the layout rather than something each page restates.
 */

export interface PageHeaderProps {
  title: string;
  description?: string | undefined;
  /** Primary/secondary actions. Rendered right-aligned on desktop. */
  actions?: ReactNode | undefined;
  /** Breadcrumb or back link shown above the title. */
  eyebrow?: ReactNode | undefined;
  className?: string | undefined;
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-sm text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-[28px] sm:leading-9">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        // Actions stay reachable on mobile by wrapping instead of shrinking.
        <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:pb-0.5">{actions}</div>
      ) : null}
    </header>
  );
}

/** Vertical rhythm for a page's stacked blocks. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('space-y-6', className)}>{children}</div>;
}

export interface SectionProps {
  title?: string | undefined;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  /** Drop the card chrome when the section already contains a card or table. */
  bare?: boolean | undefined;
  className?: string | undefined;
  bodyClassName?: string | undefined;
  children: ReactNode;
}

/** A titled block of content — the unit pages are composed from. */
export function Section({
  title,
  description,
  actions,
  bare,
  className,
  bodyClassName,
  children,
}: SectionProps) {
  const hasHeading = Boolean(title ?? description ?? actions);
  return (
    <section
      className={cn(
        bare ? undefined : 'rounded-lg border border-line bg-surface-card shadow-sm',
        className,
      )}
    >
      {hasHeading ? (
        <div
          className={cn(
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
            bare ? 'mb-4' : 'border-b border-line px-5 py-4',
          )}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-base font-semibold text-neutral-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(bare ? undefined : 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Groups related fields inside a form. Labelled groups are the difference
 * between a form you scan and a form you wade through.
 */
export function FieldGroup({
  legend,
  hint,
  className,
  children,
}: {
  legend: string;
  hint?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <fieldset className={cn('border-0 p-0', className)}>
      <legend className="mb-1 text-sm font-semibold text-neutral-900">{legend}</legend>
      {hint ? <p className="mb-3 text-sm text-muted-foreground">{hint}</p> : null}
      <div className={cn(hint ? undefined : 'mt-3', 'space-y-4')}>{children}</div>
    </fieldset>
  );
}

/** Sticky action row for long forms, so Save is always reachable. */
export function FormActions({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-5 -mb-5 mt-2 flex flex-wrap items-center gap-3 border-t border-line bg-surface-card/95 px-5 py-4 backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}
