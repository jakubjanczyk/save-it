"use client";

import {
  animate,
  type MotionValue,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  isInteractiveTarget,
  SWIPE_THRESHOLD_PX,
} from "@/components/focus/focus-swipe";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { BrowseCard } from "./browse-card";
import type { SavedLinkItem } from "./convex-refs";

const EXIT_DISTANCE_PX = 2000;
const MAX_BLUR_PX = 10;
const EXIT_DURATION_S = 0.45;
const CLICK_ARCHIVE_DELAY_S = 0.45;
const CLICK_ARCHIVE_DURATION_S = 0.26;
const CLICK_ARCHIVE_BLUR_DURATION_S = 0.12;

const CARD_GAP_PX = 12;

const PEEK_PX = 20;
const PEEK_OPACITY = 0.85;
const PEEK_SCALE = 0.985;

const NAV_DURATION_S = 0.34;

interface DeckNavigationWindow {
  current: SavedLinkItem;
  next: SavedLinkItem | null;
  nextNext: SavedLinkItem | null;
  prev: SavedLinkItem | null;
  prevPrev: SavedLinkItem | null;
}

interface DeckNavigating {
  direction: "next" | "previous";
  startY: number;
  window: DeckNavigationWindow;
}

function exitX(startX: number) {
  return startX >= 0 ? EXIT_DISTANCE_PX : -EXIT_DISTANCE_PX;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resetNavigationMotion(params: {
  activeNavOpacity: MotionValue<number>;
  activeNavScale: MotionValue<number>;
  nextOpacity: MotionValue<number>;
  nextScale: MotionValue<number>;
  prevOpacity: MotionValue<number>;
  prevScale: MotionValue<number>;
  y: MotionValue<number>;
}) {
  params.y.set(0);
  params.activeNavOpacity.set(1);
  params.activeNavScale.set(1);
  params.prevOpacity.set(PEEK_OPACITY);
  params.prevScale.set(PEEK_SCALE);
  params.nextOpacity.set(PEEK_OPACITY);
  params.nextScale.set(PEEK_SCALE);
}

function useMeasuredCardHeight(params: {
  elementRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}) {
  const heightRef = useRef<number>(480);
  const hasMeasuredRef = useRef(false);
  const [heightPx, setHeightPx] = useState<number>(480);

  useLayoutEffect(() => {
    if (!params.enabled) {
      return;
    }

    const el = params.elementRef.current;
    if (!el) {
      return;
    }

    const measured = el.getBoundingClientRect().height;
    if (!Number.isFinite(measured) || measured <= 0) {
      return;
    }

    const rounded = Math.round(measured);
    if (rounded === heightRef.current) {
      return;
    }

    if (!hasMeasuredRef.current) {
      hasMeasuredRef.current = true;
      heightRef.current = rounded;
      setHeightPx(rounded);
      return;
    }

    if (rounded > heightRef.current) {
      heightRef.current = rounded;
      setHeightPx(rounded);
    }
  });

  return { heightPx, heightRef };
}

function useDeckDismissAnimation(params: {
  activeNavOpacity: MotionValue<number>;
  activeNavScale: MotionValue<number>;
  dismissBlur: MotionValue<number>;
  dismissing: { item: SavedLinkItem; startX: number } | null;
  nextOpacity: MotionValue<number>;
  nextScale: MotionValue<number>;
  onDismissAnimationComplete: () => void;
  prevOpacity: MotionValue<number>;
  prevScale: MotionValue<number>;
  transitionOpacity: MotionValue<number>;
  transitionScale: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  const lastDismissedIdRef = useRef<SavedLinkItem["id"] | null>(null);

  useEffect(() => {
    if (!params.dismissing) {
      return;
    }

    const dismissingId = params.dismissing.item.id;
    if (lastDismissedIdRef.current === dismissingId) {
      return;
    }

    lastDismissedIdRef.current = dismissingId;

    resetNavigationMotion({
      activeNavOpacity: params.activeNavOpacity,
      activeNavScale: params.activeNavScale,
      nextOpacity: params.nextOpacity,
      nextScale: params.nextScale,
      prevOpacity: params.prevOpacity,
      prevScale: params.prevScale,
      y: params.y,
    });

    params.transitionOpacity.set(1);
    params.transitionScale.set(1);
    params.dismissBlur.set(0);

    if (params.dismissing.startX === 0) {
      params.x.set(0);

      Promise.all([
        animate(params.dismissBlur, SWIPE_THRESHOLD_PX, {
          duration: CLICK_ARCHIVE_BLUR_DURATION_S,
          ease: "easeOut",
        }),
        animate(params.transitionOpacity, 0, {
          delay: CLICK_ARCHIVE_DELAY_S,
          duration: CLICK_ARCHIVE_DURATION_S,
          ease: "easeOut",
        }),
        animate(params.transitionScale, 0.98, {
          delay: CLICK_ARCHIVE_DELAY_S,
          duration: CLICK_ARCHIVE_DURATION_S,
          ease: "easeOut",
        }),
      ]).then(() => {
        params.onDismissAnimationComplete();
      });
      return;
    }

    params.x.set(params.dismissing.startX);
    animate(params.x, exitX(params.dismissing.startX), {
      duration: EXIT_DURATION_S,
      ease: "easeOut",
    }).then(() => {
      params.onDismissAnimationComplete();
    });
  }, [
    params.activeNavOpacity,
    params.activeNavScale,
    params.dismissBlur,
    params.dismissing,
    params.nextOpacity,
    params.nextScale,
    params.onDismissAnimationComplete,
    params.prevOpacity,
    params.prevScale,
    params.transitionOpacity,
    params.transitionScale,
    params.x,
    params.y,
  ]);

  useLayoutEffect(() => {
    if (params.dismissing) {
      return;
    }

    lastDismissedIdRef.current = null;
    params.x.set(0);
    params.dismissBlur.set(0);
    params.transitionOpacity.set(1);
    params.transitionScale.set(1);
  }, [
    params.dismissBlur,
    params.dismissing,
    params.transitionOpacity,
    params.transitionScale,
    params.x,
  ]);
}

function useDeckNavigateAnimation(params: {
  activeNavOpacity: MotionValue<number>;
  activeNavScale: MotionValue<number>;
  dismissBlur: MotionValue<number>;
  heightRef: React.RefObject<number>;
  navigating: DeckNavigating | null;
  nextOpacity: MotionValue<number>;
  nextScale: MotionValue<number>;
  onNavigateAnimationComplete: () => void;
  prevOpacity: MotionValue<number>;
  prevScale: MotionValue<number>;
  transitionOpacity: MotionValue<number>;
  transitionScale: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  const lastNavigatedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.navigating) {
      return;
    }

    const key = `${params.navigating.direction}:${params.navigating.window.current.id}`;
    if (lastNavigatedKeyRef.current === key) {
      return;
    }

    lastNavigatedKeyRef.current = key;

    const height = params.heightRef.current + CARD_GAP_PX;
    const targetY = params.navigating.direction === "next" ? -height : height;
    const initialY = clamp(
      params.navigating.startY,
      -SWIPE_THRESHOLD_PX,
      SWIPE_THRESHOLD_PX
    );

    params.x.set(0);
    params.y.set(initialY);
    params.dismissBlur.set(0);
    params.transitionOpacity.set(1);
    params.transitionScale.set(1);

    params.activeNavOpacity.set(1);
    params.activeNavScale.set(1);
    params.prevOpacity.set(PEEK_OPACITY);
    params.prevScale.set(PEEK_SCALE);
    params.nextOpacity.set(PEEK_OPACITY);
    params.nextScale.set(PEEK_SCALE);

    const incomingIsNext = params.navigating.direction === "next";

    Promise.all([
      animate(params.y, targetY, {
        duration: NAV_DURATION_S,
        ease: "easeInOut",
      }),
      animate(params.activeNavOpacity, PEEK_OPACITY, {
        duration: NAV_DURATION_S,
        ease: "easeInOut",
      }),
      animate(params.activeNavScale, PEEK_SCALE, {
        duration: NAV_DURATION_S,
        ease: "easeInOut",
      }),
      incomingIsNext
        ? animate(params.nextOpacity, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          })
        : animate(params.prevOpacity, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          }),
      incomingIsNext
        ? animate(params.nextScale, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          })
        : animate(params.prevScale, 1, {
            duration: NAV_DURATION_S,
            ease: "easeInOut",
          }),
    ]).then(() => {
      params.onNavigateAnimationComplete();
    });
  }, [
    params.activeNavOpacity,
    params.activeNavScale,
    params.dismissBlur,
    params.heightRef,
    params.navigating,
    params.nextOpacity,
    params.nextScale,
    params.onNavigateAnimationComplete,
    params.prevOpacity,
    params.prevScale,
    params.transitionOpacity,
    params.transitionScale,
    params.x,
    params.y,
  ]);

  useLayoutEffect(() => {
    if (params.navigating) {
      return;
    }

    lastNavigatedKeyRef.current = null;
    resetNavigationMotion({
      activeNavOpacity: params.activeNavOpacity,
      activeNavScale: params.activeNavScale,
      nextOpacity: params.nextOpacity,
      nextScale: params.nextScale,
      prevOpacity: params.prevOpacity,
      prevScale: params.prevScale,
      y: params.y,
    });
  }, [
    params.activeNavOpacity,
    params.activeNavScale,
    params.navigating,
    params.nextOpacity,
    params.nextScale,
    params.prevOpacity,
    params.prevScale,
    params.y,
  ]);
}

function useDeckDragEnd(params: {
  dismissing: unknown;
  navigating: unknown;
  onArchive: (startX?: number) => void;
  onNextCard: (startY?: number) => boolean;
  onPreviousCard: (startY?: number) => boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  return useCallback(() => {
    if (params.dismissing || params.navigating) {
      return;
    }

    const dx = params.x.get();
    const dy = params.y.get();

    if (
      Math.abs(dx) < SWIPE_THRESHOLD_PX &&
      Math.abs(dy) < SWIPE_THRESHOLD_PX
    ) {
      animate(params.x, 0, { damping: 28, stiffness: 300, type: "spring" });
      animate(params.y, 0, { damping: 28, stiffness: 300, type: "spring" });
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
        animate(params.x, 0, { damping: 28, stiffness: 300, type: "spring" });
        animate(params.y, 0, { damping: 28, stiffness: 300, type: "spring" });
        return;
      }

      params.y.set(0);
      params.onArchive(dx);
      return;
    }

    if (Math.abs(dy) < SWIPE_THRESHOLD_PX) {
      animate(params.x, 0, { damping: 28, stiffness: 300, type: "spring" });
      animate(params.y, 0, { damping: 28, stiffness: 300, type: "spring" });
      return;
    }

    params.x.set(0);
    if (dy < 0) {
      const started = params.onNextCard(dy);
      if (!started) {
        animate(params.y, 0, { damping: 28, stiffness: 300, type: "spring" });
      }
      return;
    }

    const started = params.onPreviousCard(dy);
    if (!started) {
      animate(params.y, 0, { damping: 28, stiffness: 300, type: "spring" });
    }
  }, [
    params.dismissing,
    params.navigating,
    params.onArchive,
    params.onNextCard,
    params.onPreviousCard,
    params.x,
    params.y,
  ]);
}

function DeckCardFrame(props: {
  children?: ReactNode;
  className?: string;
  disabled: boolean;
  filter?: MotionValue<string>;
  item: SavedLinkItem;
  onArchive: () => void;
  onFavorite: () => void;
  onSendToRaindrop?: () => void;
  showSendToRaindrop: boolean;
}) {
  return (
    <Card className={cn("relative py-0", props.className)}>
      <motion.div style={props.filter ? { filter: props.filter } : undefined}>
        <BrowseCard
          disabled={props.disabled}
          item={props.item}
          onArchive={props.onArchive}
          onFavorite={props.onFavorite}
          onSendToRaindrop={props.onSendToRaindrop}
          showSendToRaindrop={props.showSendToRaindrop}
        />
      </motion.div>
      {props.children}
    </Card>
  );
}

function DeckPeekCard(props: {
  item: SavedLinkItem;
  opacity: MotionValue<number> | number;
  scale: MotionValue<number> | number;
  top: number;
  y: MotionValue<number>;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0"
      style={{
        opacity: props.opacity,
        scale: props.scale,
        top: props.top,
        y: props.y,
      }}
    >
      <DeckCardFrame
        disabled={true}
        item={props.item}
        onArchive={() => undefined}
        onFavorite={() => undefined}
        showSendToRaindrop={false}
      />
    </motion.div>
  );
}

function DeckPeekStack(props: {
  navigating: DeckNavigating | null;
  nextItem: SavedLinkItem | null;
  nextNextTop: number;
  nextOpacity: MotionValue<number>;
  nextScale: MotionValue<number>;
  nextTop: number;
  prevOpacity: MotionValue<number>;
  prevPrevTop: number;
  prevScale: MotionValue<number>;
  previousItem: SavedLinkItem | null;
  previousTop: number;
  y: MotionValue<number>;
}) {
  if (props.navigating) {
    return (
      <>
        {props.navigating.window.prevPrev ? (
          <DeckPeekCard
            item={props.navigating.window.prevPrev}
            opacity={PEEK_OPACITY}
            scale={PEEK_SCALE}
            top={props.prevPrevTop}
            y={props.y}
          />
        ) : null}

        {props.navigating.window.prev ? (
          <DeckPeekCard
            item={props.navigating.window.prev}
            opacity={props.prevOpacity}
            scale={props.prevScale}
            top={props.previousTop}
            y={props.y}
          />
        ) : null}

        {props.navigating.window.next ? (
          <DeckPeekCard
            item={props.navigating.window.next}
            opacity={props.nextOpacity}
            scale={props.nextScale}
            top={props.nextTop}
            y={props.y}
          />
        ) : null}

        {props.navigating.window.nextNext ? (
          <DeckPeekCard
            item={props.navigating.window.nextNext}
            opacity={PEEK_OPACITY}
            scale={PEEK_SCALE}
            top={props.nextNextTop}
            y={props.y}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      {props.previousItem ? (
        <DeckPeekCard
          item={props.previousItem}
          opacity={props.prevOpacity}
          scale={props.prevScale}
          top={props.previousTop}
          y={props.y}
        />
      ) : null}

      {props.nextItem ? (
        <DeckPeekCard
          item={props.nextItem}
          opacity={props.nextOpacity}
          scale={props.nextScale}
          top={props.nextTop}
          y={props.y}
        />
      ) : null}
    </>
  );
}

function DeckDismissingUnderlay(props: {
  shownItem: SavedLinkItem;
  top: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0"
      style={{ top: props.top }}
    >
      <DeckCardFrame
        disabled={true}
        item={props.shownItem}
        onArchive={() => undefined}
        onFavorite={() => undefined}
        showSendToRaindrop={false}
      />
    </div>
  );
}

function ArchiveBadge(props: {
  archiveOpacity: MotionValue<number>;
  isDismissing: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <motion.div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "rounded-full border px-6 py-3 font-semibold text-lg shadow-sm",
          "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
        )}
        style={{
          opacity: props.isDismissing ? 1 : props.archiveOpacity,
        }}
      >
        {props.isDismissing ? "Archived" : "Archive"}
      </motion.div>
    </div>
  );
}

export function BrowseDeck(props: {
  dismissing: { item: SavedLinkItem; startX: number } | null;
  navigating: DeckNavigating | null;
  nextItem: SavedLinkItem | null;
  onArchive: (startX?: number) => void;
  onDismissAnimationComplete: () => void;
  onFavorite: () => void;
  onNavigateAnimationComplete: () => void;
  onNextCard: (startY?: number) => boolean;
  onPreviousCard: (startY?: number) => boolean;
  onSendToRaindrop?: () => void;
  previousItem: SavedLinkItem | null;
  showSendToRaindrop: boolean;
  shownItem: SavedLinkItem | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0); // shared stack offset (drag + navigation)
  const dismissBlur = useMotionValue(0);
  const transitionOpacity = useMotionValue(1);
  const transitionScale = useMotionValue(1);
  const dragControls = useDragControls();

  const activeNavOpacity = useMotionValue(1);
  const activeNavScale = useMotionValue(1);
  const prevOpacity = useMotionValue(PEEK_OPACITY);
  const prevScale = useMotionValue(PEEK_SCALE);
  const nextOpacity = useMotionValue(PEEK_OPACITY);
  const nextScale = useMotionValue(PEEK_SCALE);

  const rotate = useTransform(x, [-240, 240], [-4, 4]);
  const archiveOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD_PX, 0, SWIPE_THRESHOLD_PX],
    [1, 0, 1]
  );
  const blurFilter = useTransform([x, dismissBlur], (values) => {
    const [xValue, blurValue] = values as [number, number];
    const abs = Math.min(
      Math.max(Math.abs(xValue), blurValue),
      SWIPE_THRESHOLD_PX
    );
    const blur = (abs / SWIPE_THRESHOLD_PX) * MAX_BLUR_PX;
    return `blur(${blur.toFixed(2)}px)`;
  });

  const activeOpacity = useTransform(
    [transitionOpacity, activeNavOpacity],
    (values) => {
      const [fadeOpacity, navOpacity] = values as [number, number];
      return fadeOpacity * navOpacity;
    }
  );
  const activeScale = useTransform(
    [transitionScale, activeNavScale],
    (values) => {
      const [fadeScale, navScale] = values as [number, number];
      return fadeScale * navScale;
    }
  );

  const activeItem =
    props.dismissing?.item ??
    props.navigating?.window.current ??
    props.shownItem;
  const isDismissing = Boolean(props.dismissing);
  const canDrag = !(props.dismissing || props.navigating);

  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const { heightPx: cardHeightPx, heightRef: cardHeightRef } =
    useMeasuredCardHeight({
      enabled: props.dismissing === null && props.navigating === null,
      elementRef: activeCardRef,
    });

  useDeckDismissAnimation({
    activeNavOpacity,
    activeNavScale,
    dismissBlur,
    dismissing: props.dismissing,
    nextOpacity,
    nextScale,
    onDismissAnimationComplete: props.onDismissAnimationComplete,
    prevOpacity,
    prevScale,
    transitionOpacity,
    transitionScale,
    x,
    y,
  });

  useDeckNavigateAnimation({
    activeNavOpacity,
    activeNavScale,
    dismissBlur,
    heightRef: cardHeightRef,
    navigating: props.navigating,
    nextOpacity,
    nextScale,
    onNavigateAnimationComplete: props.onNavigateAnimationComplete,
    prevOpacity,
    prevScale,
    transitionOpacity,
    transitionScale,
    x,
    y,
  });

  const onDragEnd = useDeckDragEnd({
    dismissing: props.dismissing,
    navigating: props.navigating,
    onArchive: props.onArchive,
    onNextCard: props.onNextCard,
    onPreviousCard: props.onPreviousCard,
    x,
    y,
  });

  const onActivePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canDrag) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      dragControls.start(event.nativeEvent);
    },
    [canDrag, dragControls]
  );

  if (!activeItem) {
    return null;
  }

  const peekTop = PEEK_PX + CARD_GAP_PX;
  const peekBottom = PEEK_PX + CARD_GAP_PX;

  const stepPx = cardHeightPx + CARD_GAP_PX;
  const containerHeight = cardHeightPx + peekTop + peekBottom;
  const prevPrevTop = peekTop - 2 * stepPx;
  const previousTop = peekTop - stepPx;
  const activeTop = peekTop;
  const nextTop = peekTop + stepPx;
  const nextNextTop = peekTop + 2 * stepPx;

  return (
    <div className="relative z-0">
      <div
        className="relative overflow-hidden"
        style={{ height: containerHeight }}
      >
        {props.dismissing && props.shownItem ? (
          <DeckDismissingUnderlay shownItem={props.shownItem} top={activeTop} />
        ) : null}

        <DeckPeekStack
          navigating={props.navigating}
          nextItem={props.nextItem}
          nextNextTop={nextNextTop}
          nextOpacity={nextOpacity}
          nextScale={nextScale}
          nextTop={nextTop}
          previousItem={props.previousItem}
          previousTop={previousTop}
          prevOpacity={prevOpacity}
          prevPrevTop={prevPrevTop}
          prevScale={prevScale}
          y={y}
        />

        <motion.div
          className="absolute inset-x-0"
          drag={canDrag}
          dragControls={dragControls}
          dragElastic={0.18}
          dragListener={false}
          onDragEnd={onDragEnd}
          onPointerDown={onActivePointerDown}
          style={{
            opacity: activeOpacity,
            rotate,
            scale: activeScale,
            top: activeTop,
            touchAction: "none",
            x,
            y,
          }}
        >
          <div ref={activeCardRef}>
            <DeckCardFrame
              className={props.navigating ? "pointer-events-none" : undefined}
              disabled={false}
              filter={blurFilter}
              item={activeItem}
              onArchive={props.onArchive}
              onFavorite={props.onFavorite}
              onSendToRaindrop={props.onSendToRaindrop}
              showSendToRaindrop={props.showSendToRaindrop}
            >
              <ArchiveBadge
                archiveOpacity={archiveOpacity}
                isDismissing={isDismissing}
              />
            </DeckCardFrame>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
