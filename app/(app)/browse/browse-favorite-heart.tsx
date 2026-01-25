"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const SPARKLE_DURATION_MS = 650;

interface Sparkle {
  delay: number;
  x: number;
  y: number;
}

const sparkles: Sparkle[] = [
  { delay: 0.0, x: -10, y: -10 },
  { delay: 0.03, x: 0, y: -14 },
  { delay: 0.06, x: 10, y: -10 },
  { delay: 0.09, x: -12, y: 6 },
  { delay: 0.12, x: 12, y: 6 },
  { delay: 0.15, x: 0, y: 14 },
];

function FavoriteSparkles(props: { burstKey: number }) {
  return (
    <motion.span
      animate={{ opacity: 1 }}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      key={props.burstKey}
      transition={{ duration: 0.1 }}
    >
      {sparkles.map((sparkle, index) => (
        <motion.span
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: sparkle.x,
            y: sparkle.y,
          }}
          className={cn(
            "absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "bg-amber-400 dark:bg-amber-300"
          )}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          // eslint-disable-next-line react/no-array-index-key
          key={`${props.burstKey}:${index}`}
          transition={{
            delay: sparkle.delay,
            duration: 0.55,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.span>
  );
}

export function BrowseFavoriteHeart(props: {
  className?: string;
  iconClassName?: string;
  isFavorite: boolean;
}) {
  const prevFavoriteRef = useRef(props.isFavorite);
  const [burstKey, setBurstKey] = useState(0);
  const [burstVisible, setBurstVisible] = useState(false);

  useEffect(() => {
    const wasFavorite = prevFavoriteRef.current;
    prevFavoriteRef.current = props.isFavorite;

    if (wasFavorite || !props.isFavorite) {
      return;
    }

    setBurstKey((prev) => prev + 1);
    setBurstVisible(true);

    const timeout = setTimeout(
      () => setBurstVisible(false),
      SPARKLE_DURATION_MS
    );
    return () => clearTimeout(timeout);
  }, [props.isFavorite]);

  const heartClasses = useMemo(
    () =>
      cn(
        "transition-colors",
        props.isFavorite ? "fill-red-500 text-red-500" : undefined,
        props.iconClassName
      ),
    [props.iconClassName, props.isFavorite]
  );

  return (
    <span className={cn("relative inline-flex", props.className)}>
      <motion.span
        animate={props.isFavorite ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Heart className={heartClasses} />
      </motion.span>
      <AnimatePresence>
        {burstVisible ? <FavoriteSparkles burstKey={burstKey} /> : null}
      </AnimatePresence>
    </span>
  );
}
