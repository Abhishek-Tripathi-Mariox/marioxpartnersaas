// Email templates. Table layout and inline styles so they render the same in Gmail, Outlook and phones.

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const BRAND = '#ff5a1f';
const INK = '#111318';
const MUTED = '#6b7080';

function layout({ preheader, body }: { preheader: string; body: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Mariox Partner Portal</title></head>
<body style="margin:0;padding:0;background:#f2f3f6;-webkit-text-size-adjust:100%">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f6"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;height:36px;background:${INK};border-radius:10px;text-align:center;vertical-align:middle;font:800 18px Arial,sans-serif;color:#fff">M</td>
        <td style="padding-left:10px;font:700 17px Arial,sans-serif;color:${INK}">Mariox <span style="font-weight:400;color:${MUTED}">Partner Portal</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:20px;padding:36px 32px;border:1px solid #e6e8ee">${body}</td></tr>
    <tr><td style="padding:18px 8px 0;font:12px/1.6 Arial,sans-serif;color:${MUTED};text-align:center">
      Mariox Software Pvt. Ltd. · Noida · Bengaluru<br>You received this because a Mariox partner account was created for this email.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Invite to set a password for a new (or re-invited) partner account.
export function partnerInvite({ name, url, partnerCode, email, days = 7, again = false }: { name: string; url: string; partnerCode?: string; email: string; days?: number; again?: boolean }) {
  const first = name.trim().split(/\s+/)[0] || 'there';
  const subject = again ? 'Your new link to set your Mariox partner password' : 'Welcome to the Mariox Partner Program – set your password';
  const steps = [
    ['Set your password', 'Use the button below. The link works once.'],
    ['Add your first lead', 'Track every client you introduce, from first call to signed deal.'],
    ['Earn on every payment', 'You earn a share of each payment your clients make to Mariox.'],
  ];
  const body = `
    <p style="margin:0 0 6px;font:600 12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${BRAND}">${again ? 'New sign-in link' : 'Welcome aboard'}</p>
    <h1 style="margin:0 0 14px;font:700 26px/1.2 Arial,sans-serif;color:${INK}">Hi ${esc(first)}, ${again ? 'here is your new link' : 'your partner account is ready'}</h1>
    <p style="margin:0 0 22px;font:15px/1.6 Arial,sans-serif;color:#3b3f4a">${again
      ? 'You asked for a new link to set the password for your Mariox partner account. It replaces any link we sent before.'
      : 'Mariox has created your partner account. Set a password to sign in, add your leads and follow your commission.'}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f6f7f9;border-radius:14px;width:100%"><tr><td style="padding:14px 18px;font:14px/1.7 Arial,sans-serif;color:#3b3f4a">
      <b style="color:${INK}">Sign-in email:</b> ${esc(email)}${partnerCode ? `<br><b style="color:${INK}">Partner ID:</b> ${esc(partnerCode)}` : ''}
    </td></tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr><td style="border-radius:12px;background:${BRAND}">
      <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font:700 15px Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:12px">Set my password</a>
    </td></tr></table>
    <p style="margin:0 0 26px;font:13px/1.6 Arial,sans-serif;color:${MUTED}">This link expires in ${days} days. If the button does not work, copy this address into your browser:<br><a href="${esc(url)}" style="color:${BRAND};word-break:break-all">${esc(url)}</a></p>
    ${again ? '' : `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #eceef2">${steps.map(([t, d], i) => `
      <tr><td style="padding:16px 0 0;width:34px;vertical-align:top"><div style="width:26px;height:26px;border-radius:8px;background:#fff1eb;color:${BRAND};font:700 13px/26px Arial,sans-serif;text-align:center">${i + 1}</div></td>
      <td style="padding:16px 0 0;font:14px/1.5 Arial,sans-serif;color:#3b3f4a"><b style="color:${INK}">${t}</b><br>${d}</td></tr>`).join('')}
    </table>`}
    <p style="margin:26px 0 0;font:14px/1.6 Arial,sans-serif;color:#3b3f4a">Questions? Just reply to this email.<br>Team Mariox</p>`;
  const text = [
    `Hi ${first},`,
    '',
    again ? 'Here is your new link to set the password for your Mariox partner account (it replaces any older link):' : 'Mariox has created your partner account. Set your password here:',
    url,
    '',
    `Sign-in email: ${email}${partnerCode ? `\nPartner ID: ${partnerCode}` : ''}`,
    `The link expires in ${days} days.`,
    '',
    'Team Mariox',
  ].join('\n');
  return { subject, html: layout({ preheader: again ? 'Your new link to set your password' : 'Set your password to start adding leads', body }), text };
}

// Welcome email with the login details the admin set: portal link, email and password.
// `reset`: the admin set a new password for an existing account.
export function partnerWelcome({ name, email, password, loginUrl, partnerCode, reset = false }: { name: string; email: string; password: string; loginUrl: string; partnerCode?: string; reset?: boolean }) {
  const first = name.trim().split(/\s+/)[0] || 'there';
  const row = (k: string, v: string, mono = false) =>
    `<tr><td style="padding:8px 0;font:13px Arial,sans-serif;color:${MUTED};width:92px;vertical-align:top">${k}</td><td style="padding:8px 0;font:${mono ? '600 15px \'Courier New\',monospace' : '600 15px Arial,sans-serif'};color:${INK};word-break:break-all">${esc(v)}</td></tr>`;
  const steps = [
    ['Sign in', 'Use the button above with your email and password.'],
    ['Change your password', 'Account → Password & security, so only you know it.'],
    ['Add your first lead', 'Track every client you introduce and the commission you earn on their payments.'],
  ];
  const body = `
    <p style="margin:0 0 6px;font:600 12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${BRAND}">${reset ? 'New password' : 'Welcome aboard'}</p>
    <h1 style="margin:0 0 14px;font:700 26px/1.2 Arial,sans-serif;color:${INK}">Hi ${esc(first)}, ${reset ? 'your password was changed' : 'your partner account is ready'}</h1>
    <p style="margin:0 0 20px;font:15px/1.6 Arial,sans-serif;color:#3b3f4a">${reset ? 'Mariox has set a new password for your partner account. Your old password no longer works. Here are your login details.' : 'Mariox has created your partner account. Here are your login details.'}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f6f7f9;border-radius:14px;width:100%"><tr><td style="padding:10px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        ${row('Portal', loginUrl)}${row('Email', email)}${row('Password', password, true)}${partnerCode ? row('Partner ID', partnerCode) : ''}
      </table>
    </td></tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr><td style="border-radius:12px;background:${BRAND}">
      <a href="${esc(loginUrl)}" style="display:inline-block;padding:14px 28px;font:700 15px Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:12px">Sign in to the partner portal</a>
    </td></tr></table>
    <p style="margin:0 0 26px;font:13px/1.6 Arial,sans-serif;color:${MUTED}">If the button does not work, copy this address into your browser:<br><a href="${esc(loginUrl)}" style="color:${BRAND};word-break:break-all">${esc(loginUrl)}</a></p>
    ${reset ? '' : `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #eceef2">${steps.map(([t, d], i) => `
      <tr><td style="padding:16px 0 0;width:34px;vertical-align:top"><div style="width:26px;height:26px;border-radius:8px;background:#fff1eb;color:${BRAND};font:700 13px/26px Arial,sans-serif;text-align:center">${i + 1}</div></td>
      <td style="padding:16px 0 0;font:14px/1.5 Arial,sans-serif;color:#3b3f4a"><b style="color:${INK}">${t}</b><br>${d}</td></tr>`).join('')}
    </table>`}
    <p style="margin:26px 0 0;font:14px/1.6 Arial,sans-serif;color:#3b3f4a">Questions? Just reply to this email.<br>Team Mariox</p>`;
  const text = [
    `Hi ${first},`, '', reset ? 'Mariox has set a new password for your partner account. Your login details:' : 'Mariox has created your partner account. Your login details:', '',
    `Portal: ${loginUrl}`, `Email: ${email}`, `Password: ${password}`, ...(partnerCode ? [`Partner ID: ${partnerCode}`] : []), '',
    'Please change your password after signing in (Account > Password & security).', '', 'Team Mariox',
  ].join('\n');
  return { subject: reset ? 'Your Mariox partner password was changed' : 'Welcome to the Mariox Partner Program – your login details', html: layout({ preheader: 'Your partner portal login details', body }), text };
}

// One-time code for "Forgot password".
export function passwordOtp({ name, code, minutes }: { name: string; code: string; minutes: number }) {
  const first = name.trim().split(/\s+/)[0] || 'there';
  const body = `
    <p style="margin:0 0 6px;font:600 12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${BRAND}">Password reset</p>
    <h1 style="margin:0 0 14px;font:700 26px/1.2 Arial,sans-serif;color:${INK}">Hi ${esc(first)}, here is your code</h1>
    <p style="margin:0 0 22px;font:15px/1.6 Arial,sans-serif;color:#3b3f4a">Enter this code on the Mariox partner portal to set a new password.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;width:100%"><tr><td align="center" style="background:#f6f7f9;border-radius:14px;padding:22px 12px">
      <span style="font:700 34px 'Courier New',monospace;letter-spacing:10px;color:${INK}">${esc(code)}</span>
    </td></tr></table>
    <p style="margin:0 0 6px;font:14px/1.6 Arial,sans-serif;color:#3b3f4a">The code expires in <b>${minutes} minutes</b> and works once.</p>
    <p style="margin:0;font:13px/1.6 Arial,sans-serif;color:${MUTED}">Didn't ask for this? You can ignore this email: your password stays the same. Never share this code with anyone, Mariox will never ask for it.</p>`;
  const text = `Hi ${first},\n\nYour Mariox partner portal password reset code: ${code}\nIt expires in ${minutes} minutes and works once.\n\nDidn't ask for this? Ignore this email: your password stays the same.\n\nTeam Mariox`;
  return { subject: `${code} is your Mariox password reset code`, html: layout({ preheader: `Your code: ${code}`, body }), text };
}
