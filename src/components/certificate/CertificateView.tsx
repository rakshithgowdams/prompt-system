import { useRef, useEffect, useState } from 'react';
import type { CourseCertificate } from '../../hooks/useCourses';

interface Props {
  cert: CourseCertificate;
  forExport?: boolean;
}

// Fixed canvas size — all positioning is relative to this
const W = 1414;
const H = 1000;

function LogoSVG({ style }: { style?: React.CSSProperties }) {
  return (
    <img
      src="/mdn-logo.png"
      alt="MyDesignNexus"
      style={{ ...style, objectFit: 'contain' }}
    />
  );
}

function SealSVG({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" style={style} xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 16;
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + 44 * Math.cos(rad);
        const y1 = 50 + 44 * Math.sin(rad);
        const x2 = 50 + 38 * Math.cos(rad);
        const y2 = 50 + 38 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a2744" strokeWidth="3.5" strokeLinecap="round" />;
      })}
      <circle cx="50" cy="50" r="36" fill="#1a2744" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#c8a84b" strokeWidth="1.5" />
      <text x="50" y="46" textAnchor="middle" fill="white" fontWeight="900" fontSize="14" fontFamily="Inter,sans-serif" letterSpacing="1">MD</text>
      <text x="50" y="60" textAnchor="middle" fill="#c8a84b" fontWeight="700" fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="1.5">NEXUS</text>
      <text x="50" y="70" textAnchor="middle" fill="#c8a84b" fontWeight="400" fontSize="5.5" fontFamily="Inter,sans-serif" letterSpacing="1">EST 2025</text>
    </svg>
  );
}

function SignatureSVG({ style }: { style?: React.CSSProperties }) {
  return (
    <img
      src="/founder-signature_1.svg"
      alt="Founder signature"
      style={{ ...style, objectFit: 'contain' }}
    />
  );
}

const FOOTER_TEXT =
  'mydesignnexus.in  |  Hassan, Karnataka, India  |  AI Automation • AI Call Agents • Web Development  |  Film Making  |  Digital Marketing  |  AI Advertising';

// The actual certificate canvas — always rendered at W×H pixels
function CertificateCanvas({ cert }: { cert: CourseCertificate }) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const issueDate = fmt(cert.issued_at);
  const fromDate = fmt(cert.internship_from);
  const toDate = fmt(cert.internship_to);

  return (
    <div
      id="certificate-canvas"
      style={{
        position: 'relative',
        width: `${W}px`,
        height: `${H}px`,
        background: '#f5f0ec',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Diagonal watermark grid */}
      <DiagonalGrid />

      {/* Left silver swoosh */}
      <div style={{
        position: 'absolute', left: 0, top: 560,
        width: 88, height: 340,
        background: 'linear-gradient(135deg, #b0b0b0 0%, #e0e0e0 50%, #909090 100%)',
        borderRadius: '0 60px 60px 0',
        opacity: 0.5,
      }} />

      {/* Right silver swoosh */}
      <div style={{
        position: 'absolute', right: 0, top: 100,
        width: 88, height: 340,
        background: 'linear-gradient(225deg, #b0b0b0 0%, #e0e0e0 50%, #909090 100%)',
        borderRadius: '60px 0 0 60px',
        opacity: 0.5,
      }} />

      {/* Top-left: Company logo */}
      <div style={{ position: 'absolute', top: 36, left: 64 }}>
        <LogoSVG style={{ width: 300, height: 80 }} />
      </div>

      {/* Top-right: EST 2025 badge */}
      <svg viewBox="0 0 90 104" style={{ position: 'absolute', top: 28, right: 60, width: 78, height: 'auto' }}>
        <polygon points="45,2 88,22 88,82 45,102 2,82 2,22" fill="#1a2744" />
        <polygon points="45,8 82,26 82,78 45,96 8,78 8,26" fill="none" stroke="#c8a84b" strokeWidth="1.5" />
        <text x="45" y="48" textAnchor="middle" fill="white" fontWeight="700" fontSize="14" fontFamily="Inter,sans-serif" letterSpacing="2">EST</text>
        <text x="45" y="70" textAnchor="middle" fill="#c8a84b" fontWeight="900" fontSize="17" fontFamily="Inter,sans-serif">2025</text>
      </svg>

      {/* Top decorative rule */}
      <div style={{
        position: 'absolute', top: 154, left: 64, right: 64,
        height: 1.5,
        background: 'linear-gradient(90deg, transparent 0%, #999 15%, #444 50%, #999 85%, transparent 100%)',
      }} />

      {/* CERTIFICATE OF COURSE COMPLETION */}
      <div style={{
        position: 'absolute', top: 172, left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        fontSize: 38,
        fontWeight: 900,
        color: '#0d1120',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}>
        Certificate of Course Completion
      </div>

      {/* Ornamental divider */}
      <div style={{
        position: 'absolute', top: 256, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 14,
        whiteSpace: 'nowrap',
      }}>
        <div style={{ width: 180, height: 2, background: '#333' }} />
        <svg viewBox="0 0 32 14" width="32" height="14">
          <polygon points="4,7 10,1 16,7 22,1 28,7 22,13 16,7 10,13" fill="#333" />
        </svg>
        <div style={{ width: 180, height: 2, background: '#333' }} />
      </div>

      {/* "This is to certify that" */}
      <div style={{
        position: 'absolute', top: 294, left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 21, color: '#555',
        fontStyle: 'italic',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}>
        This is to certify that
      </div>

      {/* Student name */}
      <div style={{
        position: 'absolute', top: 332, left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        width: 900,
      }}>
        <div style={{
          fontSize: 60, fontWeight: 900, color: '#0d1120',
          letterSpacing: '0.01em', lineHeight: 1.05,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {cert.student_name}
        </div>
        <div style={{ marginTop: 8, height: 4, background: '#111', borderRadius: 2 }} />
      </div>

      {/* Course cover image — top right corner inset */}
      {cert.cover_image_url && (
        <div style={{
          position: 'absolute', top: 168, right: 154,
          width: 130, height: 80,
          borderRadius: 8,
          overflow: 'hidden',
          border: '2px solid #c8a84b',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        }}>
          <img
            src={cert.cover_image_url}
            alt={cert.course_title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            crossOrigin="anonymous"
          />
        </div>
      )}

      {/* Body paragraph */}
      <div style={{
        position: 'absolute', top: 452, left: 80, right: 80,
        fontSize: 17.5, color: '#222', lineHeight: 1.85,
        fontWeight: 400, textAlign: 'justify',
      }}>
        Has successfully completed the course{' '}
        <strong style={{ fontWeight: 700 }}>"{cert.course_title}"</strong>{' '}
        at <strong style={{ fontWeight: 700 }}>MyDesignNexus</strong>
        {cert.internship_from && cert.internship_to ? (
          <>, from <strong style={{ fontWeight: 700 }}>{fromDate}</strong> to{' '}
            <strong style={{ fontWeight: 700 }}>{toDate}</strong></>
        ) : null}
        . During this period, the student demonstrated exceptional dedication, consistent effort,
        and remarkable professional growth in{' '}
        <strong style={{ fontWeight: 700 }}>{cert.growth_area || cert.course_category || '—'}</strong>
        . Their commitment to learning, applied problem-solving skills, and ability to translate
        knowledge into practical outcomes have been truly commendable. MyDesignNexus proudly
        recognises this achievement and wishes them continued excellence and success in their
        professional journey.
      </div>

      {/* Certificate ID */}
      <div style={{ position: 'absolute', top: 652, left: 80, fontSize: 15, color: '#333' }}>
        <strong>Certificate ID:</strong>{' '}
        <span style={{ fontFamily: "'Courier New', monospace", letterSpacing: '0.04em' }}>
          {cert.serial_number}
        </span>
      </div>

      {/* Horizontal rule above bottom section */}
      <div style={{
        position: 'absolute', top: 700, left: 64, right: 64,
        height: 1.5, background: '#aaa',
      }} />

      {/* Date + Instructor (bottom-left) */}
      <div style={{
        position: 'absolute', bottom: 54, left: 80,
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#222', marginBottom: 6 }}>Date:</div>
          <div style={{
            fontSize: 14, color: '#444',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.1em',
            borderBottom: '2px dotted #555',
            paddingBottom: 4,
            minWidth: 180,
          }}>
            {issueDate}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Course Instructor</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111', letterSpacing: '0.01em' }}>
            {cert.instructor_name || 'Rakshith'}
          </div>
          <div style={{ width: 160, height: 1.5, background: '#aaa', marginTop: 4 }} />
        </div>
      </div>

      {/* Vertical separator left */}
      <div style={{
        position: 'absolute', bottom: 52, left: 420,
        width: 1.5, height: 130, background: '#bbb',
      }} />

      {/* Seal (center) */}
      <div style={{
        position: 'absolute', bottom: 54, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ fontSize: 12, color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>Seal</div>
        <SealSVG style={{ width: 100, height: 'auto' }} />
      </div>

      {/* Vertical separator right */}
      <div style={{
        position: 'absolute', bottom: 52, right: 420,
        width: 1.5, height: 130, background: '#bbb',
      }} />

      {/* Signature (bottom-right) */}
      <div style={{
        position: 'absolute', bottom: 44, right: 80,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3,
      }}>
        <SignatureSVG style={{ width: 160, height: 'auto', marginBottom: 4 }} />
        <div style={{ width: 150, height: 1.5, background: '#333' }} />
        <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Authorized Signature</div>
        <div style={{ fontSize: 21, fontWeight: 900, color: '#111' }}>Rakshith</div>
        <div style={{ fontSize: 12, color: '#555' }}>Founder &amp; CEO</div>
        <div style={{ fontSize: 12, color: '#555' }}>MyDesignNexus</div>
      </div>

      {/* Footer bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 44, background: '#111',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}>
        <div style={{
          fontSize: 11, color: 'white', fontWeight: 700,
          letterSpacing: '0.03em', textAlign: 'center',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {FOOTER_TEXT}
        </div>
      </div>
    </div>
  );
}

// Responsive wrapper: scales CertificateCanvas to fit the container width
function ResponsiveCertificate({ cert }: { cert: CourseCertificate }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(w / W);
    });
    obs.observe(el);
    // Initial calc
    const w = el.getBoundingClientRect().width;
    if (w > 0) setScale(w / W);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: `${H * scale}px`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
      }}>
        <CertificateCanvas cert={cert} />
      </div>
    </div>
  );
}

export function CertificateView({ cert, forExport = false }: Props) {
  if (forExport) {
    return <CertificateCanvas cert={cert} />;
  }
  return <ResponsiveCertificate cert={cert} />;
}

function DiagonalGrid() {
  const spacing = 80;
  const lines: React.ReactNode[] = [];
  for (let x = -H; x < W + H; x += spacing) {
    lines.push(
      <line key={`a${x}`} x1={x} y1={0} x2={x + H} y2={H} stroke="#ccc" strokeWidth="0.7" opacity="0.45" />,
      <line key={`b${x}`} x1={x} y1={0} x2={x - H} y2={H} stroke="#ccc" strokeWidth="0.7" opacity="0.45" />,
    );
  }
  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={`${W}px`}
      height={`${H}px`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      {lines}
    </svg>
  );
}
