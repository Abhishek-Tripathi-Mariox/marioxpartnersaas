import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { Dropdown, type Option } from './Dropdown';

type Wrap = { label?: string; hint?: string; small?: boolean };

// `custom` renders a div instead of a label, because a <label> wrapping the dropdown button
// would re-open it whenever the label text is clicked.
function Field({ label, hint, children, custom }: Wrap & { children: ReactNode; custom?: boolean }) {
  if (!label && !hint) return <>{children}</>;
  const Tag = custom ? 'div' : 'label';
  return (
    <Tag className="field">
      {label && <span>{label}</span>}
      {children}
      {hint && <small>{hint}</small>}
    </Tag>
  );
}

const inp = (small?: boolean, extra = '') => ['inp', small && 'sm', extra].filter(Boolean).join(' ');

export function Input({ label, hint, small, className = '', ...rest }: Wrap & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint}>
      <input className={inp(small, className)} {...rest} />
    </Field>
  );
}

export function Textarea({ label, hint, small, className = '', ...rest }: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint}>
      <textarea className={inp(small, className)} {...rest} />
    </Field>
  );
}

type SelectProps = Wrap & {
  options: readonly Option[];
  value?: string | number | null;
  // Same shape as a native change event, so form helpers like useForm.bind work unchanged.
  onChange?: (e: { target: { value: string } }) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
  searchable?: boolean;
  'aria-label'?: string;
};

// Custom dropdown (see Dropdown.tsx). Lists longer than 5 options get a search box.
export function Select({ label, hint, small, onChange, value, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} custom>
      <Dropdown small={small} value={value} onChange={v => onChange?.({ target: { value: v } })} {...rest} />
    </Field>
  );
}

// The original portal's animated checkbox.
export function Check({ checked, onChange, label, children }: { checked: boolean; onChange: (v: boolean) => void; label?: string; children?: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} />
      <span className="box">
        <svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" /></svg>
      </span>
      {children}
    </label>
  );
}

// Row-style on/off switch with a title and description.
export function Toggle({ on, onChange, title, sub }: { on: boolean; onChange: (v: boolean) => void; title: string; sub?: string }) {
  return (
    <button
      type="button"
      className="between"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--panel-2)', boxShadow: '0 0 0 1px var(--line) inset', textAlign: 'left', width: '100%' }}
    >
      <span>
        <b style={{ fontWeight: 600 }}>{title}</b>
        {sub && <span className="sub" style={{ display: 'block' }}>{sub}</span>}
      </span>
      <span className={`toggle ${on ? 'on' : ''}`} />
    </button>
  );
}

export function FormError({ error }: { error?: string | null }) {
  return error ? <div className="form-error">{error}</div> : null;
}
