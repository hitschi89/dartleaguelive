import { useState } from 'react';
import { Users, Trash2, Mail, Phone, Pencil, Copy, Check } from 'lucide-react';
import { useTeam } from '../hooks/useTeam.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal } from '../components/ui.jsx';

const ROLES = ['Teamchef', 'Fahrer', 'Ingenieur', 'Mechaniker', 'Strategie', 'Sonstiges'];
const ROLE_TONE = { Teamchef: 'accent', Fahrer: 'red', Ingenieur: 'blue', Mechaniker: 'amber', Strategie: 'green', Sonstiges: 'slate' };

function MemberModal({ open, onClose, onSave, onDelete, initial, canEditRole, canDelete }) {
  const [form, setForm] = useState(initial);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.display_name.trim()) return;
    await onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Kontakt bearbeiten">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Name</label>
          <Input value={form.display_name} onChange={update('display_name')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Rolle</label>
          <Select value={form.role} onChange={update('role')} disabled={!canEditRole}>
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
            <Input type="email" value={form.email || ''} onChange={update('email')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Telefon</label>
            <Input value={form.phone || ''} onChange={update('phone')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Notizen</label>
          <Textarea rows={3} value={form.notes || ''} onChange={update('notes')} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit}>
            Speichern
          </Button>
          {canDelete && (
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
  const { members, loading, updateMember, removeMember } = useTeam();
  const { team, user, role } = useAuth();
  const [modalState, setModalState] = useState(null);
  const [copied, setCopied] = useState(false);
  const isAdmin = role === 'Teamchef';

  const copyInvite = async () => {
    await navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Team & Kontakte" subtitle="Fahrer, Ingenieure, Teamchefs und weitere Ansprechpartner." />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Einladungscode für {team?.name}</p>
          <p className="text-xs text-secondary">Teile diesen Code, damit neue Mitglieder eurem Team beitreten können.</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="rounded-lg border border-app bg-card-alt px-3 py-1.5 text-sm text-accent">
            {team?.invite_code}
          </code>
          <Button variant="secondary" onClick={copyInvite}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted">Lade Team…</p>
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Noch keine Teammitglieder" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const isSelf = m.user_id === user?.id;
            const canEdit = isSelf || isAdmin;
            return (
              <Card key={m.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {m.display_name}
                      {isSelf && <span className="ml-1 text-xs text-muted">(du)</span>}
                    </p>
                    <Badge tone={ROLE_TONE[m.role] || 'slate'}>{m.role}</Badge>
                  </div>
                  {canEdit && (
                    <button onClick={() => setModalState(m)} className="text-muted hover:text-accent">
                      <Pencil size={15} />
                    </button>
                  )}
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
            );
          })}
        </div>
      )}

      {modalState && (
        <MemberModal
          open={!!modalState}
          onClose={() => setModalState(null)}
          initial={modalState}
          canEditRole={isAdmin}
          canDelete={isAdmin && modalState.user_id !== user?.id}
          onSave={(data) => updateMember(data.id, data)}
          onDelete={removeMember}
        />
      )}
    </div>
  );
}
