import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ScrambleText } from '../components/ScrambleText';

export function AboutPage() {
  const title = "Chess Diagnostics";
  const letters = title.split("");

  return (
    <div className="flex flex-col gap-32 py-24 relative">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-[0.03]">
        <motion.div 
          animate={{ 
            backgroundPosition: ['0px 0px', '100px 100px'] 
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 20, 
            ease: "linear" 
          }}
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="flex flex-col items-center gap-16">
        <div className="flex flex-nowrap justify-center pb-4">
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.03, 
                ease: [0.2, 0.65, 0.3, 0.9] 
              }}
              className="font-sans font-bold text-5xl md:text-[6.5rem] lg:text-[8rem] leading-[0.85] tracking-tighter text-ink"
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          ))}
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
                delayChildren: 0.8
              }
            }
          }}
          className="flex flex-col md:flex-row justify-center items-start text-center gap-12 md:gap-24 mt-16 border-t border-black/10 pt-16 w-full"
        >
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }} 
            className="flex flex-col items-center gap-4 flex-1"
          >
            <span className="text-xs uppercase tracking-widest text-black/40 font-bold">Current Focus</span>
            <span className="text-base text-black/80 flex items-center justify-center gap-2">
              <ScrambleText text="Chess Diagnostics Pipeline" />
            </span>
          </motion.div>
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }} 
            className="flex flex-col items-center gap-4 max-w-md flex-1"
          >
            <span className="text-xs uppercase tracking-widest text-black/40 font-bold">Abstract</span>
            <p className="text-base text-black/70 leading-loose text-center">
              Automated batch processing of historical game data. Uses a Convolutional Neural Network (CNN) for Elo estimation, classifies structural errors, and generates prescriptive training plans.
            </p>
          </motion.div>
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }} 
            className="flex flex-col items-center gap-4 flex-1"
          >
            <span className="text-xs uppercase tracking-widest text-black/40 font-bold">Engine Specs</span>
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-mono text-indigo-600 flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse" />
                TF.js CNN Architecture
              </span>
              <span className="text-[10px] font-mono text-black/40">2x Conv2D + ReLU + Dense</span>
              <span className="text-[10px] font-mono text-black/40">8x8x12 Input Tensor</span>
              <Link to="/about" className="text-[10px] font-mono text-indigo-600 hover:underline mt-1 flex items-center justify-center gap-1">
                View Technical Specs <ChevronRight className="w-2 h-2" />
              </Link>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-20 relative w-fit mx-auto"
        >
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 bg-indigo-600/20 blur-xl rounded-full"
          />
          <Link 
            to="/diagnostics" 
            className="relative inline-flex items-center gap-6 bg-indigo-600 text-white px-16 py-8 text-base uppercase tracking-[0.2em] font-bold hover:bg-indigo-700 transition-all group overflow-hidden"
          >
            <motion.div 
              className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-shimmer"
            />
            Start Diagnostics
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center text-center gap-12 max-w-3xl mx-auto mt-24"
      >
        <h2 className="text-3xl font-sans font-bold text-black tracking-tight uppercase tracking-widest">The Mission</h2>
        <p className="text-xl text-black/70 leading-loose text-center">
          Chess Diagnostics was built to bridge the gap between raw data and actionable improvement. By leveraging modern machine learning techniques, we provide a diagnostic layer that traditional engines often overlook—focusing on human-readable patterns and structural weaknesses.
        </p>
      </motion.section>
    </div>
  );
}
