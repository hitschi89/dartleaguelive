import { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, Search, Trash2, Tag, Lock } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments.js';
import { ROLES } from '../lib/roles.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Card, PageHeader, Button, Input, EmptyState, Badge, Modal, RoleVisibilityPicker } from '../components/ui.jsx';

const ALL_CATEGORY = '__all__';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadModal({ open, onClose }) {
  const { t } = useLanguage();
  const suggestedCategories = t('documents.suggestedCategories');
  const { pickFiles, addDocument } = useDocuments();
  const [picked, setPicked] = useState([]);
  const [category, setCategory] = useState(suggestedCategories[0]);
  const [tags, setTags] = useState('');
  const [visibleRoles, setVisibleRoles] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handlePick = async () => {
    const files = await pickFiles();
    if (files.length) setPicked(files);
  };

  const handleSubmit = async () => {
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    const tagList = tags
      .split(',')
      .map((tg) => tg.trim())
      .filter(Boolean);
    try {
      for (const file of picked) {
        await addDocument({ file, category, tags: tagList, visibleRoles });
      }
      setPicked([]);
      setTags('');
      setVisibleRoles(null);
      onClose();
    } catch (err) {
      setError(err.message || t('documents.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('documents.uploadModalTitle')}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <Button variant="secondary" onClick={handlePick} className="w-full">
            <Upload size={16} /> {t('documents.pickFile')}
          </Button>
          {picked.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-secondary">
              {picked.map((f) => (
                <li key={f.name} className="flex items-center justify-between">
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-muted">{formatSize(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('documents.category')}</label>
          <Input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="categories">
            {suggestedCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">{t('documents.tags')}</label>
          <Input placeholder={t('documents.tagsPlaceholder')} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <RoleVisibilityPicker
          label={t('common.visibleForRoles')}
          roles={ROLES}
          value={visibleRoles}
          onChange={setVisibleRoles}
        />

        <Button className="w-full" disabled={!picked.length || busy} onClick={handleSubmit}>
          {busy ? t('documents.uploading') : t('documents.addDocument')}
        </Button>
      </div>
    </Modal>
  );
}

function PreviewModal({ doc, onClose }) {
  const { t } = useLanguage();
  const { readDocument } = useDocuments();
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!doc) return;
    setUrl(null);
    readDocument(doc.id).then((res) => setUrl(res?.url || null));
  }, [doc, readDocument]);

  if (!doc) return null;
  const isPdf = doc.file_name.toLowerCase().endsWith('.pdf');
  const isImage = /\.(png|jpe?g|gif)$/i.test(doc.file_name);

  return (
    <Modal open={!!doc} onClose={onClose} title={doc.file_name} wide>
      {!url ? (
        <p className="py-12 text-center text-sm text-muted">{t('documents.loadingPreview')}</p>
      ) : isPdf ? (
        <iframe title={doc.file_name} src={url} className="h-[70vh] w-full rounded-lg border border-app" />
      ) : isImage ? (
        <img src={url} alt={doc.file_name} className="max-h-[70vh] w-full rounded-lg object-contain" />
      ) : (
        <div className="py-8 text-center">
          <p className="mb-3 text-sm text-muted">{t('documents.noPreview')}</p>
          <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            {t('documents.openInNewTab')}
          </a>
        </div>
      )}
    </Modal>
  );
}

export default function Documents() {
  const { t, tRole, locale } = useLanguage();
  const { documents, loading, removeDocument } = useDocuments();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const categories = useMemo(
    () => [ALL_CATEGORY, ...Array.from(new Set(documents.map((d) => d.category)))],
    [documents]
  );

  const filtered = documents.filter((d) => {
    const matchesCategory = activeCategory === ALL_CATEGORY || d.category === activeCategory;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || d.file_name.toLowerCase().includes(q) || (d.tags || []).some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  return (
    <div>
      <PageHeader
        title={t('documents.title')}
        subtitle={t('documents.subtitle')}
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> {t('documents.upload')}
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder={t('documents.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-app text-secondary hover-app'
              }`}
            >
              {cat === ALL_CATEGORY ? t('common.all') : cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">{t('documents.loadingDocuments')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('documents.noDocumentsFound')}
          description={t('documents.noDocumentsDescription')}
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Upload size={16} /> {t('documents.uploadDocument')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <button
                onClick={() => setPreviewDoc(doc)}
                className="flex flex-1 flex-col items-start text-left"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <FileText size={20} />
                </div>
                <p className="line-clamp-2 text-sm font-medium text-primary">{doc.file_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatSize(doc.size)} · {new Date(doc.added_at).toLocaleDateString(locale)}
                </p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{doc.category}</Badge>
                {(doc.tags || []).map((tag) => (
                  <Badge key={tag}>
                    <Tag size={10} className="mr-1 inline" />
                    {tag}
                  </Badge>
                ))}
                {doc.visible_roles && doc.visible_roles.length > 0 && (
                  <Badge tone="amber">
                    <Lock size={10} className="mr-1 inline" />
                    {doc.visible_roles.map(tRole).join(', ')}
                  </Badge>
                )}
              </div>
              <div className="mt-4 flex justify-end border-t border-app pt-3">
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="flex items-center gap-1 text-xs text-muted hover:text-red-400"
                >
                  <Trash2 size={13} /> {t('common.delete')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
