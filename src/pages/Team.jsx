import { useEffect, useState } from 'react';
import { Users, Trash2, Mail, Phone, Pencil, Copy, Check, HeartPulse } from 'lucide-react';
import { useTeam } from '../hooks/useTeam.js';
import { useEmergencyInfo } from '../hooks/useEmergencyInfo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card, PageHeader, Button, Input, Textarea, Select, Badge, EmptyState, Modal } from '../components/ui.jsx';
import { ROLES, ROLE_TONE } from '../lib/roles.js';

function MemberModal({ open, onClose, onSave, onDelete, initial, canEditRole, canDelete }) {
  const { t, tRole } = useLanguage();
  const [form, setForm] = useState(initial);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.display_name.trim()) return;
    await onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('team.editModalTitle')}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('team.name')}</label>
          <Input value={form.display_name} onChange={update('display_name')} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('team.role')}</label>
          <Select value={form.role} onChange={update('role')} disabled={!canEditRole}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRole(r)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('team.email')}</label>
            <Input type="email" value={form.email || ''} onChange={update('email')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('team.phone')}</label>
            <Input value={form.phone || ''} onChange={update('phone')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('team.notes')}</label>
          <Textarea rows={3} value={form.notes || ''} onChange={update('notes')} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={submit}>
            {t('common.save')}
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

function EmergencyModal({ open, onClose, member }) {
  const { t } = useLanguage();
  const { info, loading, save } = useEmergencyInfo(member?.id);
  const [form, setForm] = useState({ contact_name: '', contact_phone: '', medical_notes: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (info) {
      setForm({
        contact_name: info.contact_name || '',
        contact_phone: info.contact_phone || '',
        medical_notes: info.medical_notes || '',
      });
    } else {
      setForm({ contact_name: '', contact_phone: '', medical_notes: '' });
    }
  }, [info]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    await save(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('team.emergencyInfo')}>
      {loading ? (
        <p className="text-sm text-muted">{t('team.loadingTeam')}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">{t('team.emergencyPrivacyHint')}</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('team.emergencyContactName')}</label>
            <Input value={form.contact_name} onChange={update('contact_name')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('team.emergencyContactPhone')}</label>
            <Input value={form.contact_phone} onChange={update('contact_phone')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">{t('team.emergencyMedicalNotes')}</label>
            <Textarea rows={3} value={form.medical_notes} onChange={update('medical_notes')} />
          </div>
          <Button className="w-full" onClick={submit}>
            {saved ? <Check size={15} /> : null}
            {saved ? t('team.emergencySaved') : t('team.emergencySave')}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export default function Team() {
  const { t, tRole } = useLanguage();
  const { members, loading, updateMember, removeMember } = useTeam();
  const { team, user, role } = useAuth();
  const [modalState, setModalState] = useState(null);
  const [emergencyMember, setEmergencyMember] = useState(null);
  const [copied, setCopied] = useState(false);
  const isAdmin = role === 'Teamchef';

  const copyInvite = async () => {
    await navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader title={t('team.title')} subtitle={t('team.subtitle')} />

      <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">{t('team.inviteCodeTitle', { team: team?.name })}</p>
          <p className="text-xs text-secondary">{t('team.inviteCodeSubtitle')}</p>
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
        <p className="text-sm text-muted">{t('team.loadingTeam')}</p>
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title={t('team.noMembers')} />
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
                      {isSelf && <span className="ml-1 text-xs text-muted">{t('team.you')}</span>}
                    </p>
                    <Badge tone={ROLE_TONE[m.role] || 'slate'}>{tRole(m.role)}</Badge>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEmergencyMember(m)}
                        title={t('team.emergencyInfo')}
                        className="text-muted hover:text-accent"
                      >
                        <HeartPulse size={15} />
                      </button>
                      <button onClick={() => setModalState(m)} className="text-muted hover:text-accent">
                        <Pencil size={15} />
                      </button>
                    </div>
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

      {emergencyMember && (
        <EmergencyModal open={!!emergencyMember} onClose={() => setEmergencyMember(null)} member={emergencyMember} />
      )}
    </div>
  );
}
