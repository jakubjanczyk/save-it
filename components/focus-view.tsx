"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  FEEDBACK_DURATION_MS,
  formatProgressLabel,
  getFeedbackKey,
  getMotionForFeedback,
} from "@/components/focus/focus-feedback";
import {
  FocusActions,
  FocusFeedbackOverlay,
  FocusHeader,
  FocusLinkDetails,
} from "@/components/focus/focus-parts";
import {
  getSwipeAction,
  isInteractiveTarget,
} from "@/components/focus/focus-swipe";
import type {
  FocusFeedbackAction,
  FocusViewItem,
} from "@/components/focus/types";
import { Card, CardContent } from "@/components/ui/card";

export interface FocusViewProps {
  item: FocusViewItem;
  position: number;
  total: number;
  busy?: boolean;
  feedbackAction?: FocusFeedbackAction;
  onSave: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
  onFeedbackComplete?: () => void;
}
export type { FocusViewItem } from "@/components/focus/types";

export function FocusView({
  busy = false,
  feedbackAction = null,
  item,
  onDiscard,
  onFeedbackComplete,
  onSave,
  position,
  total,
}: FocusViewProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const swipeState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const feedbackCompleteRef = useRef(false);
  const feedbackKeyRef = useRef<string | null>(null);

  const feedbackKey = getFeedbackKey(item.id, feedbackAction);
  if (feedbackKeyRef.current !== feedbackKey) {
    feedbackKeyRef.current = feedbackKey;
    feedbackCompleteRef.current = false;
  }

  const onFeedbackCompleteRef = useRef(onFeedbackComplete);
  useEffect(() => {
    onFeedbackCompleteRef.current = onFeedbackComplete;
  }, [onFeedbackComplete]);

  const completeFeedbackOnce = useCallback(() => {
    if (feedbackCompleteRef.current) {
      return;
    }

    feedbackCompleteRef.current = true;
    onFeedbackCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (!(feedbackAction && reducedMotion)) {
      return;
    }

    const timer = setTimeout(() => {
      completeFeedbackOnce();
    }, FEEDBACK_DURATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [completeFeedbackOnce, feedbackAction, reducedMotion]);

  const progressLabel = useMemo(() => {
    return formatProgressLabel(position, total);
  }, [position, total]);

  const { animate, transition } = useMemo(
    () =>
      getMotionForFeedback({
        action: feedbackAction,
        reducedMotion,
      }),
    [feedbackAction, reducedMotion]
  );

  const disableInteractions = busy || Boolean(feedbackAction);
  const overlayAction = feedbackAction;

  return (
    <motion.div
      animate={animate}
      onAnimationComplete={() => {
        if (!feedbackAction || reducedMotion) {
          return;
        }

        completeFeedbackOnce();
      }}
      transition={transition}
    >
      <Card className={overlayAction ? "relative" : undefined}>
        <FocusHeader
          from={item.email.from}
          progress={progressLabel}
          subject={item.email.subject}
        />
        <CardContent className="grid gap-4">
          <div
            className="grid gap-2"
            onPointerDown={(event) => {
              if (disableInteractions) {
                return;
              }

              if (isInteractiveTarget(event.target)) {
                return;
              }

              swipeState.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
              };
            }}
            onPointerUp={async (event) => {
              const state = swipeState.current;
              swipeState.current = null;

              if (!state || disableInteractions) {
                return;
              }

              if (event.pointerId !== state.pointerId) {
                return;
              }

              const dx = event.clientX - state.startX;
              const dy = event.clientY - state.startY;

              const action = getSwipeAction(dx, dy);
              if (!action) {
                return;
              }

              if (action === "save") {
                await onSave();
                return;
              }

              await onDiscard();
            }}
          >
            <FocusLinkDetails
              description={item.description}
              title={item.title}
              url={item.url}
            />
          </div>

          <FocusActions
            disabled={disableInteractions}
            onDiscard={onDiscard}
            onSave={onSave}
            url={item.url}
          />
        </CardContent>
        {overlayAction ? <FocusFeedbackOverlay action={overlayAction} /> : null}
      </Card>
    </motion.div>
  );
}
