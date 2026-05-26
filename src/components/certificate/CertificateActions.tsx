import { useState } from 'react';
import { toast } from 'sonner';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import type { CourseCertificate } from '../../hooks/useCourses';
import { CertificateView } from './CertificateView';
import { createRoot } from 'react-dom/client';

interface Props {
  certificate: CourseCertificate;
  isPublic?: boolean;
}

export function CertificateActions({ certificate, isPublic: _isPublic }: Props) {
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const shareUrl = `${window.location.origin}/c/${certificate.share_slug}`;
  const shareText = `I've earned my Certificate of Internship from MyDesignNexus!\n\nView my verified certificate:`;

  async function renderToCanvas(): Promise<HTMLCanvasElement> {
    const { default: html2canvas } = await import('html2canvas-pro');

    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1414px;height:1000px;background:#fff;';
    document.body.appendChild(host);

    const root = createRoot(host);
    await new Promise<void>((resolve) => {
      root.render(<CertificateView cert={certificate} forExport />);
      // Two rAFs to ensure React has committed + painted
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 250));

    const canvas = await html2canvas(host, {
      width: 1414,
      height: 1000,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    root.unmount();
    document.body.removeChild(host);
    return canvas;
  }

  async function downloadPDF() {
    setBusy('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const canvas = await renderToCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.setProperties({
        title: `Certificate ${certificate.serial_number}`,
        subject: 'MyDesignNexus Certificate of Internship',
        author: 'MyDesignNexus',
        creator: 'mydesignnexus.in',
      });

      const name = certificate.student_name.replace(/\s+/g, '-');
      pdf.save(`MDN-Certificate-${name}-${certificate.serial_number}.pdf`);
      toast.success('Certificate PDF downloaded');
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function downloadPNG() {
    setBusy('png');
    try {
      const canvas = await renderToCanvas();
      const link = document.createElement('a');
      const name = certificate.student_name.replace(/\s+/g, '-');
      link.download = `MDN-Certificate-${name}-${certificate.serial_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Certificate image downloaded');
    } catch (err) {
      console.error('PNG generation failed', err);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  }

  async function nativeShare() {
    if (!navigator.share) { copyLink(); return; }
    try {
      await navigator.share({ title: 'My Certificate of Internship', text: shareText, url: shareUrl });
    } catch { /* cancelled */ }
  }

  return (
    <div className="bg-white border border-ink-300 rounded-xl overflow-hidden">
      {/* Action bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center gap-3">
        <Button onClick={downloadPDF} disabled={busy !== null} className="flex-shrink-0">
          <Icon name="picture_as_pdf" size={16} />
          {busy === 'pdf' ? 'Generating...' : 'Download PDF'}
        </Button>

        <button
          onClick={downloadPNG}
          disabled={busy !== null}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-300 text-ink-700 hover:text-ink-900 hover:border-ink-700 hover:bg-ink-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-semibold"
        >
          <Icon name="image" size={16} />
          {busy === 'png' ? 'Generating...' : 'Download Image'}
        </button>

        <div className="flex-1 hidden sm:block" />

        <button
          onClick={() => setShareOpen(o => !o)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-700 text-white text-sm font-bold transition-colors"
        >
          <Icon name="share" size={16} />
          Share Certificate
        </button>
      </div>

      {/* Share panel */}
      {shareOpen && (
        <div className="border-t border-ink-300 p-4 sm:p-5 space-y-4 bg-ink-50">
          {/* LinkedIn CTA — prominent */}
          <a
            href={shareLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: '#0A66C2' }}
          >
            <SocialIcon icon="linkedin" size={22} />
            <div>
              <div>Add to LinkedIn Profile</div>
              <div className="text-xs font-normal opacity-80">Share as a certification on your LinkedIn profile</div>
            </div>
            <Icon name="open_in_new" size={16} className="ml-auto opacity-70" />
          </a>

          {/* Copy link */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2.5 bg-white border border-ink-300 rounded-lg text-xs font-mono text-ink-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ink-400"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-ink-300 bg-white text-ink-700 hover:bg-ink-100 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Icon name="content_copy" size={14} />
              Copy Link
            </button>
          </div>

          {/* Other social buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            <SocialButton href={shareLinks.twitter} label="X / Twitter" bg="#000" icon="twitter" />
            <SocialButton href={shareLinks.whatsapp} label="WhatsApp" bg="#25D366" icon="whatsapp" />
            <SocialButton href={shareLinks.facebook} label="Facebook" bg="#1877F2" icon="facebook" />
            <SocialButton href={shareLinks.telegram} label="Telegram" bg="#0088CC" icon="telegram" />
            <button
              onClick={nativeShare}
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-ink-800 hover:bg-ink-700 text-white text-[11px] font-semibold transition-colors col-span-1 sm:col-span-1"
            >
              <Icon name="ios_share" size={20} />
              More
            </button>
          </div>

          <p className="text-xs text-ink-500 leading-relaxed">
            Anyone with this link can view your verified certificate. You can add it to your LinkedIn profile, resume, or portfolio.
          </p>
        </div>
      )}
    </div>
  );
}

function SocialButton({ href, label, bg, icon }: { href: string; label: string; bg: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-white text-[11px] font-semibold transition-transform hover:scale-105 active:scale-95"
      style={{ backgroundColor: bg }}
    >
      <SocialIcon icon={icon} size={20} />
      {label}
    </a>
  );
}

function SocialIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    linkedin: <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3v9zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />,
    twitter: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
    whatsapp: <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 01-1.27-4.39c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.183 8.183 0 012.42 5.83c-.01 4.55-3.71 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.27z" />,
    facebook: <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />,
    telegram: <path d="M21.95 5.06L18.4 21.7c-.27 1.18-.97 1.47-1.96.92l-5.42-3.99-2.61 2.51c-.29.29-.53.53-1.09.53l.39-5.51 10.04-9.07c.44-.39-.09-.6-.68-.22L4.86 13.16l-5.34-1.67c-1.16-.36-1.18-1.16.24-1.72L20.45 3.4c.97-.36 1.81.22 1.5 1.66z" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      {paths[icon] || null}
    </svg>
  );
}
