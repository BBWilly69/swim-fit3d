/**
 * GSAP Animation Hook
 *
 * Custom hook for GSAP animations with ScrollTrigger support.
 * Combines with Framer Motion for maximum animation power.
 *
 * @module hooks/useGsap
 */

import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export interface ScrollAnimationConfig {
  /** CSS selector or element ref */
  trigger: string | Element;
  /** Start position (e.g., "top 80%") */
  start?: string;
  /** End position (e.g., "bottom 20%") */
  end?: string;
  /** Scrub animation to scroll */
  scrub?: boolean | number;
  /** Pin element during scroll */
  pin?: boolean;
  /** Show markers for debugging */
  markers?: boolean;
  /** Animation to play */
  animation?: gsap.core.Timeline | gsap.core.Tween;
  /** Callback when entering */
  onEnter?: () => void;
  /** Callback when leaving */
  onLeave?: () => void;
}

/**
 * Hook for creating scroll-triggered GSAP animations.
 *
 * @example
 * ```tsx
 * const { scrollRef, createScrollAnimation } = useGsap();
 *
 * useEffect(() => {
 *   createScrollAnimation({
 *     trigger: scrollRef.current,
 *     animation: gsap.from(scrollRef.current, { opacity: 0, y: 50 })
 *   });
 * }, []);
 * ```
 */
export function useGsap() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  /**
   * Creates a scroll-triggered animation.
   */
  const createScrollAnimation = useCallback((config: ScrollAnimationConfig) => {
    const {
      trigger,
      start = 'top 80%',
      end = 'bottom 20%',
      scrub = false,
      pin = false,
      markers = false,
      animation,
      onEnter,
      onLeave,
    } = config;

    return ScrollTrigger.create({
      trigger,
      start,
      end,
      scrub,
      pin,
      markers,
      animation,
      onEnter,
      onLeave,
    });
  }, []);

  /**
   * Creates a parallax effect for an element.
   */
  const createParallax = useCallback(
    (element: Element | string, speed: number = 0.5) => {
      return gsap.to(element, {
        y: () => window.innerHeight * speed * -1,
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    },
    []
  );

  /**
   * Creates a staggered reveal animation for children.
   */
  const createStaggerReveal = useCallback(
    (
      container: Element | string,
      childSelector: string,
      options?: { duration?: number; stagger?: number; y?: number }
    ) => {
      const { duration = 0.6, stagger = 0.1, y = 30 } = options || {};

      return gsap.from(`${container} ${childSelector}`, {
        opacity: 0,
        y,
        duration,
        stagger,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 80%',
        },
      });
    },
    []
  );

  /**
   * Creates a chart morph animation (scale + fade).
   */
  const createChartMorph = useCallback((element: Element | string) => {
    return gsap.from(element, {
      scale: 0.8,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });
  }, []);

  /**
   * Creates a number counter animation.
   */
  const animateNumber = useCallback(
    (
      element: Element | string,
      endValue: number,
      options?: { duration?: number; decimals?: number }
    ) => {
      const { duration = 2, decimals = 0 } = options || {};
      const obj = { value: 0 };

      return gsap.to(obj, {
        value: endValue,
        duration,
        ease: 'power1.out',
        onUpdate: () => {
          const el = typeof element === 'string' ? document.querySelector(element) : element;
          if (el) {
            el.textContent = obj.value.toFixed(decimals);
          }
        },
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
        },
      });
    },
    []
  );

  /**
   * Creates a horizontal scroll section.
   */
  const createHorizontalScroll = useCallback(
    (container: Element | string, panels: Element[] | string) => {
      const containerEl =
        typeof container === 'string' ? document.querySelector(container) : container;
      const panelEls =
        typeof panels === 'string'
          ? Array.from(document.querySelectorAll(panels))
          : panels;

      if (!containerEl || panelEls.length === 0) return null;

      const totalWidth = panelEls.reduce((acc, panel) => acc + (panel as HTMLElement).offsetWidth, 0);

      return gsap.to(panelEls, {
        x: () => -(totalWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: containerEl,
          pin: true,
          scrub: 1,
          end: () => `+=${totalWidth}`,
        },
      });
    },
    []
  );

  return {
    scrollRef,
    timelineRef,
    gsap,
    ScrollTrigger,
    createScrollAnimation,
    createParallax,
    createStaggerReveal,
    createChartMorph,
    animateNumber,
    createHorizontalScroll,
  };
}

export default useGsap;
