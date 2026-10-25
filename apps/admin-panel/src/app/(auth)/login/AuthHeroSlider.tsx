"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface AuthHeroSlide {
  badge: string;
  title: string;
  description: string;
}

interface AuthHeroSliderProps {
  slides: AuthHeroSlide[];
  className?: string;
}

export function AuthHeroSlider({ slides, className }: AuthHeroSliderProps) {
  const normalizedSlides = useMemo(() => slides.filter((slide) => slide.title.trim().length > 0), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (normalizedSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % normalizedSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [normalizedSlides.length]);

  if (normalizedSlides.length === 0) {
    return null;
  }

  const activeSlide = normalizedSlides[activeIndex]!;

  return (
    <section
      className={cn(
        "auth-banner-surface relative overflow-hidden rounded-[28px] border border-white/80 p-6 text-slate-900 sm:p-8 lg:h-full lg:min-h-0 lg:p-10",
        "auth-soft-shadow",
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex h-full min-h-full flex-col gap-6 lg:justify-between"
      >
        <div className="flex items-center justify-between gap-3">
          <motion.span
            key={activeSlide.badge}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="inline-flex items-center rounded-full bg-auth-accent-soft px-3 py-1 text-xs font-semibold text-auth-accent"
          >
            {activeSlide.badge}
          </motion.span>

          <div className="flex items-center gap-2">
            {normalizedSlides.map((slide, index) => (
              <button
                key={`${slide.badge}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-2.5 rounded-full transition-all",
                  activeIndex === index ? "w-8 bg-auth-accent" : "w-2.5 bg-slate-300 hover:bg-slate-400",
                )}
                aria-label={`رفتن به اسلاید ${index + 1}`}
                aria-pressed={activeIndex === index}
              >
                {activeIndex === index && (
                  <motion.span
                    layoutId="auth-slider-dot"
                    className="absolute inset-0 rounded-full bg-auth-accent"
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-1 lg:justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.985 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col gap-6"
            >
              <div className="mx-auto w-full max-w-[360px]">
                <HeroIllustration />
              </div>

              <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3 text-center lg:text-right">
                <h2 className="text-2xl font-bold leading-10 text-slate-800 sm:text-[2rem]">
                  {activeSlide.title}
                </h2>
                <p className="text-sm leading-7 text-slate-500 sm:text-base">{activeSlide.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 text-xs text-slate-400">
          <motion.span
            key={`current-${activeIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {String(activeIndex + 1).padStart(2, "0")}
          </motion.span>
          <div className="h-px flex-1 bg-slate-200" />
          <span>{String(normalizedSlides.length).padStart(2, "0")}</span>
        </div>
      </motion.div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[360px]">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.6, 0.45] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-10 top-6 h-24 rounded-full bg-auth-accent/10 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.04, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-x-3 bottom-8 h-16 rounded-full bg-slate-200/70 blur-2xl"
      />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-3 top-10 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)]"
      >
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-slate-500">Online</span>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-4 top-1/2 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-400">Orders</span>
          <span className="text-lg font-bold text-slate-800">+24%</span>
        </div>
      </motion.div>

      <motion.svg
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        viewBox="0 0 420 360"
        className="relative z-10 h-full w-full"
        role="img"
        aria-label="بنر معرفی پنل"
      >
        <rect x="120" y="38" width="130" height="80" rx="24" fill="#eff3ff" />
        <rect x="160" y="208" width="130" height="18" rx="9" fill="#2d2f77" />
        <circle cx="130" cy="252" r="53" fill="none" stroke="#2d2f77" strokeWidth="5" />
        <circle cx="314" cy="252" r="53" fill="none" stroke="#89aefc" strokeWidth="5" />
        <circle cx="130" cy="252" r="13" fill="#ffffff" stroke="#2d2f77" strokeWidth="4" />
        <circle cx="314" cy="252" r="13" fill="#ffffff" stroke="#2d2f77" strokeWidth="4" />
        <path
          d="M130 252 L194 154 L272 154 L314 252"
          fill="none"
          stroke="#8ab0ff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M194 154 L173 117" fill="none" stroke="#8ab0ff" strokeWidth="6" strokeLinecap="round" />
        <path d="M194 154 L232 192" fill="none" stroke="#2d2f77" strokeWidth="6" strokeLinecap="round" />
        <path d="M237 154 L287 116" fill="none" stroke="#8ab0ff" strokeWidth="6" strokeLinecap="round" />
        <path d="M170 120 H212" fill="none" stroke="#2d2f77" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M202 108 C225 88 268 97 282 121 C293 139 290 169 272 189 C257 206 231 213 209 205 C189 197 174 180 170 158 C167 140 176 121 202 108 Z"
          fill="#3f5efb"
        />
        <path
          d="M265 111 C279 113 292 124 296 139 C301 156 296 173 284 184 C272 195 254 197 240 191 L249 167 L265 111 Z"
          fill="#f8b4b4"
        />
        <circle cx="260" cy="103" r="18" fill="#f2bf7b" />
        <path d="M244 94 C247 79 271 76 281 90 L278 101 L244 94 Z" fill="#eab308" />
        <path d="M218 188 L247 183 L264 248 H227 Z" fill="#4f95ff" />
        <path d="M183 169 L217 188 L227 248 H187 Z" fill="#63a4ff" />
        <path d="M250 185 L289 199" fill="none" stroke="#f8b4b4" strokeWidth="10" strokeLinecap="round" />
        <path d="M213 199 L187 214" fill="none" stroke="#2d2f77" strokeWidth="10" strokeLinecap="round" />
        <path d="M286 197 L309 223" fill="none" stroke="#f8b4b4" strokeWidth="8" strokeLinecap="round" />
        <path d="M309 223 L316 252" fill="none" stroke="#8ab0ff" strokeWidth="6" strokeLinecap="round" />
      </motion.svg>
    </div>
  );
}
