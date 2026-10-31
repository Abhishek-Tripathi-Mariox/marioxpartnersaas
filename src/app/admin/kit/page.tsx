'use client';

import { useRef, useState } from 'react';
import { KitForm, type KitPayload } from '@/components/kit/KitForm';
import { ResourceGrid } from '@/components/kit/ResourceGrid';
import { Button, Icon, Modal, PageHeader, useToast } from '@/components/ui';
import { DownloadButton } from '@/components/forms/FileUploader';
import { api } from '@/lib/client';
import type { Resource } from '@/types';

export default function AdminKitPage() {
  const toast = useToast();
  const reloadRef = useRef<() => void>(() => {});
  const reload = () => reloadRef.current();
  const [editing, setEditing] = useState<Partial<Resource> | null>(null);

  async function save(body: KitPayload) {
    if (editing?._id) await api.patch(`/api/resources/${editing._id}`, body);
    else await api.post('/api/resources', body);
    setEditing(null);
    toast('Saved');
    reload();
  }

  async function remove(r: Resource) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    await api.del(`/api/resources/${r._id}`);
    reload();
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Sales kit" subtitle="Files every partner can download from their toolkit." actions={<Button variant="fire" icon="plus" onClick={() => setEditing({})}>Add file</Button>} />
      <ResourceGrid
        listRef={r => (reloadRef.current = r)}
        action={r => (
          <span className="row" style={{ gap: 6 }}>
            {r.file ? <DownloadButton file={r.file} /> : r.url ? <a className="x dl-btn" href={r.url} target="_blank" rel="noreferrer" aria-label="Open link"><Icon name="arrUR" size="s" /></a> : null}
            <Button size="xs" onClick={() => setEditing(r)}>Edit</Button>
            <Button size="xs" variant="danger" icon="trash" onClick={() => remove(r)} aria-label="Delete" />
          </span>
        )}
      />
      {editing && (
        <Modal open title={editing._id ? 'Edit file' : 'Add file'} onClose={() => setEditing(null)}>
          <KitForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
