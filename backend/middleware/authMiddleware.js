import { User } from '../models/index.js';
import { verifyAccessToken } from '../utils/authSecurityHelper.js';

// Middleware xác thực JWT Token từ Header Authorization
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({
      code: 'AUTH_REQUIRED',
      message: 'Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.'
    });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.id);
    if (!user || user.status !== 'active' || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        code: 'AUTH_INVALID',
        message: 'Phiên đăng nhập đã bị thu hồi hoặc tài khoản không còn hoạt động.'
      });
    }
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      code: 'AUTH_EXPIRED',
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }
}

// Middleware kiểm tra phân quyền người dùng (Role-Based Access Control)
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'Chưa xác thực người dùng.'
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'ACCESS_DENIED',
        message: `Quyền truy cập bị từ chối. Yêu cầu quyền: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
}
