const nodemailer = require('nodemailer');

function isPlaceholderValue(value) {
  return [
    'your-smtp-username',
    'your-smtp-password',
    'your-gmail-address@gmail.com',
    'your-gmail-app-password'
  ].indexOf(value) !== -1;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }

  return body;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = parseRequestBody(req.body);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const language = typeof body.language === 'string' ? body.language.trim() : 'vi';

  if (!name || !contact || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (!isValidEmail(contact)) {
    return res.status(400).json({ error: 'Invalid contact value.', code: 'INVALID_CONTACT' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const toEmail = process.env.CONTACT_TO_EMAIL || 'nystechcoltd@gmail.com';
  const fromEmail = process.env.CONTACT_FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    return res.status(500).json({ error: 'Email server is not configured.', code: 'CONFIG_MISSING' });
  }

  if (isPlaceholderValue(smtpUser) || isPlaceholderValue(smtpPass) || isPlaceholderValue(fromEmail)) {
    return res.status(500).json({ error: 'Email server is using placeholder values.', code: 'CONFIG_PLACEHOLDER' });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const subject = '[NYS Website] Partnership request';
  const text = [
    'Name: ' + name,
    'Contact: ' + contact,
    'Language: ' + language,
    '',
    'Message:',
    message
  ].join('\n');

  try {
    await transporter.verify();

    var mailOptions = {
      from: fromEmail,
      to: toEmail,
      subject,
      text
    };

    mailOptions.replyTo = contact;

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Contact form send failed', {
      code: error && error.code ? error.code : 'UNKNOWN',
      command: error && error.command ? error.command : null,
      response: error && error.response ? error.response : null,
      responseCode: error && error.responseCode ? error.responseCode : null,
      message: error && error.message ? error.message : 'Unknown error'
    });

    if (error && (error.code === 'EAUTH' || error.responseCode === 535)) {
      return res.status(500).json({ error: 'SMTP authentication failed.', code: 'SMTP_AUTH_FAILED' });
    }

    if (error && (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET')) {
      return res.status(500).json({ error: 'SMTP connection failed.', code: 'SMTP_CONNECTION_FAILED' });
    }

    return res.status(500).json({ error: 'Unable to send message.', code: 'SEND_FAILED' });
  }
};
