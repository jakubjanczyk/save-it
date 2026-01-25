"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function useMeasuredCardHeight(params: {
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
