import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-500 mb-4 shadow-inner"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      >
        {icon}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
        className="text-lg font-semibold text-white mb-2"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24 }}
        className="text-gray-400 text-sm max-w-sm mb-6"
      >
        {description}
      </motion.p>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          <Button onClick={action.onClick}>{action.label}</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
