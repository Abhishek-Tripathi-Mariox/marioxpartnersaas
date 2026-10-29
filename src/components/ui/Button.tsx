import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'default' | 'fire' | 'ink' | 'ghost' | 'danger' | 'good';
type Size = 'md' | 'sm' | 'xs';

type Common = { variant?: Variant; size?: Size; icon?: IconName; block?: boolean; children?: ReactNode };

const cls = ({ variant = 'default', size = 'md', block }: Common, extra = '') =>
  ['btn', variant !== 'default' && variant, size !== 'md' && size, block && 'block', extra].filter(Boolean).join(' ');

export function Button({ variant, size, icon, block, loading, className = '', children, disabled, ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button className={cls({ variant, size, block }, className)} disabled={disabled || loading} {...rest}>
      {icon && <Icon name={icon} size={size === 'md' || !size ? undefined : 's'} />}
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, icon, block, children }: Common & { href: string }) {
  return (
    <Link href={href} className={cls({ variant, size, block })}>
      {icon && <Icon name={icon} size={size === 'md' || !size ? undefined : 's'} />}
      {children}
    </Link>
  );
}
