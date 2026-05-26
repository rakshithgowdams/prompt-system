import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const LENIS_ROUTES = ['/', '/pricing', '/terms', '/privacy', '/refund'];
const LENIS_PREFIXES = ['/c/'];

function shouldEnableLenis(pathname: string): boolean {
  if (LENIS_ROUTES.includes(pathname)) return true;
  return LENIS_PREFIXES.some((p) => pathname.startsWith(p));
}

function cleanupLenisClasses() {
  ['lenis', 'lenis-smooth', 'lenis-stopped', 'lenis-scrolling'].forEach((cls) => {
    document.documentElement.classList.remove(cls);
    document.body.classList.remove(cls);
  });
  document.documentElement.style.removeProperty('height');
  document.body.style.removeProperty('height');
  document.documentElement.style.removeProperty('overflow');
  document.body.style.removeProperty('overflow');
}

export function LenisScrollManager() {
  const { pathname } = useLocation();
  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldEnableLenis(pathname)) {
      cleanupLenisClasses();
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.8,
      infinite: false,
      syncTouch: false,
    });

    lenisRef.current = lenis;
    gsap.ticker.lagSmoothing(0);

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const raf = (time: number) => {
      lenis.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    };
    rafIdRef.current = requestAnimationFrame(raf);

    (window as unknown as Record<string, unknown>).__lenis = lenis;

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      lenis.off('scroll', onScroll);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as Record<string, unknown>).__lenis;
      cleanupLenisClasses();
    };
  }, [pathname]);

  return null;
}
