'use client';

import { useRef, useState } from 'react';
import { Button, Icon } from '@/components/ui';

export type Attachment = { fileId: string; name: string; size: number; type: string };

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif,.zip';
const MAX = 25 * 1024 * 1024;

export const fileSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const fileExt = (name: string) => (name.split('.').pop() || 'file').slice(0, 4).toUpperCase();

// One attached file: format badge, name, size, and either a download link or a remove button.
export function FileChip({ file, onRemove, href }: { file: Attachment; onRemove?: () => void; href?: string }) {
  const body = (
    <>
      <span className="file-ext">{fileExt(file.name)}</span>
      <span className="file-n">{file.name}</span>
      <span className="mono sub" style={{ fontSize: 12 }}>{fileSize(file.size)}</span>
    </>
  );
  return (
    <div className="file-chip">
      {href ? <a href={href} target="_blank" rel="noreferrer" className="row" style={{ gap: 10, flex: 1, minWidth: 0 }}>{body}</a> : <span className="row" style={{ gap: 10, flex: 1, minWidth: 0 }}>{body}</span>}
      {onRemove && <button type="button" className="x" style={{ width: 28, height: 28 }} onClick={onRemove} aria-label={`Remove ${file.name}`}><Icon name="x" size="s" /></button>}
    </div>
  );
}

// Drop zone + button. Files upload straight away to /api/uploads; the parent keeps the returned list.
export function FileUploader({ value, onChange, hint = 'Client brief, requirement docs, wireframes · PDF, DOCX, XLSX, images up to 25 MB' }: { value: Attachment[]; onChange: (v: Attachment[]) => void; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | File[]) {
    const files = Array.from(list);
    const tooBig = files.find(f => f.size > MAX);
    if (tooBig) return setError(`${tooBig.name} is larger than 25 MB`);
    if (!files.length) return;
    setError(null);
    setBusy(files.length);
    try {
      const form = new FormData();
      files.forEach(f => form.append('files', f));
      const res = await fetch('/api/uploads', { method: 'POST', body: form, credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onChange([...value, ...json.files]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(0);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <label
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); }}
        style={{ flexDirection: 'column', alignItems: 'flex-start' }}
      >
        <span style={{ fontSize: 13.5 }}>{busy ? `Uploading ${busy} file${busy > 1 ? 's' : ''}…` : hint}</span>
        <Button type="button" size="sm" icon="upload" loading={!!busy} onClick={e => { e.preventDefault(); input.current?.click(); }}>Upload files</Button>
        <input ref={input} type="file" multiple accept={ACCEPT} onChange={e => e.target.files && upload(e.target.files)} />
      </label>
      {error && <div className="form-error">{error}</div>}
      {value.map(f => <FileChip key={f.fileId} file={f} onRemove={() => onChange(value.filter(x => x.fileId !== f.fileId))} />)}
    </div>
  );
}
