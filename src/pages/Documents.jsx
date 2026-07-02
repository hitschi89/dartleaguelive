import { useMemo, useState } from 'react';
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

function UploadModal({ open, onClose, onUploaded }) {
  const { pickFiles, addDocument } = useDocuments();
  const [picked, setPicked] = useState([]);
  const [category, setCategory] = useState('Technisches Reglement');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);

  const handlePick = async () => {
    const files = await pickFiles();
    if (files.length) setPicked(files);
  };

  const handleSubmit = async () => {
    if (!picked.length) return;
    setBusy(true);
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    for (const file of picked) {
      await addDocument({ filePath: file.filePath, originalName: file.name, category, tags: tagList });
    }
    setBusy(false);
    setPicked([]);
    setTags('');
    onUploaded?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Dokumente hochladen">
      <div className="space-y-4">
        <div>
          <Button variant="secondary" onClick={handlePick} className="w-full">
            <Upload size={16} /> Dateien auswählen
          </Button>
          {picked.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-secondary">
              {picked.map((f) => (
                <li key={f.filePath} className="flex items-center justify-between">
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
          {busy ? 'Wird hochgeladen…' : `${picked.length || ''} Dokument(e) hinzufügen`}
        </Button>
      </div>
    </Modal>
  );
}

function PreviewModal({ doc, onClose }) {
  const { readDocument } = useDocuments();
  const [src, setSrc] = useState(null);
  const [mime, setMime] = useState(null);

  useMemo(() => {
    if (!doc) return;
    readDocument(doc.id).then((res) => {
      if (!res) return;
      setMime(res.mime);
      const byteChars = atob(res.data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: res.mime });
      setSrc(URL.createObjectURL(blob));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  if (!doc) return null;

  return (
    <Modal open={!!doc} onClose={onClose} title={doc.fileName} wide>
      {!src ? (
        <p className="py-12 text-center text-sm text-muted">Lade Vorschau…</p>
      ) : mime === 'application/pdf' ? (
        <iframe title={doc.fileName} src={src} className="h-[70vh] w-full rounded-lg border border-app" />
      ) : mime?.startsWith('image/') ? (
        <img src={src} alt={doc.fileName} className="max-h-[70vh] w-full rounded-lg object-contain" />
      ) : (
        <p className="py-12 text-center text-sm text-muted">
          Keine Vorschau für diesen Dateityp verfügbar.
        </p>
      )}
    </Modal>
  );
}

export default function Documents() {
  const { documents, loading, removeDocument, reload } = useDocuments();
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
      !q || d.fileName.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q));
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
                <p className="line-clamp-2 text-sm font-medium text-primary">{doc.fileName}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatSize(doc.size)} · {new Date(doc.addedAt).toLocaleDateString('de-DE')}
                </p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{doc.category}</Badge>
                {doc.tags.map((t) => (
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

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={reload} />
      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
