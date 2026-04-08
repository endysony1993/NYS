const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function getConfig() {
  return {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER,
    toEmail: process.env.TEST_TO_EMAIL || process.env.CONTACT_TO_EMAIL || 'nystechcoltd@gmail.com'
  };
}

function validateConfig(config) {
  const missing = [];
  if (!config.smtpHost) missing.push('SMTP_HOST');
  if (!config.smtpUser) missing.push('SMTP_USER');
  if (!config.smtpPass) missing.push('SMTP_PASS');
  if (!config.fromEmail) missing.push('CONTACT_FROM_EMAIL or SMTP_USER');
  if (!config.toEmail) missing.push('TEST_TO_EMAIL or CONTACT_TO_EMAIL');
  return missing;
}

function hasPlaceholderValues(config) {
  const placeholderPatterns = [
    'your-smtp-username',
    'your-smtp-password',
    'your-gmail-address@gmail.com',
    'your-gmail-app-password'
  ];

  return [config.smtpUser, config.smtpPass, config.fromEmail].some((value) => {
    return typeof value === 'string' && placeholderPatterns.indexOf(value) !== -1;
  });
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env'));

  const isDryRun = process.argv.includes('--dry-run');
  const config = getConfig();
  const missing = validateConfig(config);

  if (missing.length) {
    console.error('Missing required email configuration:', missing.join(', '));
    console.error('Create a .env file from .env.example and fill in the SMTP credentials first.');
    process.exit(1);
  }

  if (hasPlaceholderValues(config)) {
    console.error('Email configuration still uses placeholder values in .env.');
    console.error('Replace the Gmail address and app password with real SMTP credentials before testing.');
    process.exit(1);
  }

  const message = {
    from: config.fromEmail,
    to: config.toEmail,
    replyTo: config.fromEmail,
    subject: '[NYS Website] Test email',
    text: [
      'This is a test email from the NYS contact form setup.',
      '',
      'SMTP host: ' + config.smtpHost,
      'SMTP port: ' + config.smtpPort,
      'SMTP secure: ' + config.smtpSecure,
      'Sent at: ' + new Date().toISOString()
    ].join('\n')
  };

  if (isDryRun) {
    console.log('Dry run successful. Email configuration looks complete.');
    console.log('Test email would be sent to:', config.toEmail);
    console.log('From:', config.fromEmail);
    console.log('SMTP host:', config.smtpHost + ':' + config.smtpPort);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  await transporter.sendMail(message);
  console.log('Test email sent successfully to', config.toEmail);
}

main().catch((error) => {
  console.error('Test email failed:', error.message);
  process.exit(1);
});
