import { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, Search, Trash2, Tag } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments.js';
import { Card, PageHeader, Button, Input, EmptyState, Badge, Modal } from '../components/ui.jsx';

const SUGGESTED_CATEGORIES = [
  'Technisches Reglement',
  'Sportliches Reglement',
  'Streckenpläne',
  'Bulletins',
  'Verträge',
  'Sonstiges',
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadModal({ open, onClose }) {
  const { pickFiles, addDocument } = useDocuments();
  const [picked, setPicked] = useState([]);
  const [category, setCategory] = useState('Technisches Reglement');
  const [tags, setTags] = useState('');
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
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      for (const file of picked) {
        await addDocument({ file, category, tags: tagList });
      }
      setPicked([]);
      setTags('');
      onClose();
    } catch (err) {
      setError(err.message || 'Upload fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dokumente hochladen">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <Button variant="secondary" onClick={handlePick} className="w-full">
            <Upload size={16} /> Datei auswählen
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
          <label className="mb-1 block text-xs font-medium text-secondary">Kategorie</label>
          <Input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="categories">
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Tags (kommagetrennt)</label>
          <Input
            placeholder="z. B. Motor, Reifen, 2026"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <Button className="w-full" disabled={!picked.length || busy} onClick={handleSubmit}>
          {busy ? 'Wird hochgeladen…' : 'Dokument hinzufügen'}
        </Button>
      </div>
    </Modal>
  );
}

function PreviewModal({ doc, onClose }) {
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
        <p className="py-12 text-center text-sm text-muted">Lade Vorschau…</p>
      ) : isPdf ? (
        <iframe title={doc.file_name} src={url} className="h-[70vh] w-full rounded-lg border border-app" />
      ) : isImage ? (
        <img src={url} alt={doc.file_name} className="max-h-[70vh] w-full rounded-lg object-contain" />
      ) : (
        <div className="py-8 text-center">
          <p className="mb-3 text-sm text-muted">Keine Inline-Vorschau für diesen Dateityp verfügbar.</p>
          <a href={url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            Datei in neuem Tab öffnen
          </a>
        </div>
      )}
    </Modal>
  );
}

export default function Documents() {
  const { documents, loading, removeDocument } = useDocuments();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Alle');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const categories = useMemo(
    () => ['Alle', ...Array.from(new Set(documents.map((d) => d.category)))],
    [documents]
  );

  const filtered = documents.filter((d) => {
    const matchesCategory = activeCategory === 'Alle' || d.category === activeCategory;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || d.file_name.toLowerCase().includes(q) || (d.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  return (
    <div>
      <PageHeader
        title="Dokumente"
        subtitle="Reglements, technische Unterlagen und Streckenpläne an einem Ort."
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> Hochladen
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Suche nach Dateiname oder Tag…"
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
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Lade Dokumente…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Keine Dokumente gefunden"
          description="Lade Reglements, technische Unterlagen oder Streckenpläne hoch."
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Upload size={16} /> Dokument hochladen
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
                  {formatSize(doc.size)} · {new Date(doc.added_at).toLocaleDateString('de-DE')}
                </p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{doc.category}</Badge>
                {(doc.tags || []).map((t) => (
                  <Badge key={t}>
                    <Tag size={10} className="mr-1 inline" />
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex justify-end border-t border-app pt-3">
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="flex items-center gap-1 text-xs text-muted hover:text-red-400"
                >
                  <Trash2 size={13} /> Löschen
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
