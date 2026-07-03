import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function SetupNotice() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-lg rounded-xl border border-app bg-card p-8 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <AlertTriangle size={20} />
          </div>
          <h1 className="font-display text-lg font-semibold text-primary">{t('auth.setupNoticeTitle')}</h1>
        </div>
        <p className="mb-3 text-sm text-secondary">{t('auth.setupNoticeIntro')}</p>
        <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-sm text-secondary">
          <li>{t('auth.setupStep1')}</li>
          <li>{t('auth.setupStep2')}</li>
          <li>{t('auth.setupStep3')}</li>
          <li>{t('auth.setupStep4')}</li>
          <li>{t('auth.setupStep5')}</li>
        </ol>
      </div>
    </div>
  );
}
