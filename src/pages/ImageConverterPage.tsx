import { motion } from 'framer-motion';
import { ImageConverterTool } from '../components/tools/ImageConverterTool';
import { Icon } from '../components/ui/Icon';

export function ImageConverterPage() {
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center flex-shrink-0">
            <Icon name="swap_horiz" size={22} className="text-sky-700" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-extrabold text-ink-900 tracking-tight leading-tight">
              Image Converter
            </h1>
            <p className="text-ink-500 text-sm mt-0.5">
              Convert between JPEG, PNG, WebP, AVIF and more — right in your browser
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.05 }}
      >
        <ImageConverterTool />
      </motion.div>
    </div>
  );
}
