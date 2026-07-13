import { useEffect, useState } from "react";

interface VisualViewportLayout {
  /** Vertical center of the visible (visual) viewport in px from page top. */
  center: number;
  /** Height of the visible (visual) viewport in px. */
  height: number;
}

/**
 * Tracks `window.visualViewport` so that when the Android soft keyboard opens
 * (and the visual viewport shrinks relative to the layout viewport), callers
 * can reposition fixed-position elements within the actually-visible area.
 *
 * Returns `null` when the keyboard is closed (or on browsers without the
 * Visual Viewport API), so desktop/iOS behavior is unchanged.
 *
 * The 80px threshold avoids false positives from minor browser chrome
 * changes (e.g. address bar show/hide on scroll).
 */
export function useVisualViewportLayout(): VisualViewportLayout | null {
  const [layout, setLayout] = useState<VisualViewportLayout | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboardOpen = window.innerHeight - vv.height > 80;
      if (keyboardOpen) {
        setLayout({
          center: vv.offsetTop + vv.height / 2,
          height: vv.height,
        });
      } else {
        setLayout(null);
      }
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return layout;
}

/**
 * Convenience boolean hook: `true` when the Android soft keyboard is open.
 * Use to hide/reposition fixed bottom bars (checkout bars, banners, FABs)
 * that would otherwise be covered by the keyboard.
 */
export function useKeyboardOpen(): boolean {
  return useVisualViewportLayout() !== null;
}
