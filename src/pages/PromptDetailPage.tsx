import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { usePrompt, usePromptMedia, useDeletePrompt } from '../hooks/usePrompts';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge, PlatformBadge, TagChip } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/Modal';
import { Lightbox } from '../components/prompts/Lightbox';
import { Icon } from '../components/ui/Icon';
import { getSignedUrl, downloadFile, formatFileSize } from '../lib/storage';
import { downloadAllAsZip } from '../lib/download';
import { formatDate, cn } from '../lib/utils';
import type { MediaFile } from '../lib/database.types';

type MediaWithUrl = MediaFile & { signedUrl: string };

function FileTypeIcon({ mimeType, size = 18 }: { mimeType: string | null; size?: number }) {
  const t = mimeType ?? '';
  if (t.startsWith('image/')) return <Icon name="image" size={size} />;
  if (t.startsWith('video/')) return <Icon name="videocam" size={size} />;
  if (t.startsWith('audio/')) return <Icon name="music_note" size={size} />;
  if (t === 'application/pdf' || t.includes('word') || t.includes('excel') || t.includes('presentation') || t.startsWith('text/'))
    return <Icon name="description" size={size} />;
  return <Icon name="attach_file" size={size} />;
}

function fileTypeColor(mimeType: string | null): string {
  const t = mimeType ?? '';
  if (t.startsWith('image/')) return 'text-success bg-green-50';
  if (t.startsWith('video/')) return 'text-brand-400 bg-brand-50';
  if (t.startsWith('audio/')) return 'text-pink-500 bg-pink-50';
  if (t === 'application/pdf') return 'text-danger bg-red-50';
  if (t.includes('word') || t.includes('document')) return 'text-blue-500 bg-blue-50';
  if (t.includes('excel') || t.includes('spreadsheet')) return 'text-green-500 bg-green-50';
  return 'text-ink-500 bg-ink-100';
}

export function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: prompt, isLoading } = usePrompt(id ?? '');
  const { data: mediaFiles = [] } = usePromptMedia(id ?? '');
  const deletePrompt = useDeletePrompt();

  const [mediaWithUrls, setMediaWithUrls] = useState<MediaWithUrl[]>([]);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  useEffect(() => {
    const loadUrls = async () => {
      const results: MediaWithUrl[] = [];
      for (const f of mediaFiles) {
        try {
          const signedUrl = await getSignedUrl(f.file_path, 3600);
          results.push({ ...f, signedUrl });
        } catch { /* skip */ }
      }
      setMediaWithUrls(results);
    };
    if (mediaFiles.length > 0) loadUrls();
    else setMediaWithUrls([]);
  }, [mediaFiles]);

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.prompt_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deletePrompt.mutateAsync(id);
      toast.success('Prompt deleted');
      navigate(-1);
    } catch {
      toast.error('Failed to delete prompt');
    }
  };

  const handleDownloadFile = async (file: MediaWithUrl) => {
    try {
      await downloadFile(file.file_path, file.file_name);
      toast.success('Saved to your device');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleZip = async () => {
    if (!prompt) return;
    setZipLoading(true);
    try {
      await downloadAllAsZip(prompt, mediaFiles);
      toast.success('ZIP downloaded');
    } catch {
      toast.error('ZIP download failed');
    } finally {
      setZipLoading(false);
    }
  };

  const images = mediaWithUrls.filter((f) => f.file_type === 'image');
  const videos = mediaWithUrls.filter((f) => f.file_type === 'video');
  const others = mediaWithUrls.filter((f) => f.file_type !== 'image' && f.file_type !== 'video');

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!prompt) {
    return <div className="p-8 text-center text-ink-500">Prompt not found.</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="mt-1 p-2 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-900 transition-colors flex-shrink-0"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-display font-extrabold text-ink-900 tracking-tight">{prompt.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            Created {formatDate(prompt.created_at)} · Updated {formatDate(prompt.updated_at)}
          </p>
        </div>
      </motion.div>

      {/* Badges & actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <StatusBadge status={prompt.status} />
          <PlatformBadge platform={prompt.platform} />
          {prompt.tags.map((tag) => <TagChip key={tag} tag={tag} />)}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate(`/prompts/${id}/edit`)}>
            <Icon name="edit" size={14} />
            <span className="hidden xs:inline">Edit</span>
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Icon name="delete" size={14} />
            <span className="hidden xs:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Prompt text */}
      <div className="bg-white border border-ink-300 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-300 bg-ink-100">
          <span className="text-sm font-medium text-ink-700">Prompt</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors px-2 py-1 rounded-md hover:bg-white"
          >
            <Icon name={copied ? 'check' : 'content_copy'} size={13} className={copied ? 'text-success' : ''} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 text-sm text-ink-900 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto bg-ink-50">
          {prompt.prompt_text}
        </pre>
      </div>

      {/* Notes */}
      {prompt.notes && (
        <div className="bg-white border border-ink-300 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-2">
            <Icon name="sticky_note_2" size={15} />
            Notes
          </h3>
          <p className="text-sm text-ink-500 whitespace-pre-wrap leading-relaxed">{prompt.notes}</p>
        </div>
      )}

      {/* Image gallery */}
      {images.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-700 flex items-center gap-2 mb-3">
            <Icon name="photo_library" size={15} />
            Images
            <span className="text-xs font-normal text-ink-500 ml-1">({images.length})</span>
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="group relative aspect-square rounded-md overflow-hidden bg-ink-100 border border-ink-300 cursor-pointer"
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={img.signedUrl}
                  alt={img.file_name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                  <p className="text-xs text-white/90 truncate max-w-[70%]">{img.file_name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile(img); }}
                    className="bg-black/60 p-1.5 rounded-md text-white hover:bg-black/80 transition-colors"
                    title="Download"
                  >
                    <Icon name="download" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
            <Icon name="smart_display" size={15} />
            Videos
            <span className="text-xs font-normal text-ink-500 ml-1">({videos.length})</span>
          </h3>
          {videos.map((video) => (
            <div key={video.id} className="bg-white border border-ink-300 rounded-lg overflow-hidden">
              <video src={video.signedUrl} controls preload="metadata" className="w-full max-h-72 sm:max-h-96" />
              <div className="flex items-center justify-between px-4 py-3 border-t border-ink-300">
                <div className="min-w-0">
                  <p className="text-sm text-ink-900 truncate">{video.file_name}</p>
                  {video.file_size && <p className="text-xs text-ink-500">{formatFileSize(video.file_size)}</p>}
                </div>
                <button
                  onClick={() => handleDownloadFile(video)}
                  className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors px-3 py-1.5 rounded-md hover:bg-ink-100 flex-shrink-0 ml-3"
                >
                  <Icon name="download" size={13} />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents, Audio, Other files */}
      {others.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
            <Icon name="folder_open" size={15} />
            Files
            <span className="text-xs font-normal text-ink-500 ml-1">({others.length})</span>
          </h3>
          <div className="space-y-2">
            {others.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white border border-ink-300 rounded-md hover:border-ink-500 transition-colors"
              >
                <div className={cn('w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0', fileTypeColor(file.mime_type))}>
                  <FileTypeIcon mimeType={file.mime_type} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{file.file_name}</p>
                  <p className="text-xs text-ink-500">
                    {file.mime_type ?? file.file_type}
                    {file.file_size ? ` · ${formatFileSize(file.file_size)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadFile(file)}
                  className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors px-3 py-1.5 rounded-md hover:bg-ink-100 flex-shrink-0"
                >
                  <Icon name="download" size={13} />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download all ZIP */}
      {mediaFiles.length > 0 && (
        <div className="border border-ink-300 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Download All</p>
            <p className="text-xs text-ink-500 mt-0.5">
              Prompt text + {mediaFiles.length} attachment{mediaFiles.length !== 1 ? 's' : ''} as ZIP
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleZip} loading={zipLoading}>
            <Icon name="archive" size={14} />
            Download ZIP
          </Button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Prompt"
        message={`Are you sure you want to delete "${prompt.title}"? This will also delete all associated files. This action cannot be undone.`}
        loading={deletePrompt.isPending}
      />
    </div>
  );
}
