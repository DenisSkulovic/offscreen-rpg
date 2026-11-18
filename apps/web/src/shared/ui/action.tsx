import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import './controls.css';

export type ActionVariant = 'primary' | 'secondary' | 'quiet' | 'critical';

type Common = {
  variant?: ActionVariant;
  children: ReactNode;
  className?: string;
};

type ButtonAction = Common &
  Omit<ComponentProps<'button'>, 'children' | 'className' | 'disabled'> & {
    kind: 'button';
    disabled?: boolean;
    pending?: boolean;
  };

type LinkAction = Common &
  Omit<ComponentProps<typeof Link>, 'children' | 'className' | 'href'> & {
    kind: 'link';
    href: string;
  };

function classNameFor(variant: ActionVariant, extra?: string) {
  return ['action', extra].filter(Boolean).join(' ');
}

function without<T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) {
    delete copy[key];
  }
  return copy;
}

/** A navigation action is a link. A mutation action is a button. */
export function Action(props: ButtonAction | LinkAction) {
  const variant = props.variant ?? 'primary';
  const className = classNameFor(variant, props.className);
  if (props.kind === 'link') {
    const rest = without(props, [
      'kind',
      'variant',
      'className',
      'href',
      'children',
    ]);
    return (
      <Link
        href={props.href}
        className={className}
        data-variant={variant}
        {...rest}
      >
        {props.children}
      </Link>
    );
  }
  const pending = props.pending ?? false;
  const inactive = Boolean(props.disabled || pending);
  const rest = without(props, [
    'kind',
    'variant',
    'className',
    'pending',
    'disabled',
    'children',
    'type',
  ]);
  return (
    <button
      {...rest}
      type={props.type ?? 'button'}
      className={className}
      data-variant={variant}
      data-pending={pending ? 'true' : undefined}
      disabled={inactive}
      aria-busy={pending ? true : undefined}
    >
      {props.children}
    </button>
  );
}
