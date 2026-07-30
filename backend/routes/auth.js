import express from 'express';
import { Op } from 'sequelize';
import { User, Student, Lecturer, Major, Department, AuditLog, RefreshToken } from '../models/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { calculateAcademicProgress } from '../utils/studentAcademicHelper.js';
import { getCurrentAcademicTerm, getCurrentSemester, getRegistrationWindow } from '../utils/academicTermHelper.js';
import {
  hashOpaqueToken,
  hashPassword,
  issueTokenPair,
  revokeAllRefreshTokens,
  rotateRefreshToken,
  verifyPassword
} from '../utils/authSecurityHelper.js';
import { sendOtpEmail } from '../utils/emailHelper.js';

const router = express.Router();

// Đăng nhập hệ thống (Xác thực bcrypt & Cấp JWT Token)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await findUserByIdentifier(username);

    if (!user) {
      return res.status(401).json({ message: 'Tên tài khoản hoặc mật khẩu không chính xác.' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
    }

    const passwordCheck = await verifyPassword(password, user.password);
    if (!passwordCheck.valid) {
      return res.status(401).json({ message: 'Tên tài khoản hoặc mật khẩu không chính xác.' });
    }
    if (passwordCheck.needsUpgrade) {
      user.password = await hashPassword(password);
      await user.save();
    }

    // Lấy Hồ sơ chi tiết (Student hoặc Lecturer)
    let profile = null;
    if (user.role === 'student') {
      const st = await Student.findOne({
        where: { userId: user.id },
        include: [{ model: Major, include: [Department] }]
      });
      if (st) {
        profile = st.toJSON();
        profile.academicProgress = calculateAcademicProgress(profile.enrollmentDate, await getCurrentSemester());
      }
    } else if (user.role === 'lecturer') {
      profile = await Lecturer.findOne({
        where: { userId: user.id },
        include: [Department]
      });
    }

    const tokens = await issueTokenPair(user, req.ip || req.headers['x-forwarded-for']);

    return res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresIn: tokens.expiresIn,
      refreshExpiresAt: tokens.refreshExpiresAt,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isFirstLogin: user.isFirstLogin
      },
      profile
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({ message: 'Có lỗi xảy ra trên server.' });
  }
});

// Lấy thông tin tài khoản hiện tại thông qua JWT Token
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    let profile = null;
    if (user.role === 'student') {
      const st = await Student.findOne({
        where: { userId: user.id },
        include: [{ model: Major, include: [Department] }]
      });
      if (st) {
        profile = st.toJSON();
        profile.academicProgress = calculateAcademicProgress(profile.enrollmentDate, await getCurrentSemester());
      }
    } else if (user.role === 'lecturer') {
      profile = await Lecturer.findOne({
        where: { userId: user.id },
        include: [Department]
      });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      profile
    });
  } catch (error) {
    console.error('Lỗi lấy profile:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

router.get('/context', authenticateToken, async (req, res) => {
  try {
    const term = await getCurrentAcademicTerm();
    const registration = await getRegistrationWindow(term.id);
    return res.json({
      currentTerm: term,
      registration: {
        isOpen: registration.isOpen,
        period: registration.period,
        nextPeriod: registration.nextPeriod
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải cấu hình học vụ hiện hành.' });
  }
});

// Đổi mật khẩu (Mã hóa mật khẩu mới bằng bcrypt)
router.post('/change-password', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const passwordCheck = await verifyPassword(currentPassword, user.password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' });
    }
    user.password = await hashPassword(newPassword);
    user.isFirstLogin = false;
    await user.save();

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'DOI_MAT_KHAU',
      details: 'Người dùng tự đổi mật khẩu thành công.',
      ipAddress: clientIp
    });

    return res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// Helper: Che mờ email phục vụ hiển thị an toàn
function maskEmail(email) {
  if (!email || !email.includes('@')) return '******';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

// Helper: Tìm kiếm User theo nhiều hình thức (username, email, MSV/MGV)
async function findUserByIdentifier(input) {
  if (!input) return null;
  const str = input.trim();
  
  // 1. Khớp trực tiếp username trong bảng Users
  let user = await User.findOne({ where: { username: str } });
  if (user) return user;

  // 2. Thử ghép thêm đuôi @pka.edu.vn
  if (!str.includes('@')) {
    user = await User.findOne({ where: { username: `${str}@pka.edu.vn` } });
    if (user) return user;
  }

  // 3. Tra cứu từ hồ sơ Student (theo ID sinh viên hoặc Email sinh viên)
  const student = await Student.findOne({
    where: {
      [Op.or]: [{ id: str }, { email: str }]
    }
  });
  if (student && student.userId) {
    user = await User.findByPk(student.userId);
    if (user) return user;
  }

  // 4. Tra cứu từ hồ sơ Lecturer (theo ID giảng viên hoặc Email giảng viên)
  const lecturer = await Lecturer.findOne({ where: { id: str } });
  if (lecturer && lecturer.userId) {
    user = await User.findByPk(lecturer.userId);
    if (user) return user;
  }

  return null;
}

// Quên mật khẩu (Tạo mã OTP tự động)
router.post('/forgot-password', async (req, res) => {
  let { username } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập Tên tài khoản hoặc Mã sinh viên/giảng viên.' });
  }

  try {
    const user = await findUserByIdentifier(username);

    if (!user) {
      return res.status(404).json({ message: 'Tên đăng nhập hoặc Mã định danh không tồn tại trên hệ thống.' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' });
    }

    let email = 'email_he_thong@pka.edu.vn';

    if (user.role === 'student') {
      const student = await Student.findOne({ where: { userId: user.id } });
      if (student && student.email) email = student.email;
    } else if (user.role === 'lecturer') {
      const lecturer = await Lecturer.findOne({ where: { userId: user.id } });
      if (lecturer && lecturer.email) email = lecturer.email;
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.otpCode = await hashPassword(otpCode);
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    const maskedEmail = maskEmail(email);

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'YEU_CAU_OTP',
      details: `Yêu cầu cấp mã OTP cho email ${maskedEmail}`,
      ipAddress: clientIp
    });

    let emailSent = false;
    try {
      await sendOtpEmail({ to: email, otpCode });
      emailSent = true;
    } catch (mailError) {
      console.warn('Email OTP chưa gửi được:', mailError.message);
    }

    return res.json({
      message: emailSent
        ? `Mã OTP đã được gửi đến email: ${maskedEmail}`
        : 'Mã OTP đã được tạo và hiển thị tại bước đặt lại mật khẩu.',
      email: maskedEmail,
      username: user.username,
      otp: otpCode
    });
  } catch (error) {
    console.error('Lỗi tạo OTP:', error);
    return res.status(500).json({ message: 'Lỗi server khi tạo OTP.' });
  }
});

// Xác nhận OTP và đặt lại mật khẩu mới (Mã hóa bcrypt)
router.post('/reset-password', async (req, res) => {
  let { username, otpCode, newPassword } = req.body;

  if (!username || !otpCode || !newPassword) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ: Tên tài khoản, Mã OTP và Mật khẩu mới.' });
  }

  otpCode = otpCode.trim();
  newPassword = newPassword.trim();

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' });
  }

  try {
    const user = await findUserByIdentifier(username);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin tài khoản.' });
    }

    if (user.status === 'locked') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Không thể đặt lại mật khẩu.' });
    }

    if (!user.otpCode || !(await verifyPassword(otpCode, user.otpCode)).valid) {
      return res.status(400).json({ message: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.' });
    }

    if (!user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ message: 'Mã OTP đã hết hạn (chỉ có hiệu lực trong 5 phút). Vui lòng gửi lại yêu cầu OTP mới.' });
    }

    user.password = await hashPassword(newPassword);
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.isFirstLogin = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllRefreshTokens(user.id, req.ip || req.headers['x-forwarded-for']);

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'KHOI_PHUC_MAT_KHAU',
      details: 'Đặt lại mật khẩu thành công thông qua OTP.',
      ipAddress: clientIp
    });

    return res.json({ 
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.',
      username: user.username
    });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu.' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Thiếu refresh token.' });

  try {
    const stored = await RefreshToken.findOne({
      where: { tokenHash: hashOpaqueToken(refreshToken) },
      include: [User]
    });
    const user = stored?.User;
    if (!user || user.status !== 'active') {
      return res.status(403).json({ message: 'Phiên đăng nhập không hợp lệ.' });
    }
    const tokens = await rotateRefreshToken(refreshToken, user, req.ip || req.headers['x-forwarded-for']);
    if (!tokens) return res.status(403).json({ message: 'Refresh token đã hết hạn hoặc bị thu hồi.' });
    return res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresIn: tokens.expiresIn,
      refreshExpiresAt: tokens.refreshExpiresAt
    });
  } catch (error) {
    return res.status(403).json({ message: 'Không thể làm mới phiên đăng nhập.' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllRefreshTokens(user.id, req.ip || req.headers['x-forwarded-for']);
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'DANG_XUAT',
      details: 'Thu hồi toàn bộ token đăng nhập.',
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });
    return res.json({ message: 'Đăng xuất và thu hồi phiên đăng nhập thành công.' });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể đăng xuất phía máy chủ.' });
  }
});

router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllRefreshTokens(user.id, req.ip || req.headers['x-forwarded-for']);
    return res.json({ message: 'Đã đăng xuất khỏi tất cả thiết bị.' });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể thu hồi các phiên đăng nhập.' });
  }
});

// Cập nhật thông tin cá nhân cơ bản
router.put('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const updateData = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    let oldData = {};
    let newData = {};

    if (user.role === 'student') {
      const student = await Student.findOne({ where: { userId: user.id } });
      if (!student) return res.status(404).json({ message: 'Không tìm thấy hồ sơ sinh viên.' });
      
      oldData = { email: student.email };
      
      if (updateData.email) student.email = updateData.email;
      
      newData = { email: student.email };
      await student.save();
    }

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: user.id,
      username: user.username,
      action: 'CAP_NHAT_HO_SO',
      details: JSON.stringify({ before: oldData, after: newData }),
      ipAddress: clientIp
    });

    return res.json({ message: 'Cập nhật hồ sơ thành công!' });
  } catch (error) {
    console.error('Lỗi cập nhật hồ sơ:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

export default router;
