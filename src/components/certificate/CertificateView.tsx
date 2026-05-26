import type { CourseCertificate } from '../../hooks/useCourses';

interface Props {
  cert: CourseCertificate;
  forExport?: boolean;
}

// A4 landscape: 1414 × 1000 px at ~120 ppi
const W = 1414;
const H = 1000;

export function CertificateView({ cert, forExport = false }: Props) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const issueDate = fmt(cert.issued_at);
  const fromDate  = fmt(cert.internship_from);
  const toDate    = fmt(cert.internship_to);

  const px = (n: number) => forExport ? `${n}px` : `${(n / W) * 100}%`;
  const py = (n: number) => forExport ? `${n}px` : `${(n / H) * 100}%`;
  const fs = (n: number) => forExport ? `${n}px` : `clamp(${Math.round(n * 0.35)}px, ${(n / W) * 100}vw, ${n}px)`;

  return (
    <div
      id="certificate-canvas"
      style={{
        position: 'relative',
        width:  forExport ? `${W}px` : '100%',
        height: forExport ? `${H}px` : undefined,
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
        position: 'absolute',
        left: 0,
        top: py(560),
        width: px(88),
        height: py(340),
        background: 'linear-gradient(135deg, #b0b0b0 0%, #e0e0e0 50%, #909090 100%)',
        borderRadius: `0 ${px(60)} ${px(60)} 0`,
        opacity: 0.5,
      }} />

      {/* ── Right silver swoosh ── */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: py(100),
        width: px(88),
        height: py(340),
        background: 'linear-gradient(225deg, #b0b0b0 0%, #e0e0e0 50%, #909090 100%)',
        borderRadius: `${px(60)} 0 0 ${px(60)}`,
        opacity: 0.5,
      }} />

      {/* ── Top-left logo: MyDesignNexus ── */}
      <div style={{
        position: 'absolute',
        top: py(44),
        left: px(64),
      }}>
        <div style={{
          fontSize: fs(36),
          fontWeight: 900,
          color: '#111',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}>
          <span style={{ fontWeight: 900 }}>MyDesign</span>
          <span style={{ fontWeight: 400 }}>Nexus</span>
        </div>
        <div style={{
          marginTop: py(4),
          fontSize: fs(11),
          color: '#666',
          letterSpacing: '0.22em',
          textTransform: 'uppercase' as const,
          fontWeight: 500,
        }}>AI Solution Company</div>
      </div>

      {/* ── Top-right EST 2025 badge ── */}
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
        top: py(158),
        left: px(64),
        right: px(64),
        height: forExport ? '1.5px' : '0.15%',
        background: 'linear-gradient(90deg, transparent 0%, #999 15%, #444 50%, #999 85%, transparent 100%)',
      }} />

      {/* ── CERTIFICATE OF INTERNSHIP ── */}
      <div style={{
        position: 'absolute',
        top: py(178),
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap' as const,
        textAlign: 'center' as const,
      }}>
        <div style={{
          fontSize: fs(52),
          fontWeight: 900,
          color: '#0d1120',
          letterSpacing: '0.07em',
          textTransform: 'uppercase' as const,
          lineHeight: 1,
        }}>Certificate of Internship</div>
      </div>

      {/* ── Ornamental divider ── */}
      <div style={{
        position: 'absolute',
        top: py(262),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: px(14),
        whiteSpace: 'nowrap' as const,
      }}>
        <div style={{ width: px(180), height: forExport ? '2px' : '0.2%', background: '#333' }} />
        <svg viewBox="0 0 32 14" width={forExport ? '32' : `${(32/W)*100}%`} height={forExport ? '14' : `${(14/H)*100}%`}>
          <polygon points="4,7 10,1 16,7 22,1 28,7 22,13 16,7 10,13" fill="#333"/>
        </svg>
        <div style={{ width: px(180), height: forExport ? '2px' : '0.2%', background: '#333' }} />
      </div>

      {/* ── "This is to certify that" ── */}
      <div style={{
        position: 'absolute',
        top: py(300),
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
        top: py(340),
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
        top: py(460),
        left: px(80),
        right: px(80),
        fontSize: fs(18),
        color: '#222',
        lineHeight: 1.8,
        fontWeight: 400,
        textAlign: 'justify' as const,
      }}>
        Has successfully completed the internship program at{' '}
        <strong style={{ fontWeight: 700 }}>MyDesignNexus</strong>{' '}
        in the department of{' '}
        <strong style={{ fontWeight: 700 }}>{cert.department || cert.course_category || '—'}</strong>
        {cert.internship_from && cert.internship_to ? (
          <> from <strong style={{ fontWeight: 700 }}>{fromDate}</strong> to{' '}
          <strong style={{ fontWeight: 700 }}>{toDate}</strong></>
        ) : null}
        {'. '}
        During this period, the intern demonstrated exceptional skills, dedication, and professional growth in{' '}
        <strong style={{ fontWeight: 700 }}>{cert.growth_area || cert.course_title || '—'}</strong>
        . We wish them continued success in their career.
      </div>

      {/* ── Certificate ID + Instructor Name ── */}
      <div style={{
        position: 'absolute',
        top: py(652),
        left: px(80),
        display: 'flex',
        flexDirection: 'column',
        gap: py(8),
      }}>
        <div style={{ fontSize: fs(16), color: '#333' }}>
          <strong>Certificate id :</strong>{' '}
          <span style={{ fontFamily: "'Courier New', monospace", letterSpacing: '0.04em' }}>
            {cert.serial_number}
          </span>
        </div>
        <div style={{ fontSize: fs(16), color: '#333' }}>
          <strong>Instructor Name :</strong> {cert.instructor_name || 'Rakshith'}
        </div>
      </div>

      {/* ── Horizontal rule above bottom section ── */}
      <div style={{
        position: 'absolute',
        top: py(740),
        left: px(64),
        right: px(64),
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
        <div style={{ fontSize: fs(17), fontWeight: 700, color: '#222', marginBottom: py(8) }}>Date:</div>
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

      {/* Vertical separator (left of seal) */}
      <div style={{
        position: 'absolute',
        bottom: py(56),
        left: px(420),
        width: forExport ? '1.5px' : '0.1%',
        height: py(118),
        background: '#bbb',
      }} />

      {/* Seal (center) */}
      <div style={{
        position: 'absolute',
        bottom: py(58),
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: py(6),
      }}>
        <div style={{ fontSize: fs(13), color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontWeight: 500 }}>Seal</div>
        <svg viewBox="0 0 80 80" style={{ width: forExport ? '72px' : `${(72/W)*100}%`, height: 'auto' }}>
          <circle cx="40" cy="40" r="37" fill="none" stroke="#333" strokeWidth="1.5" strokeDasharray="4 3"/>
          <circle cx="40" cy="40" r="29" fill="none" stroke="#444" strokeWidth="0.8"/>
          <rect x="11" y="28" width="58" height="24" rx="3" fill="#111"/>
          <text x="40" y="44" textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="Inter,sans-serif" letterSpacing="1">MDN</text>
        </svg>
      </div>

      {/* Vertical separator (right of seal) */}
      <div style={{
        position: 'absolute',
        bottom: py(56),
        right: px(420),
        width: forExport ? '1.5px' : '0.1%',
        height: py(118),
        background: '#bbb',
      }} />

      {/* Authorized Signature (bottom-right) */}
      <div style={{
        position: 'absolute',
        bottom: py(52),
        right: px(80),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: py(3),
      }}>
        {/* Stylised signature curve */}
        <svg viewBox="0 0 120 44" style={{ width: forExport ? '110px' : `${(110/W)*100}%`, height: 'auto' }}>
          <path d="M8 36 Q 25 4, 45 26 Q 65 46, 82 18 Q 98 -2, 112 20" fill="none" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{ width: forExport ? '150px' : `${(150/W)*100}%`, height: forExport ? '1.5px' : '0.15%', background: '#333' }} />
        <div style={{ fontSize: fs(12), color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Authorized Signature</div>
        <div style={{ fontSize: fs(22), fontWeight: 900, color: '#111' }}>Rakshith</div>
        <div style={{ fontSize: fs(12), color: '#555' }}>Founder &amp; CEO</div>
        <div style={{ fontSize: fs(12), color: '#555' }}>MyDesignNexus</div>
      </div>

      {/* ── Footer bar ── */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: py(44),
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontSize: fs(12),
          color: 'white',
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}>
          mydesignnexus.in &nbsp;|&nbsp; Hassan, Karnataka, India &nbsp;|&nbsp; AI Automation &bull; AI Call Agents &bull; Web Development
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
