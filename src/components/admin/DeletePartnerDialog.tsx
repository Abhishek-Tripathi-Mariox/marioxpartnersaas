'use client';

import { useState } from 'react';
import { Button, FormError, Input, Modal } from '@/components/ui';
import { api } from '@/lib/client';

// Confirms deleting a partner account. Their leads, requests and uploaded files go too, so the admin
// types DELETE first. Partners with projects (payment records) can't be deleted; suspend them instead.
export function DeletePartnerDialog({ partner, onClose, onDeleted }: { partner: { id: string; name: string; email?: string }; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.del(`/api/admin/users/${partner.id}`);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open title={`Delete ${partner.name}?`} subtitle={partner.email} onClose={onClose}>
      <div className="stack">
        <div className="form-error">
          This permanently removes the account, all their leads, scope approvals, office visits, tech requests, support tickets and uploaded files. It can't be undone.
        </div>
        <p className="sub" style={{ fontSize: 13.5 }}>Partners with projects can't be deleted because their payment records must stay. Suspend them instead.</p>
        <Input label="Type DELETE to confirm" autoFocus autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} placeholder="DELETE" />
        <FormError error={error} />
        <div className="form-foot">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" icon="trash" loading={busy} disabled={typed.trim() !== 'DELETE'} onClick={remove}>Delete partner</Button>
        </div>
      </div>
    </Modal>
  );
}
