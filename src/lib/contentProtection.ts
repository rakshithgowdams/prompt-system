import { supabase } from './supabase';

interface ProtectionOptions {
  courseId?: string;
  lessonId?: string;
  onDevToolsDetected?: () => void;
}

let isProtectionActive = false;
let cleanupFns: Array<() => void> = [];

const eventThrottle = new Map<string, number>();

function throttledLog(event: string, courseId?: string, lessonId?: string) {
  const now = Date.now();
  const last = eventThrottle.get(event) ?? 0;
  if (now - last < 30_000) return;
  eventThrottle.set(event, now);

  supabase.functions.invoke('log-protection-event', {
    body: { event, course_id: courseId, lesson_id: lessonId },
  }).catch(() => {});
}

export function activateContentProtection(opts: ProtectionOptions = {}) {
  if (isProtectionActive) return;
  isProtectionActive = true;

  // 1. Block context menu
  const blockContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    throttledLog('right_click', opts.courseId, opts.lessonId);
  };
  document.addEventListener('contextmenu', blockContextMenu);
  cleanupFns.push(() => document.removeEventListener('contextmenu', blockContextMenu));

  // 2. Block DevTools and download shortcuts
  const blockShortcuts = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (e.key === 'F12') {
      e.preventDefault();
      throttledLog('F12_pressed', opts.courseId, opts.lessonId);
      return;
    }

    if (ctrl && shift && (key === 'i' || key === 'j' || key === 'c')) {
      e.preventDefault();
      throttledLog('devtools_shortcut', opts.courseId, opts.lessonId);
      return;
    }

    if (ctrl && key === 'u') {
      e.preventDefault();
      throttledLog('view_source_attempt', opts.courseId, opts.lessonId);
      return;
    }

    if (ctrl && key === 's') {
      e.preventDefault();
      throttledLog('save_page_attempt', opts.courseId, opts.lessonId);
      return;
    }

    if (ctrl && key === 'p') {
      e.preventDefault();
      throttledLog('print_attempt', opts.courseId, opts.lessonId);
      return;
    }

    if (ctrl && key === 'a') {
      e.preventDefault();
      return;
    }

    if (e.key === 'PrintScreen') {
      navigator.clipboard?.writeText('').catch(() => {});
      throttledLog('printscreen_pressed', opts.courseId, opts.lessonId);
    }
  };
  document.addEventListener('keydown', blockShortcuts);
  cleanupFns.push(() => document.removeEventListener('keydown', blockShortcuts));

  // 3. Disable text selection + image drag
  document.body.classList.add('protected-content');
  cleanupFns.push(() => document.body.classList.remove('protected-content'));

  // 4. Block drag on images and videos
  const blockDrag = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
      e.preventDefault();
    }
  };
  document.addEventListener('dragstart', blockDrag);
  cleanupFns.push(() => document.removeEventListener('dragstart', blockDrag));

  // 5. DevTools open detection
  let devToolsOpen = false;
  const detectDevTools = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const sizeProbablyOpen = widthDiff > 200 || heightDiff > 200;

    let timingProbablyOpen = false;
    try {
      const start = performance.now();
      const dummyObj: Record<string, unknown> = {};
      Object.defineProperty(dummyObj, 'id', {
        get() {
          timingProbablyOpen = true;
          return '';
        },
      });
      // eslint-disable-next-line no-console
      console.log(dummyObj);
      // eslint-disable-next-line no-console
      console.clear();
      const elapsed = performance.now() - start;
      if (elapsed > 100) timingProbablyOpen = true;
    } catch { /* ignore */ }

    const isOpen = sizeProbablyOpen || timingProbablyOpen;

    if (isOpen && !devToolsOpen) {
      devToolsOpen = true;
      document.body.classList.add('devtools-detected');
      throttledLog('devtools_detected', opts.courseId, opts.lessonId);
      opts.onDevToolsDetected?.();
    } else if (!isOpen && devToolsOpen) {
      devToolsOpen = false;
      document.body.classList.remove('devtools-detected');
    }
  };
  detectDevTools();
  const devToolsInterval = setInterval(detectDevTools, 1500);
  cleanupFns.push(() => {
    clearInterval(devToolsInterval);
    document.body.classList.remove('devtools-detected');
  });

  // 6. Tab/window visibility
  const handleVisibility = () => {
    if (document.hidden) {
      throttledLog('tab_hidden_during_playback', opts.courseId, opts.lessonId);
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  cleanupFns.push(() => document.removeEventListener('visibilitychange', handleVisibility));

  // 7. Window blur
  const handleBlur = () => throttledLog('window_blur', opts.courseId, opts.lessonId);
  window.addEventListener('blur', handleBlur);
  cleanupFns.push(() => window.removeEventListener('blur', handleBlur));

  // 8. Console deterrent banner
  // eslint-disable-next-line no-console
  console.log(
    '%c STOP',
    'color:#dc2626;font-size:48px;font-weight:900;padding:8px 0;text-shadow:2px 2px 0 rgba(0,0,0,0.1);',
  );
  // eslint-disable-next-line no-console
  console.log(
    '%cThis console is for developers. ' +
    'If anyone instructed you to paste code here to "unlock" content, "verify" your account, or "gain access" — ' +
    'they are attempting to steal your session and impersonate you. Close this window now.',
    'color:#1f2937;font-size:14px;font-weight:600;line-height:1.6;',
  );
  // eslint-disable-next-line no-console
  console.log(
    '%cAll content on aiwithrakshith.tech is protected by copyright. ' +
    'This session is logged with your account ID, IP address, and timestamp. ' +
    'Downloading, recording, or redistributing course material violates our Terms of Service ' +
    'and the Indian Copyright Act, 1957.',
    'color:#6b7280;font-size:12px;line-height:1.5;',
  );
}

export function deactivateContentProtection() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  isProtectionActive = false;
  eventThrottle.clear();
}
