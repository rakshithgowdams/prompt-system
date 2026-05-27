import { motion } from 'framer-motion';
import { ImageReducerTool } from '../components/tools/ImageReducerTool';
import { Icon } from '../components/ui/Icon';

export function ImageReducerPage() {
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Icon name="photo_size_select_large" size={22} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-extrabold text-ink-900 tracking-tight leading-tight">
              Image Reducer
            </h1>
            <p className="text-ink-500 text-sm mt-0.5">
              Compress images to any target size — all processing happens in your browser
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.05 }}
      >
        <ImageReducerTool />
      </motion.div>
    </div>
  );
}
