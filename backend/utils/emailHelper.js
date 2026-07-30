export async function sendOtpEmail({ to, otpCode, expiresInMinutes = 5 }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    const error = new Error('Dịch vụ email chưa được cấu hình.');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to,
    subject: 'Mã xác thực khôi phục mật khẩu PKA Portal',
    text: `Mã OTP của bạn là ${otpCode}. Mã có hiệu lực trong ${expiresInMinutes} phút. Không chia sẻ mã này với người khác.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:#4f46e5">PKA Portal</h2>
        <p>Bạn vừa yêu cầu khôi phục mật khẩu.</p>
        <p>Mã xác thực của bạn:</p>
        <div style="font-size:30px;font-weight:700;letter-spacing:8px;padding:18px;background:#f3f4f6;text-align:center">${otpCode}</div>
        <p>Mã có hiệu lực trong ${expiresInMinutes} phút. Không chia sẻ mã này với người khác.</p>
      </div>
    `
  });
}
