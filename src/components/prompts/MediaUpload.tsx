import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { uploadImage, uploadVideo, uploadAnyFile, getFileCategory, formatFileSize } from '../../lib/storage';
import { useAddMediaFile } from '../../hooks/usePrompts';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/utils';
import type { MediaFile } from '../../lib/database.types';
import type { FileCategory } from '../../lib/storage';

interface MediaUploadProps {
  promptId: string;
  existingFiles: MediaFile[];
  onFilesChange?: () => void;
}

interface UploadItem {
  id: string;
  name: string;
  size: number;
  category: FileCategory;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

function categoryIconName(category: FileCategory): string {
  switch (category) {
    case 'image': return 'image';
    case 'video': return 'videocam';
    case 'audio': return 'music_note';
    case 'document': return 'description';
    default: return 'attach_file';
  }
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Animated radial progress ring
function ProgressRing({ progress, status }: { progress: number; status: UploadItem['status'] }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <svg width="36" height="36" className="flex-shrink-0 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#374151" strokeWidth="2.5" />
      <motion.circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        stroke={status === 'error' ? '#f87171' : status === 'done' ? '#34d399' : '#3b82f6'}
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      {/* Center icon */}
      <g transform="translate(18,18) rotate(90)">
        {status === 'done' && (
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            d="M-5,0 L-1.5,3.5 L5,-4"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {status === 'error' && (
          <motion.g initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}>
            <line x1="-4" y1="-4" x2="4" y2="4" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="-4" x2="-4" y2="4" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        )}
        {status === 'uploading' && (
          <motion.text
            y="4"
            textAnchor="middle"
            fontSize="7"
            fontWeight="600"
            fill="#93c5fd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Math.round(progress)}
          </motion.text>
        )}
      </g>
    </svg>
  );
}

export function MediaUpload({ promptId, existingFiles, onFilesChange }: MediaUploadProps) {
  const { user } = useAuth();
  const addMedia = useAddMediaFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const imageCount = existingFiles.filter((f) => f.file_type === 'image').length;

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const removeItem = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const processFile = async (file: File) => {
    const category = getFileCategory(file.type);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (category === 'image' && file.size > MAX_IMAGE_SIZE) {
      toast.error(`${file.name}: images must be under 10 MB`);
      return;
    }
    if (category === 'video' && file.size > MAX_VIDEO_SIZE) {
      toast.error(`${file.name}: videos must be under 200 MB`);
      return;
    }
    if (category !== 'image' && category !== 'video' && file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: files must be under 50 MB`);
      return;
    }
    if (category === 'image' && imageCount >= 20) {
      toast.error('Maximum 20 images per prompt');
      return;
    }

    setUploads((prev) => [...prev, { id, name: file.name, size: file.size, category, progress: 0, status: 'uploading' }]);

    try {
      let path: string;
      if (category === 'image') {
        path = await uploadImage(user!.id, file, (pct) => updateItem(id, { progress: pct }));
      } else if (category === 'video') {
        updateItem(id, { progress: 20 });
        path = await uploadVideo(user!.id, file);
        updateItem(id, { progress: 80 });
      } else {
        updateItem(id, { progress: 40 });
        path = await uploadAnyFile(user!.id, file);
        updateItem(id, { progress: 80 });
      }

      await addMedia.mutateAsync({
        prompt_id: promptId,
        file_path: path,
        file_type: category,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      updateItem(id, { progress: 100, status: 'done' });
      onFilesChange?.();
      setTimeout(() => removeItem(id), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateItem(id, { status: 'error', errorMsg: msg });
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(processFile);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-200">Attachments</p>
        <span className="text-xs text-gray-500">
          {existingFiles.length} file{existingFiles.length !== 1 ? 's' : ''} attached
        </span>
      </div>

      {/* Drop zone */}
      <motion.div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        animate={dragging ? { scale: 1.02, borderColor: '#3b82f6' } : { scale: 1, borderColor: '#374151' }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors duration-200',
          dragging ? 'bg-blue-500/10' : 'hover:border-gray-500 hover:bg-gray-800/50 bg-gray-900/30',
        )}
      >
        {/* Animated upload icon */}
        <motion.div
          animate={dragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
            dragging ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500',
          )}
        >
          <Icon name="cloud_upload" size={22} />
        </motion.div>

        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">
            {dragging ? 'Drop to upload' : 'Drop files or click to browse'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Images · Videos · PDFs · Documents · Audio · Any file
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            { label: 'Images', icon: 'image', color: 'text-emerald-400 bg-emerald-400/10' },
            { label: 'Videos', icon: 'videocam', color: 'text-blue-400 bg-blue-400/10' },
            { label: 'Documents', icon: 'description', color: 'text-amber-400 bg-amber-400/10' },
            { label: 'Audio', icon: 'music_note', color: 'text-pink-400 bg-pink-400/10' },
          ].map(({ label, icon, color }) => (
            <span
              key={label}
              className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', color)}
            >
              <Icon name={icon} size={11} />
              {label}
            </span>
          ))}
        </div>

        {/* Drag ripple overlay */}
        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Active uploads */}
      <AnimatePresence mode="popLayout">
        {uploads.map((u) => (
          <motion.div
            key={u.id}
            layout
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border',
              u.status === 'error'
                ? 'bg-red-500/5 border-red-500/20'
                : u.status === 'done'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-gray-800/80 border-gray-700',
            )}
          >
            {/* Radial ring progress */}
            <ProgressRing progress={u.progress} status={u.status} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-medium text-gray-200 truncate">{u.name}</p>
                <span className="text-xs text-gray-500 flex-shrink-0">{formatFileSize(u.size)}</span>
              </div>

              {/* Segmented progress bar */}
              {u.status === 'uploading' && (
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                    initial={{ width: '0%' }}
                    animate={{ width: `${u.progress}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  />
                </div>
              )}
              {u.status === 'error' && (
                <p className="text-xs text-red-400">{u.errorMsg ?? 'Upload failed'}</p>
              )}
              {u.status === 'done' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-emerald-400"
                >
                  Uploaded successfully
                </motion.p>
              )}
            </div>

            <AnimatePresence>
              {(u.status === 'error' || u.status === 'done') && (
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  type="button"
                  onClick={() => removeItem(u.id)}
                  className="text-gray-500 hover:text-gray-300 flex-shrink-0 p-1 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Icon name="close" size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
