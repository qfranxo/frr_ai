"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-48 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          ><br />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-kode-mono">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI-generated models
              </span>
              <br />
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold bg-gradient-to-r from-blue-700 to-purple-500 bg-clip-text text-transparent font-kode-mono">
            for high-end commerce.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}