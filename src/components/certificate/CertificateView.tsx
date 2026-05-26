import type { CourseCertificate } from '../../hooks/useCourses';

interface Props {
  cert: CourseCertificate;
  forExport?: boolean;
}

// A4 landscape: 1414 × 1000 px at ~120 ppi
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
      {/* Outer gear ring */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 16;
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + 44 * Math.cos(rad);
        const y1 = 50 + 44 * Math.sin(rad);
        const x2 = 50 + 38 * Math.cos(rad);
        const y2 = 50 + 38 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a2744" strokeWidth="3.5" strokeLinecap="round"/>;
      })}
      <circle cx="50" cy="50" r="36" fill="#1a2744"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#c8a84b" strokeWidth="1.5"/>
      {/* MD text */}
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

export function CertificateView({ cert, forExport = false }: Props) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const issueDate = fmt(cert.issued_at);
  const fromDate  = fmt(cert.internship_from);
  const toDate    = fmt(cert.internship_to);

  const px = (n: number) => forExport ? `${n}px` : `${(n / W) * 100}%`;
  const py = (n: number) => forExport ? `${n}px` : `${(n / H) * 100}%`;
  const fs = (n: number) =>
    forExport ? `${n}px` : `clamp(${Math.round(n * 0.35)}px, ${(n / W) * 100}vw, ${n}px)`;

  return (
    <div
      id="certificate-canvas"
      style={{
        position: 'relative',
        width:       forExport ? `${W}px` : '100%',
        height:      forExport ? `${H}px` : undefined,
        aspectRatio: forExport ? undefined : `${W} / ${H}`,
        background: '#f5f0ec',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* ── Diagonal watermark grid ── */}
      <DiagonalGrid forExport={forExport} />

      {/* ── Left silver swoosh ── */}
      <div style={{
        position: 'absolute', left: 0, top: py(560),
        width: px(88), height: py(340),
        background: 'linear-gradient(135deg, #b0b0b0 0%, #e0e0e0 50%, #909090 100%)',
        borderRadius: `0 ${px(60)} ${px(60)} 0`,
        opacity: 0.5,
      }} />

      {/* ── Right silver swoosh ── */}
      <div style={{
        position: 'absolute', right: 0, top: py(100),
        width: px(88), height: py(340),
        background: 'linear-gradient(225deg, #b0b0b0 0%, #e0e0e0 50%, #909090 100%)',
        borderRadius: `${px(60)} 0 0 ${px(60)}`,
        opacity: 0.5,
      }} />

      {/* ── Top-left: Company logo image ── */}
      <div style={{
        position: 'absolute',
        top: py(36),
        left: px(64),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: py(4),
      }}>
        <LogoSVG style={{
          width: forExport ? '900px' : `${(900 / W) * 100}%`,
          height: forExport ? '170px' : `${(170 / H) * 100}%`,
        }} />
      </div>

      {/* ── Top-right: EST 2025 badge ── */}
      <svg
        viewBox="0 0 90 104"
        style={{
          position: 'absolute',
          top: py(28),
          right: px(60),
          width: forExport ? '78px' : `${(78 / W) * 100}%`,
          height: 'auto',
        }}
      >
        <polygon points="45,2 88,22 88,82 45,102 2,82 2,22" fill="#1a2744" />
        <polygon points="45,8 82,26 82,78 45,96 8,78 8,26" fill="none" stroke="#c8a84b" strokeWidth="1.5" />
        <text x="45" y="48" textAnchor="middle" fill="white" fontWeight="700" fontSize="14" fontFamily="Inter,sans-serif" letterSpacing="2">EST</text>
        <text x="45" y="70" textAnchor="middle" fill="#c8a84b" fontWeight="900" fontSize="17" fontFamily="Inter,sans-serif">2025</text>
      </svg>

      {/* ── Top decorative rule ── */}
      <div style={{
        position: 'absolute',
        top: py(154),
        left: px(64), right: px(64),
        height: forExport ? '1.5px' : '0.15%',
        background: 'linear-gradient(90deg, transparent 0%, #999 15%, #444 50%, #999 85%, transparent 100%)',
      }} />

      {/* ── CERTIFICATE OF COURSE COMPLETION ── */}
      <div style={{
        position: 'absolute',
        top: py(172),
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap' as const,
        textAlign: 'center' as const,
      }}>
        <div style={{
          fontSize: fs(38),
          fontWeight: 900,
          color: '#0d1120',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          lineHeight: 1,
        }}>Certificate of Course Completion</div>
      </div>

      {/* ── Ornamental divider ── */}
      <div style={{
        position: 'absolute',
        top: py(256),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: px(14),
        whiteSpace: 'nowrap' as const,
      }}>
        <div style={{ width: px(180), height: forExport ? '2px' : '0.2%', background: '#333' }} />
        <svg viewBox="0 0 32 14" width={forExport ? '32' : `${(32 / W) * 100}%`} height={forExport ? '14' : `${(14 / H) * 100}%`}>
          <polygon points="4,7 10,1 16,7 22,1 28,7 22,13 16,7 10,13" fill="#333" />
        </svg>
        <div style={{ width: px(180), height: forExport ? '2px' : '0.2%', background: '#333' }} />
      </div>

      {/* ── "This is to certify that" ── */}
      <div style={{
        position: 'absolute',
        top: py(294),
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: fs(21),
        color: '#555',
        fontStyle: 'italic' as const,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        whiteSpace: 'nowrap' as const,
        letterSpacing: '0.02em',
      }}>This is to certify that</div>

      {/* ── Student name ── */}
      <div style={{
        position: 'absolute',
        top: py(332),
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center' as const,
        width: forExport ? '900px' : '63.6%',
      }}>
        <div style={{
          fontSize: fs(60),
          fontWeight: 900,
          color: '#0d1120',
          letterSpacing: '0.01em',
          lineHeight: 1.05,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{cert.student_name}</div>
        <div style={{
          marginTop: py(8),
          height: forExport ? '4px' : '0.4%',
          background: '#111',
          borderRadius: px(2),
        }} />
      </div>

      {/* ── Body paragraph ── */}
      <div style={{
        position: 'absolute',
        top: py(452),
        left: px(80), right: px(80),
        fontSize: fs(18),
        color: '#222',
        lineHeight: 1.8,
        fontWeight: 400,
        textAlign: 'justify' as const,
      }}>
        Has successfully completed the course{' '}
        <strong style={{ fontWeight: 700 }}>"{cert.course_title}"</strong>{' '}
        at <strong style={{ fontWeight: 700 }}>MyDesignNexus</strong>
        {cert.internship_from && cert.internship_to ? (
          <>, from <strong style={{ fontWeight: 700 }}>{fromDate}</strong> to{' '}
          <strong style={{ fontWeight: 700 }}>{toDate}</strong></>
        ) : null}
        . During this period, the student demonstrated exceptional dedication and professional growth in{' '}
        <strong style={{ fontWeight: 700 }}>{cert.growth_area || cert.course_category || '—'}</strong>
        . We wish them continued success in their career.
      </div>

      {/* ── Certificate ID ── */}
      <div style={{
        position: 'absolute',
        top: py(652),
        left: px(80),
        fontSize: fs(15),
        color: '#333',
      }}>
        <strong>Certificate ID:</strong>{' '}
        <span style={{ fontFamily: "'Courier New', monospace", letterSpacing: '0.04em' }}>
          {cert.serial_number}
        </span>
      </div>

      {/* ── Horizontal rule above bottom section ── */}
      <div style={{
        position: 'absolute',
        top: py(700),
        left: px(64), right: px(64),
        height: forExport ? '1.5px' : '0.15%',
        background: '#aaa',
      }} />

      {/* ── Bottom trio: Date | Seal | Signature ── */}

      {/* Date (bottom-left) */}
      <div style={{
        position: 'absolute',
        bottom: py(90),
        left: px(80),
      }}>
        <div style={{ fontSize: fs(16), fontWeight: 700, color: '#222', marginBottom: py(8) }}>Date:</div>
        <div style={{
          fontSize: fs(14),
          color: '#444',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.1em',
          borderBottom: `${forExport ? '2px' : '0.2%'} dotted #555`,
          paddingBottom: py(4),
          minWidth: px(180),
        }}>{issueDate}</div>
      </div>

      {/* Vertical separator left */}
      <div style={{
        position: 'absolute',
        bottom: py(52),
        left: px(420),
        width: forExport ? '1.5px' : '0.1%',
        height: py(130),
        background: '#bbb',
      }} />

      {/* Seal (center) — real image */}
      <div style={{
        position: 'absolute',
        bottom: py(54),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: py(6),
      }}>
        <div style={{ fontSize: fs(12), color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontWeight: 500 }}>Seal</div>
        <SealSVG style={{
          width: forExport ? '500px' : `${(500 / W) * 100}%`,
          height: 'auto',
        }} />
      </div>

      {/* Vertical separator right */}
      <div style={{
        position: 'absolute',
        bottom: py(52),
        right: px(420),
        width: forExport ? '1.5px' : '0.1%',
        height: py(130),
        background: '#bbb',
      }} />

      {/* Signature (bottom-right) — real image */}
      <div style={{
        position: 'absolute',
        bottom: py(44),
        right: px(80),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: py(3),
      }}>
        <SignatureSVG style={{
          width: forExport ? '500px' : `${(500 / W) * 100}%`,
          height: 'auto',
          marginBottom: py(4),
        }} />
        <div style={{ width: forExport ? '150px' : `${(150 / W) * 100}%`, height: forExport ? '1.5px' : '0.15%', background: '#333' }} />
        <div style={{ fontSize: fs(11), color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Authorized Signature</div>
        <div style={{ fontSize: fs(21), fontWeight: 900, color: '#111' }}>Rakshith</div>
        <div style={{ fontSize: fs(12), color: '#555' }}>Founder &amp; CEO</div>
        <div style={{ fontSize: fs(12), color: '#555' }}>MyDesignNexus</div>
      </div>

      {/* ── Footer bar ── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: py(44),
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `0 ${px(24)}`,
      }}>
        <div style={{
          fontSize: fs(11),
          color: 'white',
          fontWeight: 700,
          letterSpacing: '0.03em',
          textAlign: 'center' as const,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {FOOTER_TEXT}
        </div>
      </div>

    </div>
  );
}

function DiagonalGrid({ forExport }: { forExport: boolean }) {
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
      width={forExport ? `${W}px` : '100%'}
      height={forExport ? `${H}px` : '100%'}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      {lines}
    </svg>
  );
}
