'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which of the given section element ids is currently the most
 * prominent one in the viewport, so contextual navigation can highlight it.
 */
export function useActiveSection(ids: string[]): string | null {
  const key = ids.join('|');
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    setActiveId(ids[0] ?? null);

    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    const visibility = new Map<string, number>();

    const observeCurrentElements = () => {
      const elements = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      if (elements.length === 0) {
        return false;
      }

      observer?.disconnect();
      visibility.clear();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
          }

          let topId: string | null = null;
          let topRatio = 0;
          for (const id of ids) {
            const ratio = visibility.get(id) ?? 0;
            if (ratio > topRatio) {
              topRatio = ratio;
              topId = id;
            }
          }

          if (topId) {
            setActiveId(topId);
          }
        },
        { rootMargin: '-120px 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
      );

      elements.forEach((el) => observer?.observe(el));
      return true;
    };

    if (!observeCurrentElements() && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (observeCurrentElements()) {
          mutationObserver?.disconnect();
          mutationObserver = null;
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [key]);

  return activeId;
}
