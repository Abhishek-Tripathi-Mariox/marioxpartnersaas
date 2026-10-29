import { ICONS, type IconName } from './icons';

export function Icon({ name, size }: { name: IconName; size?: 's' | 'l' }) {
  return (
    <svg className={`i ${size ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export type { IconName };
