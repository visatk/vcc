import React from 'react';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section 
      aria-label="Welcome section"
      className="hero min-h-[70vh] bg-base-100 relative overflow-hidden"
    >
      {/* Decorative Aurora Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none contain-layout">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/20 blur-[120px] mix-blend-screen gpu-accelerated"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-secondary/20 blur-[100px] mix-blend-screen gpu-accelerated"
        />
      </div>

      <div className="hero-content text-center z-10 w-full max-w-4xl px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            className="badge badge-primary badge-outline mb-8 px-5 py-4 font-bold uppercase tracking-[0.2em] text-[10px] glass-panel gpu-accelerated"
          >
            Welcome to the Future
          </motion.div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-8">
            Premium Tools & <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-gradient">
              Automated Scripts
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl opacity-70 mb-12 max-w-2xl font-medium tracking-tight leading-relaxed">
            Level up your workflow with our hand-picked collection of premium apps. 
            Enjoy seamless, secure <span className="text-primary font-bold">Crypto payments</span> via ApiRone.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-lg shadow-[0_0_30px_rgba(var(--color-primary),0.3)] rounded-full px-12 font-bold tracking-wide border-none glow-effect gpu-accelerated"
            >
              Start Exploring
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-outline btn-lg rounded-full px-12 font-bold tracking-wide glass-panel hover:bg-white/10 hover:border-white/20 border-white/10 transition-all gpu-accelerated"
            >
              View Documentation
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
