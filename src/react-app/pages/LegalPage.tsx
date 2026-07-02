import React from 'react';
import { motion } from 'framer-motion';

export default function LegalPage({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-8">{title}</h1>
        <div className="prose prose-lg prose-invert max-w-none bg-base-200 p-8 rounded-box border border-base-300">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
