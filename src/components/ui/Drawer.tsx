'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

// Right-hand side panel from the original portal (.drawer); becomes a bottom sheet on phones.
export function Drawer({ open, title, subtitle, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dr-h">
          <div>
            <div style={{ font: '700 20px var(--display)', letterSpacing: '-.025em' }}>{title}</div>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          <button className="x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="dr-b">{children}</div>
        {footer && <div className="dr-f">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}
