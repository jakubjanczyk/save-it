"use client";

import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
} from "framer-motion";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useMemo, useRef } from "react";

import {
  isInteractiveTarget,
  SWIPE_THRESHOLD_PX,
} from "@/components/focus/focus-swipe";
import {
  CARD_GAP_PX,
  CLIP_X_PX,
  MAX_BLUR_PX,
  PEEK_OPACITY,
  PEEK_PX,
  PEEK_SCALE,
} from "./browse-deck/deck-constants";
import type { DeckMotion } from "./browse-deck/deck-motion";
import {
  ArchiveBadge,
  DeckCardFrame,
  DeckDismissingUnderlay,
  DeckPeekStack,
} from "./browse-deck/deck-parts";
import { useDeckDismissAnimation } from "./browse-deck/use-deck-dismiss-animation";
import { useDeckDragEnd } from "./browse-deck/use-deck-drag-end";
import { useDeckNavigateAnimation } from "./browse-deck/use-deck-navigate-animation";
import { useMeasuredCardHeight } from "./browse-deck/use-measured-card-height";
import type { BrowseDeckController } from "./use-browse-deck-controller";

export function BrowseDeck(props: {
  controller: BrowseDeckController;
  onSendToRaindrop?: () => void;
  showSendToRaindrop: boolean;
}) {
  const dragControls = useDragControls();

  const activeNavOpacity = useMotionValue(1);
  const activeNavScale = useMotionValue(1);
  const dismissBlur = useMotionValue(0);
  const nextOpacity = useMotionValue(PEEK_OPACITY);
  const nextScale = useMotionValue(PEEK_SCALE);
  const prevOpacity = useMotionValue(PEEK_OPACITY);
  const prevScale = useMotionValue(PEEK_SCALE);
  const transitionOpacity = useMotionValue(1);
  const transitionScale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0); // shared stack offset (drag + navigation)

  const deckMotion = useMemo<DeckMotion>(
    () => ({
      activeNavOpacity,
      activeNavScale,
      dismissBlur,
      nextOpacity,
      nextScale,
      prevOpacity,
      prevScale,
      transitionOpacity,
      transitionScale,
      x,
      y,
    }),
    [
      activeNavOpacity,
      activeNavScale,
      dismissBlur,
      nextOpacity,
      nextScale,
      prevOpacity,
      prevScale,
      transitionOpacity,
      transitionScale,
      x,
      y,
    ]
  );

  const rotate = useTransform(deckMotion.x, [-240, 240], [-4, 4]);
  const archiveOpacity = useTransform(
    deckMotion.x,
    [-SWIPE_THRESHOLD_PX, 0, SWIPE_THRESHOLD_PX],
    [1, 0, 1]
  );
  const blurFilter = useTransform(
    [deckMotion.x, deckMotion.dismissBlur],
    (values) => {
      const [xValue, blurValue] = values as [number, number];
      const abs = Math.min(
        Math.max(Math.abs(xValue), blurValue),
        SWIPE_THRESHOLD_PX
      );
      const blur = (abs / SWIPE_THRESHOLD_PX) * MAX_BLUR_PX;
      return `blur(${blur.toFixed(2)}px)`;
    }
  );

  const activeOpacity = useTransform(
    [deckMotion.transitionOpacity, deckMotion.activeNavOpacity],
    (values) => {
      const [fadeOpacity, navOpacity] = values as [number, number];
      return fadeOpacity * navOpacity;
    }
  );
  const activeScale = useTransform(
    [deckMotion.transitionScale, deckMotion.activeNavScale],
    (values) => {
      const [fadeScale, navScale] = values as [number, number];
      return fadeScale * navScale;
    }
  );

  const dismissing = props.controller.state.archiving;
  const navigating = props.controller.state.navigating;
  const shownItem = props.controller.state.shownItem;
  const nextItem = props.controller.state.nextItem;
  const previousItem = props.controller.state.previousItem;

  const activeItem =
    dismissing?.item ?? navigating?.window.current ?? shownItem;
  const isDismissing = Boolean(dismissing);
  const canDrag = !(dismissing || navigating);

  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const { heightPx: cardHeightPx, heightRef: cardHeightRef } =
    useMeasuredCardHeight({
      enabled: dismissing === null && navigating === null,
      elementRef: activeCardRef,
    });

  useDeckDismissAnimation({
    motion: deckMotion,
    dismissing,
    onDismissAnimationComplete:
      props.controller.handlers.onDismissAnimationComplete,
  });

  useDeckNavigateAnimation({
    heightRef: cardHeightRef,
    motion: deckMotion,
    navigating,
    onNavigateAnimationComplete:
      props.controller.handlers.onNavigateAnimationComplete,
  });

  const onDragEnd = useDeckDragEnd({
    dismissing,
    motion: deckMotion,
    navigating,
    onArchive: props.controller.handlers.archiveCurrent,
    onNextCard: props.controller.handlers.nextCard,
    onPreviousCard: props.controller.handlers.previousCard,
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
        className="relative overflow-visible"
        style={{
          clipPath: `inset(0px -${CLIP_X_PX}px 0px -${CLIP_X_PX}px)`,
          height: containerHeight,
        }}
      >
        {dismissing && shownItem ? (
          <DeckDismissingUnderlay shownItem={shownItem} top={activeTop} />
        ) : null}

        <DeckPeekStack
          navigating={navigating}
          nextItem={nextItem}
          nextNextTop={nextNextTop}
          nextOpacity={deckMotion.nextOpacity}
          nextScale={deckMotion.nextScale}
          nextTop={nextTop}
          previousItem={previousItem}
          previousTop={previousTop}
          prevOpacity={deckMotion.prevOpacity}
          prevPrevTop={prevPrevTop}
          prevScale={deckMotion.prevScale}
          y={deckMotion.y}
        />

        <motion.div
          className="absolute inset-x-0"
          drag={canDrag}
          dragControls={dragControls}
          dragDirectionLock={true}
          dragElastic={0.18}
          dragListener={false}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          onPointerDown={onActivePointerDown}
          style={{
            opacity: activeOpacity,
            rotate,
            scale: activeScale,
            top: activeTop,
            touchAction: "none",
            x: deckMotion.x,
            y: deckMotion.y,
          }}
        >
          <div ref={activeCardRef}>
            <DeckCardFrame
              className={navigating ? "pointer-events-none" : undefined}
              disabled={false}
              filter={blurFilter}
              item={activeItem}
              onArchive={props.controller.handlers.archiveCurrent}
              onFavorite={props.controller.handlers.favoriteCurrent}
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
