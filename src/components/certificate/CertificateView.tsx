import type { CourseCertificate } from '../../hooks/useCourses';

const CERT_W = 1493;
const CERT_H = 1054;

interface Props {
  cert: CourseCertificate;
  templateUrl: string;
  forExport?: boolean;
}

export function CertificateView({ cert, templateUrl, forExport = false }: Props) {
  const fromDate = cert.internship_from
    ? new Date(cert.internship_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const toDate = cert.internship_to
    ? new Date(cert.internship_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const issueDate = new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div
      id="certificate-canvas"
      className="relative bg-white"
      style={{
        width: forExport ? `${CERT_W}px` : '100%',
        aspectRatio: `${CERT_W} / ${CERT_H}`,
        maxWidth: forExport ? 'none' : '100%',
        containerType: forExport ? undefined : 'inline-size',
      }}
    >
      {/* Background template */}
      <img
        src={templateUrl}
        alt=""
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      {/* Dynamic text overlay */}
      <div className="absolute inset-0 select-none" style={{ pointerEvents: 'none' }}>

        {/* STUDENT NAME - on the horizontal black line under "This is to certify that" */}
        <div
          className="absolute text-center"
          style={{
            top: '33%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '55%',
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: forExport ? '48px' : 'clamp(16px, 3.2cqi, 48px)',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          {cert.student_name}
        </div>

        {/* DEPARTMENT - "department of ___" */}
        <FilledBlank
          top="43.5%"
          left="25.5%"
          width="13%"
          value={cert.department}
          forExport={forExport}
        />

        {/* FROM DATE - "from ___" */}
        <FilledBlank
          top="43.5%"
          left="46%"
          width="12%"
          value={fromDate}
          forExport={forExport}
        />

        {/* TO DATE - "to ___" */}
        <FilledBlank
          top="43.5%"
          left="65%"
          width="14%"
          value={toDate}
          forExport={forExport}
        />

        {/* GROWTH AREA - "professional growth in ___" */}
        <FilledBlank
          top="53%"
          left="18%"
          width="20%"
          value={cert.growth_area}
          forExport={forExport}
        />

        {/* CERTIFICATE ID - bottom left */}
        <div
          className="absolute"
          style={{
            top: '62.5%',
            left: '3.5%',
            fontFamily: '"Inter", sans-serif',
            fontSize: forExport ? '18px' : 'clamp(8px, 1.3cqi, 18px)',
            fontWeight: 500,
            color: '#1a1a1a',
            letterSpacing: '0.01em',
          }}
        >
          Certificate id : <span style={{ fontWeight: 600 }}>{cert.serial_number}</span>
        </div>

        {/* INSTRUCTOR NAME - below certificate id */}
        <div
          className="absolute"
          style={{
            top: '68%',
            left: '3.5%',
            fontFamily: '"Inter", sans-serif',
            fontSize: forExport ? '18px' : 'clamp(8px, 1.3cqi, 18px)',
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Instructor Name : <span style={{ fontWeight: 600 }}>{cert.instructor_name}</span>
        </div>

        {/* DATE - bottom left, below instructor */}
        <div
          className="absolute"
          style={{
            top: '79%',
            left: '3.5%',
            fontFamily: '"Inter", sans-serif',
            fontSize: forExport ? '20px' : 'clamp(9px, 1.4cqi, 20px)',
            fontWeight: 500,
            color: '#1a1a1a',
          }}
        >
          Date: <span style={{ fontWeight: 600 }}>{issueDate}</span>
        </div>

        {/* SERIAL NUMBER - vertical on right margin */}
        <div
          className="absolute"
          style={{
            top: '50%',
            right: forExport ? '18px' : '1.2%',
            transform: 'translateY(-50%) rotate(90deg)',
            transformOrigin: 'center center',
            fontFamily: '"JetBrains Mono", "Courier New", monospace',
            fontSize: forExport ? '13px' : 'clamp(6px, 0.85cqi, 13px)',
            fontWeight: 600,
            color: '#6A6F73',
            letterSpacing: '0.35em',
            textTransform: 'uppercase' as const,
            whiteSpace: 'nowrap' as const,
          }}
        >
          {cert.serial_number}
        </div>

      </div>
    </div>
  );
}

function FilledBlank({ top, left, width, value, forExport }: {
  top: string; left: string; width: string; value: string; forExport: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        top,
        left,
        width,
        fontFamily: '"Inter", sans-serif',
        fontSize: forExport ? '20px' : 'clamp(8px, 1.4cqi, 20px)',
        fontWeight: 600,
        color: '#1a1a1a',
        textAlign: 'center',
        lineHeight: 1,
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transform: 'translateY(-30%)',
      }}
    >
      {value}
    </div>
  );
}
