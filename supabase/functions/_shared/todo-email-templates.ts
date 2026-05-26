export interface TodoEmailData {
  todoTitle: string;
  todoNotes?: string | null;
  dueAt?: string | null;
  priority?: 'low' | 'medium' | 'high';
  userName: string;
  appUrl: string;
}

const COLORS = {
  bg:      '#F8FAFC',
  card:    '#FFFFFF',
  text:    '#0F172A',
  muted:   '#64748B',
  border:  '#E2E8F0',
  brand:   '#111827',
  success: '#10B981',
  warning: '#F59E0B',
  danger:  '#EF4444',
};

function shell(title: string, accent: string, bodyHtml: string, ctaUrl: string, ctaLabel: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLORS.text};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid ${COLORS.border};">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-size:14px;font-weight:700;color:${COLORS.text};letter-spacing:-0.01em;">aiwithrakshith</td>
            <td style="padding-left:4px;color:${COLORS.muted};font-size:11px;">.tech</td>
          </tr></table>
        </td></tr>
        <tr><td style="height:4px;background:${accent};line-height:0;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 28px 24px;">${bodyHtml}</td></tr>
        <tr><td style="padding:0 28px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td align="center">
              <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:${COLORS.text};color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:8px;">${ctaLabel}</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:18px 28px;background:${COLORS.bg};border-top:1px solid ${COLORS.border};">
          <p style="margin:0;font-size:11px;color:${COLORS.muted};line-height:1.6;">
            Sent from <a href="${ctaUrl}" style="color:${COLORS.muted};text-decoration:underline;">aiwithrakshith.tech</a> &nbsp;&middot;&nbsp; Hassan, Karnataka, India<br/>
            You can turn off todo emails anytime in <a href="${ctaUrl}/settings" style="color:${COLORS.muted};text-decoration:underline;">Settings</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function todoCard(data: TodoEmailData): string {
  const priorityColor = data.priority === 'high' ? COLORS.danger : data.priority === 'medium' ? COLORS.warning : COLORS.muted;
  const priorityLabel = (data.priority ?? 'medium').toUpperCase();
  const dueLine = data.dueAt
    ? `<tr><td style="padding-top:8px;font-size:12px;color:${COLORS.muted};"><strong style="color:${COLORS.text};">Due:</strong> ${formatDate(data.dueAt)}</td></tr>`
    : '';
  const notesLine = data.todoNotes
    ? `<tr><td style="padding-top:10px;font-size:13px;color:${COLORS.text};line-height:1.6;">${escapeHtml(data.todoNotes)}</td></tr>`
    : '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bg};border:1px solid ${COLORS.border};border-radius:10px;padding:16px 18px;margin-top:18px;">
      <tr><td><span style="display:inline-block;background:${priorityColor};color:#fff;font-size:9px;font-weight:700;letter-spacing:0.06em;padding:3px 8px;border-radius:4px;">${priorityLabel}</span></td></tr>
      <tr><td style="padding-top:6px;font-size:16px;font-weight:700;color:${COLORS.text};line-height:1.4;">${escapeHtml(data.todoTitle)}</td></tr>
      ${dueLine}
      ${notesLine}
    </table>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export function createdEmail(d: TodoEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:${COLORS.muted};">Hi ${escapeHtml(d.userName)},</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:${COLORS.text};letter-spacing:-0.01em;">Your todo was created</h1>
    <p style="margin:10px 0 0;font-size:13px;color:${COLORS.muted};line-height:1.6;">Here's a quick summary of what you just added to your list.</p>
    ${todoCard(d)}
  `;
  return {
    subject: `Todo created: ${d.todoTitle.slice(0, 60)}`,
    html: shell('Todo Created', COLORS.brand, body, d.appUrl + '/todos', 'View all todos'),
  };
}

export function reminderEmail(d: TodoEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:${COLORS.muted};">Hi ${escapeHtml(d.userName)},</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:${COLORS.text};letter-spacing:-0.01em;">30 minutes left</h1>
    <p style="margin:10px 0 0;font-size:13px;color:${COLORS.muted};line-height:1.6;">Just a heads-up — this todo is due soon.</p>
    ${todoCard(d)}
  `;
  return {
    subject: `Due in 30 min: ${d.todoTitle.slice(0, 60)}`,
    html: shell('Todo Reminder', COLORS.warning, body, d.appUrl + '/todos', 'Open todo'),
  };
}

export function completedEmail(d: TodoEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:${COLORS.muted};">Hi ${escapeHtml(d.userName)},</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:${COLORS.text};letter-spacing:-0.01em;">Done!</h1>
    <p style="margin:10px 0 0;font-size:13px;color:${COLORS.muted};line-height:1.6;">Congrats on ticking this one off.</p>
    ${todoCard(d)}
  `;
  return {
    subject: `Completed: ${d.todoTitle.slice(0, 60)}`,
    html: shell('Todo Completed', COLORS.success, body, d.appUrl + '/todos', 'View all todos'),
  };
}

export function overdueEmail(d: TodoEmailData): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 6px;font-size:14px;color:${COLORS.muted};">Hi ${escapeHtml(d.userName)},</p>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:${COLORS.text};letter-spacing:-0.01em;">This todo is overdue</h1>
    <p style="margin:10px 0 0;font-size:13px;color:${COLORS.muted};line-height:1.6;">No pressure — just a nudge that the due time has passed. Mark it done, reschedule, or remove it.</p>
    ${todoCard(d)}
  `;
  return {
    subject: `Overdue: ${d.todoTitle.slice(0, 60)}`,
    html: shell('Todo Overdue', COLORS.danger, body, d.appUrl + '/todos', 'Open todo'),
  };
}

export async function sendResendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'aiwithrakshith <todos@aiwithrakshith.tech>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Resend ${res.status}: ${text}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
