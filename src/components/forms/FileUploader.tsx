'use client';

import { useRef, useState } from 'react';
import { Button, Icon } from '@/components/ui';

export type Attachment = { fileId: string; name: string; size: number; type: string };

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif,.zip';
export const MAX_FILE_MB = 15;
const MAX = MAX_FILE_MB * 1024 * 1024;

export const fileSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const fileExt = (name: string) => (name.split('.').pop() || 'file').slice(0, 4).toUpperCase();

export const fileUrl = (f: Pick<Attachment, 'fileId'>) => `/api/uploads/${f.fileId}`;
export const downloadUrl = (f: Pick<Attachment, 'fileId'>) => `/api/uploads/${f.fileId}?download=1`;
export const isImage = (f: Pick<Attachment, 'name' | 'type'>) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif)$/i.test(f.name);

// Saves every file. Browsers may ask once to allow multiple downloads.
export function downloadAll(files: Attachment[]) {
  files.forEach((f, i) =>
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = downloadUrl(f);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 450),
  );
}

// Icon-only download link.
export function DownloadButton({ file, label }: { file: Attachment; label?: string }) {
  return (
    <a className={label ? 'btn xs' : 'x dl-btn'} href={downloadUrl(file)} download={file.name} title={`Download ${file.name}`} aria-label={`Download ${file.name}`} onClick={e => e.stopPropagation()}>
      <Icon name="download" size="s" />
      {label}
    </a>
  );
}

export function DownloadAllButton({ files, small }: { files: Attachment[]; small?: boolean }) {
  if (files.length < 2) return null;
  return (
    <Button type="button" size={small ? 'xs' : 'sm'} icon="download" onClick={e => { e.stopPropagation(); downloadAll(files); }}>
      {small ? 'All' : `Download all (${files.length})`}
    </Button>
  );
}

// One attached file: image thumbnail or format badge, name, size.
// With `href`: the row opens the file and a separate button downloads it.
export function FileChip({ file, onRemove, href }: { file: Attachment; onRemove?: () => void; href?: string }) {
  const img = isImage(file);
  const body = (
    <>
      {img ? <img className="file-thumb" src={fileUrl(file)} alt="" loading="lazy" /> : <span className="file-ext">{fileExt(file.name)}</span>}
      <span className="file-n">{file.name}</span>
      <span className="mono sub" style={{ fontSize: 12 }}>{fileSize(file.size)}</span>
    </>
  );
  return (
    <div className="file-chip">
      {href ? <a href={href} target="_blank" rel="noreferrer" className="row" style={{ gap: 10, flex: 1, minWidth: 0 }} title="Open">{body}</a> : <span className="row" style={{ gap: 10, flex: 1, minWidth: 0 }}>{body}</span>}
      {href && <a className="x dl-btn" href={href} target="_blank" rel="noreferrer" title="Open" aria-label={`Open ${file.name}`}><Icon name="arrUR" size="s" /></a>}
      {href && <DownloadButton file={file} />}
      {onRemove && <button type="button" className="x" style={{ width: 28, height: 28 }} onClick={onRemove} aria-label={`Remove ${file.name}`}><Icon name="x" size="s" /></button>}
    </div>
  );
}

// Read-only list of attachments: images as a thumbnail grid, other files as chips, each with Open and Download.
// `compact` is the small inline version used in tables and lists.
export function AttachmentList({ files, compact }: { files?: Attachment[] | null; compact?: boolean }) {
  if (!files?.length) return compact ? <span className="sub">—</span> : null;
  if (compact) {
    return (
      <span className="row wrap" style={{ gap: 6 }} onClick={e => e.stopPropagation()}>
        {files.map(f => (
          <a key={f.fileId} className="file-mini" href={fileUrl(f)} target="_blank" rel="noreferrer" title={`Open ${f.name} · ${fileSize(f.size)}`}>
            {isImage(f) ? <img src={fileUrl(f)} alt="" loading="lazy" /> : <span className="file-ext">{fileExt(f.name)}</span>}
          </a>
        ))}
        {files.length > 1 ? (
          <button type="button" className="x dl-btn" title={`Download all ${files.length} files`} aria-label="Download all files" onClick={e => { e.stopPropagation(); downloadAll(files); }}>
            <Icon name="download" size="s" />
          </button>
        ) : (
          <DownloadButton file={files[0]} />
        )}
      </span>
    );
  }
  const images = files.filter(isImage);
  const others = files.filter(f => !isImage(f));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {files.length > 1 && <div className="row" style={{ justifyContent: 'flex-end' }}><DownloadAllButton files={files} /></div>}
      {images.length > 0 && (
        <div className="img-grid">
          {images.map(f => (
            <div key={f.fileId} className="img-tile">
              <a href={fileUrl(f)} target="_blank" rel="noreferrer" title={`Open ${f.name}`}>
                <img src={fileUrl(f)} alt={f.name} loading="lazy" />
              </a>
              <div className="between" style={{ gap: 4, padding: '0 4px 4px 8px' }}>
                <span>{f.name}</span>
                <DownloadButton file={f} />
              </div>
            </div>
          ))}
        </div>
      )}
      {others.map(f => <FileChip key={f.fileId} file={f} href={fileUrl(f)} />)}
    </div>
  );
}

// Drop zone + button. Files upload straight away to /api/uploads; the parent keeps the returned list.
// `single`: keep one file (a new upload replaces it), e.g. a sales kit item.
export function FileUploader({ value, onChange, hint = `Client brief, requirement docs, wireframes · PDF, DOCX, XLSX, images up to ${MAX_FILE_MB} MB`, single }: { value: Attachment[]; onChange: (v: Attachment[]) => void; hint?: string; single?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | File[]) {
    const files = Array.from(list).slice(0, single ? 1 : 10);
    const tooBig = files.find(f => f.size > MAX);
    if (tooBig) return setError(`${tooBig.name} is larger than ${MAX_FILE_MB} MB`);
    if (!files.length) return;
    setError(null);
    setBusy(files.length);
    try {
      // One request per file keeps every request under the server's size limit.
      const uploaded: Attachment[] = [];
      for (const f of files) {
        const form = new FormData();
        form.append('files', f);
        const res = await fetch('/api/uploads', { method: 'POST', body: form, credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || (res.status === 413 ? `${f.name} is too large` : 'Upload failed'));
        uploaded.push(...json.files);
        setBusy(b => b - 1);
      }
      onChange(single ? uploaded.slice(0, 1) : [...value, ...uploaded]);
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
        <Button type="button" size="sm" icon="upload" loading={!!busy} onClick={e => { e.preventDefault(); input.current?.click(); }}>{single ? (value.length ? 'Replace file' : 'Upload file') : 'Upload files'}</Button>
        <input ref={input} type="file" multiple={!single} accept={ACCEPT} onChange={e => e.target.files && upload(e.target.files)} />
      </label>
      {error && <div className="form-error">{error}</div>}
      {value.map(f => <FileChip key={f.fileId} file={f} onRemove={() => onChange(value.filter(x => x.fileId !== f.fileId))} />)}
    </div>
  );
}
