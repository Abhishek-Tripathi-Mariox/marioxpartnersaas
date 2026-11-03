'use client';

import { FileUploader, MAX_FILE_MB, MAX_VIDEO_MB, fileExt, fileSize, type Attachment } from '@/components/forms/FileUploader';
import { Button, Chips, FormError, Input, Toggle } from '@/components/ui';
import { useForm } from '@/hooks/useForm';
import { RESOURCE_TYPES } from '@/lib/constants';
import type { Resource } from '@/types';
import { R, all } from '@/lib/validate';

type Values = { title: string; type: string; industry: string; format: string; size: string; url: string; hidden: boolean; files: Attachment[] };
export type KitPayload = Omit<Values, 'files'> & { file: Attachment | null };

// Admin form for a sales kit item. Upload the file (stored on S3) or give an external link.
// Format and size fill in from the uploaded file.
export function KitForm({ initial, onSubmit, onCancel }: { initial: Partial<Resource>; onSubmit: (v: KitPayload) => Promise<unknown>; onCancel: () => void }) {
  const form = useForm<Values>(
    {
    title: initial.title ?? '',
    type: initial.type ?? RESOURCE_TYPES[0],
    industry: initial.industry ?? 'All',
    format: initial.format ?? '',
    size: initial.size ?? '',
    url: initial.url ?? '',
    hidden: initial.hidden ?? false,
    files: initial.file ? [initial.file] : [],
    },
    {
      title: all(R.required('Title'), R.title),
      industry: R.tags,
      format: v => (!v || /^[A-Za-z0-9]{2,6}$/.test(v) ? null : 'Format is a short file type, e.g. PDF'),
      size: v => (!v || /^\d+(\.\d+)?\s?(KB|MB|GB)$/i.test(v) ? null : 'Size looks like 4.2 MB'),
      url: R.url,
    },
  );
  const { values: v, set } = form;

  function onFiles(files: Attachment[]) {
    set('files', files);
    const f = files[0];
    if (f) form.setValues(p => ({ ...p, files, format: fileExt(f.name), size: fileSize(f.size), title: p.title || f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }));
  }

  return (
    <form
      className="stack"
      style={{ gap: 18 }}
      onSubmit={form.submit(async ({ files, ...rest }) => {
        if (!files.length && !rest.url.trim()) throw new Error('Upload a file or add a link');
        await onSubmit({ ...rest, file: files[0] ?? null });
      })}
    >
      <Input label="Title" required placeholder="e.g. Fleet tracking case study" {...form.bind('title')} />
      <div className="field">
        <span>Type</span>
        <Chips tabs={RESOURCE_TYPES} value={v.type} onChange={t => set('type', t)} />
      </div>

      <div className="field">
        <span>File</span>
        <FileUploader single value={v.files} onChange={onFiles} hint={`Case study, deck, brochure or video · PDF, PPTX, DOCX, images up to ${MAX_FILE_MB} MB · MP4, MOV, WEBM videos up to ${MAX_VIDEO_MB} MB`} />
      </div>

      <div className="grid-f" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
        <Input label="Industry" placeholder="All" {...form.bind('industry')} />
        <Input label="Format" placeholder="PDF" {...form.bind('format')} />
        <Input label="Size" placeholder="4.2 MB" {...form.bind('size')} />
      </div>
      {!v.files.length && <Input label="Or link to the file" hint="Only if the file is hosted elsewhere" placeholder="https://…" {...form.bind('url')} />}

      <Toggle on={v.hidden} onChange={h => set('hidden', h)} title="Hide from partners" sub="Hidden files stay here for admins only" />
      <FormError error={form.error} />
      <div className="form-foot">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="fire" icon="check" loading={form.busy}>Save</Button>
      </div>
    </form>
  );
}
