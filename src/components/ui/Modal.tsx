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
  wide?: boolean;
  className?: string; // extra class on the dialog, e.g. to scope page styles
};

export function Modal({ open, title, subtitle, onClose, children, wide, className = '' }: Props) {
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
  // Rendered on <body> so a page's animated (transformed) container can't trap the fixed overlay.
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className={`modal ${wide ? 'wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h" style={subtitle ? { marginBottom: 6 } : undefined}>
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {subtitle && <p className="sub" style={{ marginBottom: 18 }}>{subtitle}</p>}
        {children}
      </div>
    </>,
    document.body,
  );
}
