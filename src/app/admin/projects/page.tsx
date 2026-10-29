'use client';

import { useRef, useState } from 'react';
import { ProjectEditor, emptyProject, toValues } from '@/components/projects/ProjectEditor';
import { ProjectList } from '@/components/projects/ProjectList';
import { Button, Modal, PageHeader, useToast } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import type { Project, User } from '@/types';

type Editing = { id?: string; values: ReturnType<typeof emptyProject> };

export default function AdminProjectsPage() {
  const toast = useToast();
  const users = useApi<{ users: User[] }>('/api/admin/users?role=partner');
  const partners = users.data?.users ?? [];
  const [editing, setEditing] = useState<Editing | null>(null);
  const reload = useRef<() => void>(() => {});

  async function save(v: Editing['values']) {
    // Drop empty optional strings so the API stores them as unset.
    const payload = { ...v, payments: v.payments.map(p => ({ ...p, releasedAt: p.releasedAt || undefined, utr: p.utr || undefined })) };
    if (editing?.id) await api.patch(`/api/projects/${editing.id}`, payload);
    else await api.post('/api/projects', payload);
    setEditing(null);
    toast('Project saved');
    reload.current();
  }

  async function remove(p: Project) {
    if (!confirm(`Delete project for ${p.client}? Its payment and commission records go with it.`)) return;
    await api.del(`/api/projects/${p._id}`);
    toast('Project deleted');
    reload.current();
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Projects & payouts"
        subtitle="Update delivery stage, record client payments and release partner commissions."
        actions={<Button variant="fire" icon="plus" onClick={() => setEditing({ values: emptyProject() })}>New project</Button>}
      />
      <ProjectList
        partners={partners}
        listRef={r => (reload.current = r)}
        action={p => (
          <span className="row">
            <Button size="sm" icon="note" onClick={() => setEditing({ id: p._id, values: toValues(p) })}>Edit</Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => remove(p)} aria-label="Delete" />
          </span>
        )}
      />
      {editing && (
        <Modal open title={editing.id ? 'Edit project' : 'New project'} onClose={() => setEditing(null)} wide>
          <ProjectEditor initial={editing.values} partners={partners} onSubmit={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
