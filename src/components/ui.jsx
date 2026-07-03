import { useLanguage } from '../context/LanguageContext.jsx';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-app bg-card p-5 shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-700/40 text-slate-300',
    accent: 'bg-accent/15 text-accent',
    red: 'bg-red-500/15 text-red-400',
    amber: 'bg-amber-500/15 text-amber-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-sky-500/15 text-sky-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-app py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-card-alt text-muted">
          <Icon size={22} />
        </div>
      )}
      <p className="text-sm font-medium text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-600',
    secondary: 'bg-card-alt text-primary border border-app hover-app',
    ghost: 'bg-transparent text-secondary hover-app',
    danger: 'bg-red-600/90 text-white hover:bg-red-600',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-app bg-card-alt px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      {...props}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      className="w-full rounded-lg border border-app bg-card-alt px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      {...props}
    />
  );
}

export function Select(props) {
  return (
    <select
      className="w-full rounded-lg border border-app bg-card-alt px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      {...props}
    />
  );
}

export function RoleVisibilityPicker({ value, onChange, roles, label }) {
  const { t, tRole } = useLanguage();
  const isAll = !value || value.length === 0;
  const toggleRole = (role) => {
    if (isAll) {
      onChange(roles.filter((r) => r !== role));
    } else if (value.includes(role)) {
      const next = value.filter((r) => r !== role);
      onChange(next.length ? next : null);
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium text-secondary">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            isAll ? 'border-accent bg-accent/15 text-accent' : 'border-app text-secondary hover-app'
          }`}
        >
          {t('common.all')}
        </button>
        {roles.map((role) => {
          const active = isAll || value.includes(role);
          return (
            <button
              type="button"
              key={role}
              onClick={() => toggleRole(role)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                active && !isAll ? 'border-accent bg-accent/15 text-accent' : 'border-app text-secondary hover-app'
              }`}
            >
              {tRole(role)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto rounded-xl border border-app bg-card p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-primary">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
