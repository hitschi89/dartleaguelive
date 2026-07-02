import { useState } from 'react';
import { Users, Plus, Trash2, Mail, Phone, Pencil } from 'lucide-react';
import { useTeam } from '../hooks/useTeam.js';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal } from '../components/ui.jsx';

const ROLES = ['Teamchef', 'Fahrer', 'Ingenieur', 'Mechaniker', 'Strategie', 'Sonstiges'];
const ROLE_TONE = { Teamchef: 'accent', Fahrer: 'red', Ingenieur: 'blue', Mechaniker: 'amber', Strategie: 'green', Sonstiges: 'slate' };

function MemberModal({ open, onClose, onSave, onDelete, initial }) {
  const [form, setForm] = useState(initial || { name: '', role: 'Fahrer', email: '', phone: '', notes: '' });
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) return;
    await onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Kontakt bearbeiten' : 'Neues Teammitglied'}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Name</label>
          <Input value={form.name} onChange={update('name')} placeholder="Vor- und Nachname" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Rolle</label>
          <Select value={form.role} onChange={update('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">E-Mail</label>
            <Input type="email" value={form.email} onChange={update('email')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Telefon</label>
            <Input value={form.phone} onChange={update('phone')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Notizen</label>
          <Textarea rows={3} value={form.notes} onChange={update('notes')} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit}>
            Speichern
          </Button>
          {initial?.id && (
            <Button
              variant="danger"
              onClick={async () => {
                await onDelete(initial.id);
                onClose();
              }}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function Team() {
  const { members, loading, addMember, updateMember, removeMember } = useTeam();
  const [modalState, setModalState] = useState(null);

  return (
    <div>
      <PageHeader
        title="Team & Kontakte"
        subtitle="Fahrer, Ingenieure, Teamchefs und weitere Ansprechpartner."
        action={
          <Button onClick={() => setModalState({ name: '', role: 'Fahrer', email: '', phone: '', notes: '' })}>
            <Plus size={16} /> Mitglied hinzufügen
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted">Lade Team…</p>
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Noch keine Teammitglieder" description="Füge Fahrer, Ingenieure oder weitere Kontakte hinzu." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">{m.name}</p>
                  <Badge tone={ROLE_TONE[m.role] || 'slate'}>{m.role}</Badge>
                </div>
                <button onClick={() => setModalState(m)} className="text-muted hover:text-accent">
                  <Pencil size={15} />
                </button>
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-secondary">
                {m.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={13} /> {m.email}
                  </p>
                )}
                {m.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={13} /> {m.phone}
                  </p>
                )}
              </div>
              {m.notes && <p className="mt-2 text-xs text-muted">{m.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {modalState && (
        <MemberModal
          open={!!modalState}
          onClose={() => setModalState(null)}
          initial={modalState}
          onSave={async (data) => {
            if (data.id) await updateMember(data.id, data);
            else await addMember(data);
          }}
          onDelete={removeMember}
        />
      )}
    </div>
  );
}
