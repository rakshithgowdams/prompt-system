import type { CourseCertificate } from '../../hooks/useCourses';

interface Props {
  cert: CourseCertificate;
  forExport?: boolean;
}

// Aspect ratio: A4 landscape = 297 x 210 mm → 1414 x 1000 px at 120ppi
const W = 1414;
const H = 1000;

export function CertificateView({ cert, forExport = false }: Props) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const issueDate = fmt(cert.issued_at);
  const fromDate  = fmt(cert.internship_from);
  const toDate    = fmt(cert.internship_to);

  const px = (n: number) => forExport ? `${n}px` : `${(n / W) * 100}%`;
  const fs = (n: number) => forExport ? `${n}px` : `clamp(${Math.round(n * 0.4)}px, ${(n / W) * 100}vw, ${n}px)`;

  return (
    <div
      id="certificate-canvas"
      style={{
        position: 'relative',
        width: forExport ? `${W}px` : '100%',
        height: forExport ? `${H}px` : undefined,
        aspectRatio: forExport ? undefined : `${W} / ${H}`,
        background: '#fff',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* ── Outer border frame ── */}
      <div style={{
        position: 'absolute', inset: px(18),
        border: `${forExport ? '3px' : '0.21%'} solid #b8960c`,
        borderRadius: px(6),
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', inset: px(26),
        border: `${forExport ? '1px' : '0.07%'} solid #d4ab1e`,
        borderRadius: px(4),
        pointerEvents: 'none',
      }} />

      {/* ── Gold top band ── */}
      <div style={{
        position: 'absolute', top: px(36), left: px(36), right: px(36),
        height: px(6),
        background: 'linear-gradient(90deg, #b8960c 0%, #f5d44d 50%, #b8960c 100%)',
        borderRadius: px(3),
      }} />

      {/* ── Gold bottom band ── */}
      <div style={{
        position: 'absolute', bottom: px(36), left: px(36), right: px(36),
        height: px(6),
        background: 'linear-gradient(90deg, #b8960c 0%, #f5d44d 50%, #b8960c 100%)',
        borderRadius: px(3),
      }} />

      {/* ── Corner ornaments ── */}
      {[
        { top: px(36), left: px(36) },
        { top: px(36), right: px(36) },
        { bottom: px(36), left: px(36) },
        { bottom: px(36), right: px(36) },
      ].map((pos, i) => (
        <CornerOrnament key={i} style={pos} size={forExport ? 36 : undefined} pct={forExport ? undefined : (36 / W) * 100} />
      ))}

      {/* ── Background watermark ── */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: forExport ? '420px' : '29.7%',
        height: forExport ? '420px' : '42%',
        opacity: 0.035,
        pointerEvents: 'none',
      }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" fill="#b8960c">
          <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" strokeWidth="2" stroke="#b8960c" fill="none" />
          <polygon points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5" strokeWidth="1.5" stroke="#b8960c" fill="none" />
          <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="900" fill="#b8960c">MDN</text>
        </svg>
      </div>

      {/* ── Left accent stripe ── */}
      <div style={{
        position: 'absolute',
        top: px(50), bottom: px(50), left: px(50),
        width: px(4),
        background: 'linear-gradient(180deg, transparent 0%, #b8960c 25%, #f5d44d 50%, #b8960c 75%, transparent 100%)',
        borderRadius: px(2),
      }} />

      {/* ── Right accent stripe ── */}
      <div style={{
        position: 'absolute',
        top: px(50), bottom: px(50), right: px(50),
        width: px(4),
        background: 'linear-gradient(180deg, transparent 0%, #b8960c 25%, #f5d44d 50%, #b8960c 75%, transparent 100%)',
        borderRadius: px(2),
      }} />

      {/* ── Header logo mark ── */}
      <div style={{
        position: 'absolute',
        top: px(60),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: px(6),
      }}>
        <div style={{
          width: forExport ? '56px' : '3.96%',
          height: forExport ? '56px' : '5.6%',
          borderRadius: forExport ? '10px' : '0.7%',
          background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f5d44d',
          fontWeight: 900,
          fontSize: forExport ? '18px' : '1.27%',
          letterSpacing: '0.02em',
        }}>MDN</div>
        <div style={{
          fontSize: forExport ? '11px' : '0.78%',
          color: '#888',
          letterSpacing: '0.25em',
          textTransform: 'uppercase' as const,
          fontWeight: 600,
          whiteSpace: 'nowrap' as const,
        }}>MyDesignNexus · Certificate of Completion</div>
      </div>

      {/* ── CERTIFICATE OF INTERNSHIP title ── */}
      <div style={{
        position: 'absolute',
        top: px(170),
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center' as const,
        whiteSpace: 'nowrap' as const,
      }}>
        <div style={{
          fontSize: forExport ? '42px' : '2.97%',
          fontWeight: 900,
          color: '#111',
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}>Certificate of Internship</div>
        <div style={{
          marginTop: px(6),
          width: forExport ? '200px' : '14.15%',
          height: forExport ? '2px' : '0.2%',
          background: 'linear-gradient(90deg, transparent, #b8960c, transparent)',
          margin: `${px(8)} auto 0`,
        }} />
      </div>

      {/* ── "This is to certify that" ── */}
      <div style={{
        position: 'absolute',
        top: px(255),
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: forExport ? '15px' : '1.06%',
        color: '#666',
        letterSpacing: '0.18em',
        textTransform: 'uppercase' as const,
        fontWeight: 500,
        whiteSpace: 'nowrap' as const,
      }}>This is to certify that</div>

      {/* ── Student Name ── */}
      <div style={{
        position: 'absolute',
        top: px(295),
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center' as const,
        width: forExport ? '900px' : '63.6%',
      }}>
        <div style={{
          fontSize: forExport ? '54px' : '3.82%',
          fontWeight: 700,
          color: '#1a1a1a',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          letterSpacing: '0.03em',
          lineHeight: 1.1,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{cert.student_name}</div>
        {/* underline */}
        <div style={{
          marginTop: px(8),
          height: forExport ? '2px' : '0.2%',
          background: 'linear-gradient(90deg, transparent 0%, #b8960c 30%, #b8960c 70%, transparent 100%)',
        }} />
      </div>

      {/* ── Body text block ── */}
      <div style={{
        position: 'absolute',
        top: px(398),
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center' as const,
        width: forExport ? '860px' : '60.8%',
        lineHeight: 1.85,
        color: '#444',
        fontSize: forExport ? '16px' : '1.13%',
        fontWeight: 400,
      }}>
        has successfully completed an internship in the department of{' '}
        <strong style={{ color: '#111', fontWeight: 700 }}>{cert.department || '—'}</strong>
        {cert.internship_from && cert.internship_to && (
          <>, from <strong style={{ color: '#111', fontWeight: 700 }}>{fromDate}</strong> to{' '}
          <strong style={{ color: '#111', fontWeight: 700 }}>{toDate}</strong></>
        )}
        , and has demonstrated exceptional skills and professional growth in{' '}
        <strong style={{ color: '#111', fontWeight: 700 }}>{cert.growth_area || '—'}</strong>.
      </div>

      {/* ── Course title badge ── */}
      {cert.course_title && (
        <div style={{
          position: 'absolute',
          top: px(520),
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fffbea',
          border: `${forExport ? '1.5px' : '0.1%'} solid #d4ab1e`,
          borderRadius: px(24),
          padding: `${px(8)} ${px(28)}`,
          fontSize: forExport ? '13px' : '0.92%',
          fontWeight: 700,
          color: '#7a6000',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          whiteSpace: 'nowrap' as const,
        }}>
          {cert.course_title}
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{
        position: 'absolute',
        top: px(580),
        left: forExport ? '120px' : '8.48%',
        right: forExport ? '120px' : '8.48%',
        height: forExport ? '1px' : '0.1%',
        background: '#e8e8e8',
      }} />

      {/* ── Bottom left: Certificate ID + Issue date ── */}
      <div style={{
        position: 'absolute',
        bottom: px(90),
        left: forExport ? '100px' : '7.07%',
        display: 'flex',
        flexDirection: 'column',
        gap: px(6),
      }}>
        <div style={{ fontSize: forExport ? '10px' : '0.71%', color: '#aaa', letterSpacing: '0.2em', textTransform: 'uppercase' as const, fontWeight: 600 }}>
          Certificate ID
        </div>
        <div style={{ fontSize: forExport ? '13px' : '0.92%', fontWeight: 700, color: '#333', fontFamily: "'Courier New', monospace", letterSpacing: '0.08em' }}>
          {cert.serial_number}
        </div>
        <div style={{ fontSize: forExport ? '11px' : '0.78%', color: '#888', marginTop: px(4) }}>
          Issued on <span style={{ fontWeight: 600, color: '#555' }}>{issueDate}</span>
        </div>
      </div>

      {/* ── Bottom center: Signature area ── */}
      <div style={{
        position: 'absolute',
        bottom: px(72),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: px(4),
      }}>
        {/* Signature line */}
        <div style={{
          width: forExport ? '160px' : '11.31%',
          height: forExport ? '1.5px' : '0.15%',
          background: '#333',
          marginBottom: px(6),
        }} />
        <div style={{ fontSize: forExport ? '13px' : '0.92%', fontWeight: 700, color: '#222', letterSpacing: '0.03em' }}>
          {cert.instructor_name || 'Rakshith'}
        </div>
        <div style={{ fontSize: forExport ? '10px' : '0.71%', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
          Instructor · MyDesignNexus
        </div>
      </div>

      {/* ── Bottom right: Verified seal ── */}
      <div style={{
        position: 'absolute',
        bottom: px(72),
        right: forExport ? '100px' : '7.07%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: px(4),
      }}>
        <div style={{
          width: forExport ? '52px' : '3.68%',
          height: forExport ? '52px' : '5.2%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #b8960c 0%, #f5d44d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width={forExport ? 26 : '50%'} height={forExport ? 26 : '50%'} fill="white">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
        <div style={{ fontSize: forExport ? '9px' : '0.64%', color: '#b8960c', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
          Verified
        </div>
      </div>

    </div>
  );
}

function CornerOrnament({ style, size, pct }: { style: React.CSSProperties; size?: number; pct?: number }) {
  const s = size ? `${size}px` : `${pct}%`;
  return (
    <div style={{
      position: 'absolute',
      width: s,
      height: s,
      ...style,
      pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none">
        <path d="M2 2 L2 14 M2 2 L14 2" stroke="#b8960c" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M2 8 L8 8 M8 2 L8 8" stroke="#d4ab1e" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  );
}
