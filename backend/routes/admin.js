import express from 'express';
import { sequelize, User, Student, Lecturer, Major, Department, AuditLog } from '../models/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getPagination, paginatedResponse } from '../utils/paginationHelper.js';
import { hashPassword } from '../utils/authSecurityHelper.js';

const router = express.Router();

// Áp dụng middleware bảo mật JWT và Phân quyền Admin cho toàn bộ router
router.use(authenticateToken, authorizeRoles('admin'));

// 1. Lấy danh sách tài khoản (hỗ trợ lọc theo query role) kèm thông tin hồ sơ
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;
    const whereClause = role ? { role } : {};
    const usePagination = req.query.page !== undefined || req.query.limit !== undefined;
    const { page, limit, offset } = getPagination(req.query);

    const users = await User.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      ...(usePagination ? { limit, offset } : {})
    });

    const userList = [];
    for (let u of users) {
      let profile = null;
      if (u.role === 'student') {
        profile = await Student.findOne({ where: { userId: u.id }, include: [Major] });
      } else if (u.role === 'lecturer') {
        profile = await Lecturer.findOne({ where: { userId: u.id }, include: [Department] });
      }
      userList.push({
        user: u,
        profile
      });
    }

    if (usePagination) {
      const count = await User.count({ where: whereClause });
      return res.json(paginatedResponse(userList, count, page, limit));
    }
    return res.json(userList);
  } catch (error) {
    console.error('Lỗi lấy danh sách tài khoản:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 2. Tạo tài khoản mới + hồ sơ tương ứng
router.post('/users', async (req, res) => {
  const {
    role,
    // Thông tin chung
    username, // Dành cho PDT / Admin
    password,
    // Thông tin sinh viên / giảng viên
    id, // MSV hoặc MGV
    name,
    gender,
    dob,
    email,
    // Sinh viên
    class: studentClass,
    majorId,
    enrollmentDate,
    // Giảng viên
    departmentId,
    position,
    mainSubject,
    startDate
  } = req.body;

  const t = await sequelize.transaction();

  try {
    let finalUsername = '';
    let rawPassword = password ? password.trim() : '';

    // A. Thiết lập username và password mặc định 8 ký tự theo quy chuẩn
    if (role === 'student') {
      if (!id) {
        await t.rollback();
        return res.status(400).json({ message: 'Vui lòng cung cấp Mã sinh viên (MSV).' });
      }
      if (!/^[a-zA-Z0-9]{3,15}$/.test(id)) {
        await t.rollback();
        return res.status(400).json({ message: 'Mã sinh viên phải là chuỗi gồm từ 3 đến 15 ký tự chữ hoặc số.' });
      }
      finalUsername = id.includes('@') ? id : id + '@pka.edu.vn';
      rawPassword = rawPassword || (id.length >= 8 ? id : id.padEnd(8, '0')); // Mật khẩu mặc định là MSV (chuẩn 8 ký tự)
    } else if (role === 'lecturer') {
      if (!id) {
        await t.rollback();
        return res.status(400).json({ message: 'Vui lòng cung cấp Mã giảng viên (MGV).' });
      }
      finalUsername = id.includes('@') ? id : id + '@pka.edu.vn';
      rawPassword = rawPassword || (id.length >= 8 ? id : '12345678');
    } else {
      // PDT hoặc Admin
      if (!username) {
        await t.rollback();
        return res.status(400).json({ message: 'Vui lòng cung cấp tên tài khoản.' });
      }
      finalUsername = username.includes('@') ? username : username + '@pka.edu.vn';
      rawPassword = rawPassword || '12345678';
    }

    if (rawPassword.length < 8) {
      await t.rollback();
      return res.status(400).json({ message: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.' });
    }

    // Kiểm tra trùng username
    const exists = await User.findOne({ where: { username: finalUsername }, transaction: t });
    if (exists) {
      await t.rollback();
      return res.status(400).json({ message: `Tài khoản ${finalUsername} đã tồn tại trong hệ thống.` });
    }

    // B. Tạo User với mật khẩu dạng thuần
    const newUser = await User.create({
      username: finalUsername,
      password: await hashPassword(rawPassword),
      role,
      status: 'active'
    }, { transaction: t });

    // C. Tạo hồ sơ chi tiết (Student / Lecturer)
    if (role === 'student') {
      // Kiểm tra trùng MSV
      const stdExists = await Student.findByPk(id, { transaction: t });
      if (stdExists) {
        await t.rollback();
        return res.status(400).json({ message: `Mã sinh viên ${id} đã tồn tại.` });
      }

      await Student.create({
        id,
        name,
        gender,
        dob,
        email,
        enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
        majorId,
        class: studentClass,
        status: 'active',
        userId: newUser.id
      }, { transaction: t });

    } else if (role === 'lecturer') {
      // Kiểm tra trùng MGV
      const lecExists = await Lecturer.findByPk(id, { transaction: t });
      if (lecExists) {
        await t.rollback();
        return res.status(400).json({ message: `Mã giảng viên ${id} đã tồn tại.` });
      }

      await Lecturer.create({
        id,
        name,
        gender,
        dob,
        startDate: startDate || new Date().toISOString().split('T')[0],
        position,
        departmentId,
        mainSubject,
        userId: newUser.id
      }, { transaction: t });
    }

    // D. Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : null,
      action: 'TAO_TAI_KHOAN',
      details: JSON.stringify({ username: finalUsername, role, id }),
      ipAddress: clientIp
    }, { transaction: t });

    await t.commit();
    return res.json({ message: `Tạo tài khoản thành công! Username: ${finalUsername}`, user: newUser });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi tạo tài khoản:', error);
    return res.status(500).json({ message: 'Không thể tạo tài khoản. Kiểm tra lại dữ liệu đầu vào.' });
  }
});

// 3. Khóa/Mở khóa hoặc đổi mật khẩu tài khoản
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { status, password } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    if (status) user.status = status;
    if (password) {
      if (password.length < 8) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
      user.password = await hashPassword(password);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    await user.save();

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : null,
      action: 'CAP_NHAT_TAI_KHOAN',
      details: JSON.stringify({ targetUserId: id, targetUsername: user.username, status, passwordChanged: !!password }),
      ipAddress: clientIp
    });

    return res.json({ message: 'Cập nhật tài khoản thành công!', user });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 4. Sửa đổi thông tin hồ sơ (Sinh viên / Giảng viên)
router.put('/profiles/:role/:id', async (req, res) => {
  const { role, id } = req.params;
  const { name, gender, dob, email, class: studentClass, majorId, departmentId, position, mainSubject } = req.body;

  try {
    if (role === 'student') {
      const student = await Student.findByPk(id);
      if (!student) return res.status(404).json({ message: 'Không tìm thấy hồ sơ sinh viên.' });
      
      if (name) student.name = name;
      if (gender) student.gender = gender;
      if (dob) student.dob = dob;
      if (email) student.email = email;
      if (studentClass) student.class = studentClass;
      if (majorId) student.majorId = majorId;
      await student.save();

    } else if (role === 'lecturer') {
      const lecturer = await Lecturer.findByPk(id);
      if (!lecturer) return res.status(404).json({ message: 'Không tìm thấy hồ sơ giảng viên.' });
      
      if (name) lecturer.name = name;
      if (gender) lecturer.gender = gender;
      if (dob) lecturer.dob = dob;
      if (departmentId) lecturer.departmentId = departmentId;
      if (position) lecturer.position = position;
      if (mainSubject) lecturer.mainSubject = mainSubject;
      await lecturer.save();
    }

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : null,
      action: 'SUA_HO_SO',
      details: JSON.stringify({ role, profileId: id }),
      ipAddress: clientIp
    });

    return res.json({ message: 'Cập nhật hồ sơ thành công!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 5. Xóa tài khoản (Xóa cascade cả User và Profile)
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const t = await sequelize.transaction();

  try {
    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
    }

    const username = user.username;

    // Xóa User (mối quan hệ onDelete: 'CASCADE' sẽ tự động xóa bản ghi trong Students hoặc Lecturers tương ứng)
    await user.destroy({ transaction: t });

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : null,
      action: 'XOA_TAI_KHOAN',
      details: JSON.stringify({ deletedUserId: id, deletedUsername: username }),
      ipAddress: clientIp
    }, { transaction: t });

    await t.commit();
    return res.json({ message: 'Xóa tài khoản thành công!' });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi xóa tài khoản:', error);
    return res.status(500).json({ message: 'Lỗi server khi xóa.' });
  }
});

// 6. Xem Nhật ký hệ thống (Audit Logs)
router.get('/audit-logs', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { rows, count } = await AuditLog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    return res.json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    console.error('Lỗi lấy nhật ký hệ thống:', error);
    return res.status(500).json({ message: 'Lỗi server khi lấy nhật ký hệ thống.' });
  }
});

export default router;
