import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadFile } from '../../lib/storage';
import { toast } from 'sonner';
import { Icon } from '../ui/Icon';
interface LightboxImage {
  id: string;
  file_path: string;
  file_name: string;
  signedUrl: string;
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [images.length, onClose]);

  const current = images[index];

  const handleDownload = async () => {
    try {
      await downloadFile(current.file_path, current.file_name);
      toast.success('Saved to your device');
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button onClick={handleDownload} className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-white transition-colors">
          <Icon name="download" size={20} />
        </button>
        <button onClick={onClose} className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-white transition-colors">
          <Icon name="close" size={20} />
        </button>
      </div>

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={current.signedUrl}
          alt={current.file_name}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="max-w-full max-h-[85vh] object-contain rounded-xl"
          draggable={false}
        />
      </AnimatePresence>

      {/* Navigation */}
      {index > 0 && (
        <button
          onClick={() => setIndex(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
        >
          <Icon name="chevron_left" size={22} />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={() => setIndex(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
        >
          <Icon name="chevron_right" size={22} />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
