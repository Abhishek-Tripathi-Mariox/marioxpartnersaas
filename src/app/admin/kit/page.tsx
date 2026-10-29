'use client';

import { useRef, useState } from 'react';
import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { ResourceGrid } from '@/components/kit/ResourceGrid';
import { Button, Modal, PageHeader, useToast } from '@/components/ui';
import { api } from '@/lib/client';
import { RESOURCE_TYPES } from '@/lib/constants';
import type { Resource } from '@/types';

const FIELDS: FieldDef[] = [
  { name: 'title', label: 'Title', required: true, full: true },
  { name: 'type', label: 'Type', type: 'chips', options: RESOURCE_TYPES },
  { name: 'industry', label: 'Industry', placeholder: 'All' },
  { name: 'format', label: 'Format', placeholder: 'PDF' },
  { name: 'size', label: 'Size', placeholder: '4.2 MB' },
  { name: 'url', label: 'File URL', placeholder: 'https://…', full: true },
  { name: 'hidden', label: 'Hide from partners', type: 'checkbox' },
];

export default function AdminKitPage() {
  const toast = useToast();
  const reloadRef = useRef<() => void>(() => {});
  const reload = () => reloadRef.current();
  const [editing, setEditing] = useState<Partial<Resource> | null>(null);

  async function save(v: Record<string, unknown>) {
    const body = Object.fromEntries(FIELDS.map(f => [f.name, v[f.name]]));
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
            <Button size="xs" onClick={() => setEditing(r)}>Edit</Button>
            <Button size="xs" variant="danger" icon="trash" onClick={() => remove(r)} aria-label="Delete" />
          </span>
        )}
      />
      {editing && (
        <Modal open title={editing._id ? 'Edit file' : 'Add file'} onClose={() => setEditing(null)}>
          <DynamicForm fields={FIELDS} initial={editing as Record<string, unknown>} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
