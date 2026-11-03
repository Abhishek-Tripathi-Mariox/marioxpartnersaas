'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon } from '@/components/ui';

export type Attachment = { fileId: string; name: string; size: number; type: string };

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif,.zip,.mp4,.m4v,.mov,.webm';
export const MAX_FILE_MB = 15;
export const MAX_VIDEO_MB = 25;

export const fileSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
export const fileExt = (name: string) => (name.split('.').pop() || 'file').slice(0, 4).toUpperCase();

export const fileUrl = (f: Pick<Attachment, 'fileId'>) => `/api/uploads/${f.fileId}`;
export const downloadUrl = (f: Pick<Attachment, 'fileId'>) => `/api/uploads/${f.fileId}?download=1`;
export const isImage = (f: Pick<Attachment, 'name' | 'type'>) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
export const isVideo = (f: Pick<Attachment, 'name' | 'type'>) => /^video\//.test(f.type) || /\.(mp4|m4v|mov|webm)$/i.test(f.name);
export const isPdf = (f: Pick<Attachment, 'name' | 'type'>) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
// Files the in-app viewer can show: images, videos (with a player) and PDFs.
export const canView = (f: Pick<Attachment, 'name' | 'type'>) => isImage(f) || isVideo(f) || isPdf(f);
const maxMb = (f: Pick<Attachment, 'name' | 'type'>) => (isVideo(f) ? MAX_VIDEO_MB : MAX_FILE_MB);

// Full-screen viewer: video player, image or PDF, with download / open in a new tab and ← → between files.
export function FileViewer({ files, index, onClose }: { files: Attachment[]; index: number; onClose: () => void }) {
  const list = files.filter(canView);
  const [i, setI] = useState(Math.max(0, list.findIndex(f => f.fileId === files[index]?.fileId)));
  const f = list[i];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI(x => Math.min(list.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [list.length, onClose]);
  if (!f) return null;
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="fv" role="dialog" aria-modal="true" aria-label={f.name}>
        <div className="fv-h">
          <div style={{ minWidth: 0 }}><b className="ell">{f.name}</b><span className="sub mono">{fileSize(f.size)}{list.length > 1 ? ` · ${i + 1} of ${list.length}` : ''}</span></div>
          <div className="row" style={{ gap: 6 }}>
            <a className="btn sm" href={fileUrl(f)} target="_blank" rel="noreferrer"><Icon name="arrUR" size="s" />Open</a>
            <a className="btn sm" href={downloadUrl(f)} download={f.name}><Icon name="download" size="s" />Download</a>
            <button type="button" className="x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        </div>
        <div className="fv-b">
          {isVideo(f) ? <video key={f.fileId} src={fileUrl(f)} controls autoPlay playsInline preload="metadata" />
            : isImage(f) ? <img key={f.fileId} src={fileUrl(f)} alt={f.name} />
            : <iframe key={f.fileId} src={fileUrl(f)} title={f.name} />}
          {i > 0 && <button type="button" className="fv-nav l" onClick={() => setI(i - 1)} aria-label="Previous file"><Icon name="chevL" /></button>}
          {i < list.length - 1 && <button type="button" className="fv-nav r" onClick={() => setI(i + 1)} aria-label="Next file"><Icon name="chevR" /></button>}
        </div>
      </div>
    </>,
    document.body,
  );
}

// Small preview: image thumbnail, first video frame, or the format badge.
function Thumb({ file, className }: { file: Attachment; className?: string }) {
  if (isImage(file)) return <img className={className} src={fileUrl(file)} alt="" loading="lazy" />;
  if (isVideo(file)) return <video className={className} src={`${fileUrl(file)}#t=0.5`} preload="metadata" muted playsInline />;
  return <span className="file-ext">{fileExt(file.name)}</span>;
}

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

// "View" / "Play" button that opens the file in the in-app viewer (nothing for files it can't show).
export function ViewButton({ file, label = true }: { file: Attachment; label?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!canView(file)) return null;
  const verb = isVideo(file) ? 'Play' : 'View';
  return (
    <>
      <button type="button" className={label ? 'btn xs' : 'x dl-btn'} title={`${verb} ${file.name}`} aria-label={`${verb} ${file.name}`} onClick={e => { e.stopPropagation(); setOpen(true); }}>
        <Icon name={isVideo(file) ? 'video' : 'eye'} size="s" />{label && verb}
      </button>
      {open && <FileViewer files={[file]} index={0} onClose={() => setOpen(false)} />}
    </>
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
export function FileChip({ file, onRemove, href, onView }: { file: Attachment; onRemove?: () => void; href?: string; onView?: () => void }) {
  const [viewing, setViewing] = useState(false);
  const view = canView(file) ? (onView ?? (() => setViewing(true))) : null;
  const body = (
    <>
      <Thumb file={file} className="file-thumb" />
      <span className="file-n">{file.name}</span>
      <span className="mono sub" style={{ fontSize: 12 }}>{fileSize(file.size)}</span>
    </>
  );
  return (
    <div className="file-chip">
      {href && view ? <button type="button" className="row file-open" style={{ gap: 10, flex: 1, minWidth: 0 }} title={isVideo(file) ? 'Play' : 'View'} onClick={e => { e.stopPropagation(); view(); }}>{body}</button>
        : href ? <a href={href} target="_blank" rel="noreferrer" className="row" style={{ gap: 10, flex: 1, minWidth: 0 }} title="Open">{body}</a>
        : <span className="row" style={{ gap: 10, flex: 1, minWidth: 0 }}>{body}</span>}
      {href && view && <button type="button" className="x dl-btn" title={isVideo(file) ? 'Play' : 'View'} aria-label={`${isVideo(file) ? 'Play' : 'View'} ${file.name}`} onClick={e => { e.stopPropagation(); view(); }}><Icon name={isVideo(file) ? 'video' : 'eye'} size="s" /></button>}
      {href && !view && <a className="x dl-btn" href={href} target="_blank" rel="noreferrer" title="Open" aria-label={`Open ${file.name}`}><Icon name="arrUR" size="s" /></a>}
      {href && <DownloadButton file={file} />}
      {onRemove && <button type="button" className="x" style={{ width: 28, height: 28 }} onClick={onRemove} aria-label={`Remove ${file.name}`}><Icon name="x" size="s" /></button>}
      {viewing && <FileViewer files={[file]} index={0} onClose={() => setViewing(false)} />}
    </div>
  );
}

// Read-only list of attachments: images and videos (playable) as a grid, other files as chips, each with Open and Download.
// `compact` is the small inline version used in tables and lists.
export function AttachmentList({ files, compact }: { files?: Attachment[] | null; compact?: boolean }) {
  const [viewing, setViewing] = useState<number | null>(null);
  if (!files?.length) return compact ? <span className="sub">—</span> : null;
  const viewer = viewing !== null && <FileViewer files={files} index={viewing} onClose={() => setViewing(null)} />;
  const open = (f: Attachment) => setViewing(files.indexOf(f));
  if (compact) {
    return (
      <span className="row wrap" style={{ gap: 6 }} onClick={e => e.stopPropagation()}>
        {files.map(f =>
          canView(f) ? (
            <button key={f.fileId} type="button" className={`file-mini ${isVideo(f) ? 'is-video' : ''}`} title={`${isVideo(f) ? 'Play' : 'View'} ${f.name} · ${fileSize(f.size)}`} onClick={() => open(f)}>
              <Thumb file={f} />
            </button>
          ) : (
            <a key={f.fileId} className="file-mini" href={fileUrl(f)} target="_blank" rel="noreferrer" title={`Open ${f.name} · ${fileSize(f.size)}`}>
              <Thumb file={f} />
            </a>
          ),
        )}
        {files.length > 1 ? (
          <button type="button" className="x dl-btn" title={`Download all ${files.length} files`} aria-label="Download all files" onClick={e => { e.stopPropagation(); downloadAll(files); }}>
            <Icon name="download" size="s" />
          </button>
        ) : (
          <DownloadButton file={files[0]} />
        )}
        {viewer}
      </span>
    );
  }
  const media = files.filter(f => isImage(f) || isVideo(f));
  const others = files.filter(f => !isImage(f) && !isVideo(f));
  return (
    <div className="stack" style={{ gap: 8 }}>
      {files.length > 1 && <div className="row" style={{ justifyContent: 'flex-end' }}><DownloadAllButton files={files} /></div>}
      {media.length > 0 && (
        <div className="img-grid">
          {media.map(f => (
            <div key={f.fileId} className="img-tile">
              <button type="button" className={`img-open ${isVideo(f) ? 'is-video' : ''}`} title={`${isVideo(f) ? 'Play' : 'View'} ${f.name}`} onClick={() => open(f)}>
                {isVideo(f) ? <video src={`${fileUrl(f)}#t=0.5`} preload="metadata" muted playsInline /> : <img src={fileUrl(f)} alt={f.name} loading="lazy" />}
                {isVideo(f) && <span className="play"><Icon name="video" /></span>}
              </button>
              <div className="between" style={{ gap: 4, padding: '0 4px 4px 8px' }}>
                <span>{f.name}</span>
                <DownloadButton file={f} />
              </div>
            </div>
          ))}
        </div>
      )}
      {others.map(f => <FileChip key={f.fileId} file={f} href={fileUrl(f)} onView={() => open(f)} />)}
      {viewer}
    </div>
  );
}

// Drop zone + button. Files upload straight away to /api/uploads; the parent keeps the returned list.
// `single`: keep one file (a new upload replaces it), e.g. a sales kit item.
export function FileUploader({ value, onChange, hint = `Client brief, requirement docs, wireframes · PDF, DOCX, XLSX, images up to ${MAX_FILE_MB} MB, videos up to ${MAX_VIDEO_MB} MB`, single }: { value: Attachment[]; onChange: (v: Attachment[]) => void; hint?: string; single?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | File[]) {
    const files = Array.from(list).slice(0, single ? 1 : 10);
    const tooBig = files.find(f => f.size > maxMb(f) * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is larger than ${maxMb(tooBig)} MB`);
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
