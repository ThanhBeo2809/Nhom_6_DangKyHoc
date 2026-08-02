import express from 'express';
import ExcelJS from 'exceljs';
import {
  sequelize, Class, Course, Lecturer, Student, Registration, Grade, Payment, AuditLog,
  Department, Major, AcademicTerm, RegistrationPeriod
} from '../models/index.js';
import { Op } from 'sequelize';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { updateTuition } from '../utils/tuitionHelper.js';
import { getCurrentSemester } from '../utils/academicTermHelper.js';
import { getPagination, paginatedResponse } from '../utils/paginationHelper.js';
import { createNotification } from '../utils/notificationHelper.js';
import {
  getPaymentBalance,
  paymentWithBalance,
  syncPaymentStatus
} from '../utils/paymentBalanceHelper.js';
import { applyPaymentTransaction } from '../utils/paymentTransactionHelper.js';
import {
  canTransitionStudentStatus,
  getSuggestedWarningStatus,
  isValidStudentStatus
} from '../utils/academicStandingHelper.js';

const router = express.Router();

// Áp dụng middleware bảo mật JWT và Phân quyền Phòng Đào Tạo cho toàn bộ router
router.use(authenticateToken, authorizeRoles('pdt'));

function wantsPagination(req) {
  return req.query.page !== undefined || req.query.limit !== undefined;
}

router.get('/departments', async (req, res) => {
  try {
    return res.json(await Department.findAll({ order: [['name', 'ASC']] }));
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh sách khoa.' });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ message: 'Mã khoa và tên khoa là bắt buộc.' });
    return res.status(201).json(await Department.create({ id: id.trim(), name: name.trim() }));
  } catch {
    return res.status(400).json({ message: 'Không thể tạo khoa. Kiểm tra mã khoa trùng.' });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ message: 'Không tìm thấy khoa.' });
    if (req.body.name) department.name = req.body.name.trim();
    await department.save();
    return res.json(department);
  } catch {
    return res.status(400).json({ message: 'Không thể cập nhật khoa.' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ message: 'Không tìm thấy khoa.' });
    const [majorCount, lecturerCount] = await Promise.all([
      Major.count({ where: { departmentId: department.id } }),
      Lecturer.count({ where: { departmentId: department.id } })
    ]);
    if (majorCount || lecturerCount) {
      return res.status(409).json({ message: 'Không thể xóa khoa đang có ngành hoặc giảng viên trực thuộc.' });
    }
    await department.destroy();
    return res.json({ message: 'Đã xóa khoa.' });
  } catch {
    return res.status(500).json({ message: 'Không thể xóa khoa.' });
  }
});

router.get('/majors', async (req, res) => {
  try {
    return res.json(await Major.findAll({ include: [Department], order: [['name', 'ASC']] }));
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh sách ngành.' });
  }
});

router.post('/majors', async (req, res) => {
  try {
    const { id, name, departmentId } = req.body;
    if (!id || !name || !departmentId) return res.status(400).json({ message: 'Mã, tên ngành và khoa là bắt buộc.' });
    if (!(await Department.findByPk(departmentId))) return res.status(400).json({ message: 'Khoa không tồn tại.' });
    return res.status(201).json(await Major.create({ id: id.trim(), name: name.trim(), departmentId }));
  } catch {
    return res.status(400).json({ message: 'Không thể tạo ngành. Kiểm tra mã ngành trùng.' });
  }
});

router.put('/majors/:id', async (req, res) => {
  try {
    const major = await Major.findByPk(req.params.id);
    if (!major) return res.status(404).json({ message: 'Không tìm thấy ngành.' });
    if (req.body.departmentId && !(await Department.findByPk(req.body.departmentId))) {
      return res.status(400).json({ message: 'Khoa không tồn tại.' });
    }
    if (req.body.name) major.name = req.body.name.trim();
    if (req.body.departmentId) major.departmentId = req.body.departmentId;
    await major.save();
    return res.json(major);
  } catch {
    return res.status(400).json({ message: 'Không thể cập nhật ngành.' });
  }
});

router.delete('/majors/:id', async (req, res) => {
  try {
    const major = await Major.findByPk(req.params.id);
    if (!major) return res.status(404).json({ message: 'Không tìm thấy ngành.' });
    const [studentCount, courseCount] = await Promise.all([
      Student.count({ where: { majorId: major.id } }),
      Course.count({ where: { majorId: major.id } })
    ]);
    if (studentCount || courseCount) {
      return res.status(409).json({ message: 'Không thể xóa ngành đang có sinh viên hoặc môn học.' });
    }
    await major.destroy();
    return res.json({ message: 'Đã xóa ngành.' });
  } catch {
    return res.status(500).json({ message: 'Không thể xóa ngành.' });
  }
});

router.get('/academic-terms', async (req, res) => {
  try {
    return res.json(await AcademicTerm.findAll({
      include: [RegistrationPeriod],
      order: [['startDate', 'DESC']]
    }));
  } catch {
    return res.status(500).json({ message: 'Không thể tải danh sách học kỳ.' });
  }
});

router.post('/academic-terms', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, name, startDate, endDate, status = 'planned', isCurrent = false } = req.body;
    if (!id || !name || !startDate || !endDate) {
      await t.rollback();
      return res.status(400).json({ message: 'Thiếu thông tin học kỳ.' });
    }
    if (new Date(startDate) >= new Date(endDate)) {
      await t.rollback();
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
    }
    if (isCurrent) await AcademicTerm.update({ isCurrent: false }, { where: {}, transaction: t });
    const term = await AcademicTerm.create({ id, name, startDate, endDate, status, isCurrent }, { transaction: t });
    await t.commit();
    return res.status(201).json(term);
  } catch {
    await t.rollback();
    return res.status(400).json({ message: 'Không thể tạo học kỳ.' });
  }
});

router.put('/academic-terms/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const term = await AcademicTerm.findByPk(req.params.id, { transaction: t });
    if (!term) {
      await t.rollback();
      return res.status(404).json({ message: 'Không tìm thấy học kỳ.' });
    }
    if (req.body.isCurrent === true) {
      await AcademicTerm.update({ isCurrent: false }, { where: {}, transaction: t });
    }
    for (const field of ['name', 'startDate', 'endDate', 'status', 'isCurrent']) {
      if (req.body[field] !== undefined) term[field] = req.body[field];
    }
    if (new Date(term.startDate) >= new Date(term.endDate)) {
      await t.rollback();
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
    }
    await term.save({ transaction: t });
    await t.commit();
    return res.json(term);
  } catch {
    await t.rollback();
    return res.status(400).json({ message: 'Không thể cập nhật học kỳ.' });
  }
});

router.delete('/academic-terms/:id', async (req, res) => {
  try {
    const term = await AcademicTerm.findByPk(req.params.id);
    if (!term) return res.status(404).json({ message: 'Không tìm thấy học kỳ.' });
    if (term.isCurrent || await Class.count({ where: { semester: term.id } })) {
      return res.status(409).json({ message: 'Không thể xóa học kỳ hiện hành hoặc đã có lớp học phần.' });
    }
    await term.destroy();
    return res.json({ message: 'Đã xóa học kỳ.' });
  } catch {
    return res.status(500).json({ message: 'Không thể xóa học kỳ.' });
  }
});

router.post('/registration-periods', async (req, res) => {
  try {
    const { termId, name, startAt, endAt, isEnabled = true } = req.body;
    if (!termId || !name || !startAt || !endAt) return res.status(400).json({ message: 'Thiếu thông tin đợt đăng ký.' });
    if (!(await AcademicTerm.findByPk(termId))) return res.status(400).json({ message: 'Học kỳ không tồn tại.' });
    if (new Date(startAt) >= new Date(endAt)) return res.status(400).json({ message: 'Thời gian đóng phải sau thời gian mở.' });
    return res.status(201).json(await RegistrationPeriod.create({ termId, name, startAt, endAt, isEnabled }));
  } catch {
    return res.status(400).json({ message: 'Không thể tạo đợt đăng ký.' });
  }
});

router.put('/registration-periods/:id', async (req, res) => {
  try {
    const period = await RegistrationPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ message: 'Không tìm thấy đợt đăng ký.' });
    for (const field of ['name', 'startAt', 'endAt', 'isEnabled']) {
      if (req.body[field] !== undefined) period[field] = req.body[field];
    }
    if (new Date(period.startAt) >= new Date(period.endAt)) return res.status(400).json({ message: 'Thời gian đóng phải sau thời gian mở.' });
    await period.save();
    return res.json(period);
  } catch {
    return res.status(400).json({ message: 'Không thể cập nhật đợt đăng ký.' });
  }
});

router.delete('/registration-periods/:id', async (req, res) => {
  try {
    const deleted = await RegistrationPeriod.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy đợt đăng ký.' });
    return res.json({ message: 'Đã xóa đợt đăng ký.' });
  } catch {
    return res.status(500).json({ message: 'Không thể xóa đợt đăng ký.' });
  }
});

// 1. Thống kê chung cho dashboard PDT
router.get('/stats', async (req, res) => {
  try {
    const studentCount = await Student.count();
    const lecturerCount = await Lecturer.count();
    const classCount = await Class.count({ where: { status: 'active' } });
    const courseCount = await Course.count();
    
    return res.json({ studentCount, lecturerCount, classCount, courseCount });
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 2. Lấy danh sách môn học & Tạo môn học mới
router.get('/courses', async (req, res) => {
  try {
    const include = [{ model: Course, as: 'Prerequisite' }];
    if (wantsPagination(req)) {
      const { page, limit, offset } = getPagination(req.query);
      const { rows, count } = await Course.findAndCountAll({
        include,
        order: [['id', 'ASC']],
        limit,
        offset,
        distinct: true
      });
      return res.json(paginatedResponse(rows, count, page, limit));
    }
    return res.json(await Course.findAll({ include, order: [['id', 'ASC']] }));
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

router.post('/courses', async (req, res) => {
  const { id, name, credits, prerequisiteId, majorId } = req.body;
  try {
    if (prerequisiteId) {
      if (prerequisiteId === id) {
        return res.status(400).json({ message: 'Môn học tiên quyết không được trùng với chính môn học đó.' });
      }
      const prereqExists = await Course.findByPk(prerequisiteId);
      if (!prereqExists) {
        return res.status(400).json({ message: 'Môn học tiên quyết không tồn tại trên hệ thống.' });
      }
    }

    const newCourse = await Course.create({ id, name, credits, prerequisiteId: prerequisiteId || null, majorId: majorId || null });
    return res.json(newCourse);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Không thể tạo môn học. Kiểm tra trùng mã môn học.' });
  }
});

// 3. Lấy danh sách lớp & Tạo lịch học phần mới (Kiểm tra trùng lịch)
router.get('/classes', async (req, res) => {
  try {
    if (wantsPagination(req)) {
      const { page, limit, offset } = getPagination(req.query);
      const { rows, count } = await Class.findAndCountAll({
        include: [Course, Lecturer],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });
      return res.json(paginatedResponse(rows, count, page, limit));
    }
    return res.json(await Class.findAll({ include: [Course, Lecturer] }));
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

router.post('/classes', async (req, res) => {
  let { id, courseId, lecturerId, roomName, roomType, capacity, semester, dayOfWeek, shift, startSlot, numSlots } = req.body;

  try {
    semester = semester || await getCurrentSemester();
    // A. Kiểm tra trùng phòng học
    const roomConflicts = await Class.findAll({
      where: {
        roomName,
        dayOfWeek,
        shift,
        semester,
        status: 'active'
      }
    });

    for (const conflict of roomConflicts) {
      const start2 = conflict.startSlot;
      const end2 = conflict.startSlot + conflict.numSlots;
      const start1 = parseInt(startSlot);
      const end1 = start1 + parseInt(numSlots);

      if (start1 < end2 && start2 < end1) {
        return res.status(400).json({ message: `Trùng lịch phòng! Phòng ${roomName} đã được sử dụng bởi lớp ${conflict.id} trong tiết học này.` });
      }
    }

    // B. Kiểm tra trùng lịch giảng dạy của Giảng viên
    const lecturerConflicts = await Class.findAll({
      where: {
        lecturerId,
        dayOfWeek,
        shift,
        semester,
        status: 'active'
      }
    });

    for (const conflict of lecturerConflicts) {
      const start2 = conflict.startSlot;
      const end2 = conflict.startSlot + conflict.numSlots;
      const start1 = parseInt(startSlot);
      const end1 = start1 + parseInt(numSlots);

      if (start1 < end2 && start2 < end1) {
        return res.status(400).json({ message: `Giảng viên bị trùng lịch! Giảng viên này đang bận dạy ở lớp ${conflict.id} vào thời gian này.` });
      }
    }

    const newClass = await Class.create({
      id, courseId, lecturerId, roomName, roomType, capacity, semester, dayOfWeek, shift, startSlot, numSlots, status: 'active'
    });

    return res.json(newClass);
  } catch (error) {
    console.error('Lỗi tạo lớp:', error);
    return res.status(500).json({ message: 'Không thể xếp lịch lớp học phần.' });
  }
});

// 4. Hủy lớp học phần do thiếu sĩ số (Sĩ số < 15) và hoàn trả học phí
router.post('/classes/:classId/cancel', async (req, res) => {
  const { classId } = req.params;
  const t = await sequelize.transaction();

  try {
    const cls = await Class.findByPk(classId, { transaction: t });
    if (!cls) {
      await t.rollback();
      return res.status(404).json({ message: 'Không tìm thấy lớp học phần.' });
    }

    if (cls.status === 'canceled') {
      await t.rollback();
      return res.status(400).json({ message: 'Lớp học phần này đã bị hủy trước đó.' });
    }

    const studentCount = await Registration.count({
      where: { classId, status: 'enrolled' },
      transaction: t
    });

    // Chỉ cho phép hủy lớp học phần có sĩ số thấp
    if (studentCount >= 15) {
      await t.rollback();
      return res.status(400).json({ message: `Không thể hủy lớp! Sĩ số hiện tại là ${studentCount} (đủ điều kiện sĩ số tối thiểu >= 15).` });
    }

    // A. Hủy lớp học phần
    cls.status = 'canceled';
    await cls.save({ transaction: t });

    // B. Lấy danh sách sinh viên đăng ký lớp này để hoàn học phí
    const regs = await Registration.findAll({
      where: { classId },
      transaction: t
    });

    const studentIds = regs.map(r => r.studentId);

    // C. Xóa đăng ký học phần của sinh viên
    await Registration.destroy({
      where: { classId },
      transaction: t
    });

    // D. Tính toán và hoàn trả học phí trong hóa đơn học kỳ cho sinh viên
    for (let sid of studentIds) {
      await updateTuition(sid, cls.semester, t);
      const affectedStudent = await Student.findByPk(sid, { transaction: t });
      await createNotification({
        userId: affectedStudent?.userId,
        type: 'registration',
        title: 'Lớp học phần đã bị hủy',
        message: `Lớp ${classId} bị hủy do không đủ sĩ số. Đăng ký và học phí của bạn đã được cập nhật.`,
        data: { classId },
        io: req.app.get('io'),
        transaction: t
      });
    }

    // Ghi Audit Log
    await AuditLog.create({
      action: 'HUY_LOP_THIEU_SI_SO',
      details: JSON.stringify({ classId, studentCountAffected: studentIds.length }),
      ipAddress: 'Hệ thống tự động'
    }, { transaction: t });

    await t.commit();
    return res.json({
      message: `Đã hủy lớp ${classId} thành công. Hoàn học phí và gửi thông báo cho ${studentIds.length} sinh viên bị ảnh hưởng.`
    });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi hủy lớp học phần:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi hủy lớp.' });
  }
});

// 5. Cảnh báo học vụ tự động cuối kỳ học
router.get('/academic-warnings', async (req, res) => {
  try {
    const currentSemester = await getCurrentSemester();
    const students = await Student.findAll({
      include: [{
        model: Grade,
        where: { isLocked: true },
        required: false,
        include: [Course, { model: Class, attributes: ['id', 'semester'] }]
      }]
    });
    const warningList = [];

    for (let s of students) {
      // Lấy tất cả điểm số đã được khóa của sinh viên để đánh giá
      const grades = s.Grades || [];

      // Gom nhóm và lọc điểm cao nhất (như phần student)
      const semesterMap = {};
      const highestGrades = {};

      grades.forEach(g => {
        const sem = g.Class?.semester || 'Kỳ trước';
        if (!semesterMap[sem]) semesterMap[sem] = [];
        semesterMap[sem].push(g);

        const courseId = g.courseId;
        if (!highestGrades[courseId] || highestGrades[courseId].grade4 < g.grade4) {
          highestGrades[courseId] = g;
        }
      });

      // Tính GPA kỳ hiện tại
      const currentGrades = semesterMap[currentSemester] || [];
      let currentCredits = 0;
      let currentWeight = 0;
      currentGrades.forEach(g => {
        if (g.Course) {
          currentCredits += g.Course.credits;
          currentWeight += g.grade4 * g.Course.credits;
        }
      });
      const gpa = currentCredits > 0 ? parseFloat((currentWeight / currentCredits).toFixed(2)) : 0;

      // Tính CPA tích lũy
      let totalCreditsCPA = 0;
      let sumWeightCPA = 0;
      Object.values(highestGrades).forEach(g => {
        if (g.Course) {
          totalCreditsCPA += g.Course.credits;
          sumWeightCPA += g.grade4 * g.Course.credits;
        }
      });
      const cpa = totalCreditsCPA > 0 ? parseFloat((sumWeightCPA / totalCreditsCPA).toFixed(2)) : 0;

      // Giữ sinh viên đang mang trạng thái học vụ trong danh sách để Phòng Đào tạo
      // có thể khôi phục về bình thường khi kết quả đã cải thiện.
      const isAtRisk = (currentCredits > 0 && gpa < 1.0)
        || (totalCreditsCPA > 0 && cpa < 1.5);
      const hasAcademicAction = s.status !== 'active';
      if (isAtRisk || hasAcademicAction) {
        warningList.push({
          student: s,
          gpa,
          cpa,
          currentCredits,
          isAtRisk,
          suggestedStatus: getSuggestedWarningStatus(s.status, isAtRisk)
        });
      }
    }

    if (wantsPagination(req)) {
      const { page, limit, offset } = getPagination(req.query);
      return res.json(paginatedResponse(
        warningList.slice(offset, offset + limit),
        warningList.length,
        page,
        limit
      ));
    }
    return res.json(warningList);
  } catch (error) {
    console.error('Lỗi quét cảnh báo học vụ:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// Phê duyệt cập nhật trạng thái cảnh báo học vụ cho sinh viên
router.post('/students/:studentId/warning', async (req, res) => {
  const { studentId } = req.params;
  const { status } = req.body; // 'active', 'warning_1', 'warning_2', 'dismissed'

  try {
    if (!isValidStudentStatus(status)) {
      return res.status(400).json({ message: 'Trạng thái học vụ không hợp lệ.' });
    }

    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên.' });
    }

    const beforeStatus = student.status;
    if (!canTransitionStudentStatus(beforeStatus, status)) {
      return res.status(409).json({
        message: `Không thể chuyển trực tiếp từ ${beforeStatus} sang ${status}. Cảnh báo phải đi lần lượt từ mức 1 đến mức 2 trước khi buộc thôi học.`
      });
    }

    student.status = status;
    await student.save();

    // Ghi Audit log
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'Phòng Đào Tạo';
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : 'Phòng Đào Tạo',
      action: 'CAP_NHAT_CANH_BAO_HOC_VU',
      details: JSON.stringify({ studentId, before: beforeStatus, after: status }),
      ipAddress: clientIp
    });

    return res.json({ message: `Cập nhật trạng thái sinh viên ${studentId} thành công sang: ${status}` });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 6. Xem Audit Logs hệ thống
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
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 7. Xuất Danh sách Cảnh báo Học vụ ra file Excel (.xlsx)
router.get('/academic-warnings/export-excel', async (req, res) => {
  try {
    const currentSemester = await getCurrentSemester();
    const students = await Student.findAll({
      include: [{
        model: Grade,
        where: { isLocked: true },
        required: false,
        include: [Course, { model: Class, attributes: ['id', 'semester'] }]
      }]
    });
    const warningList = [];

    for (let s of students) {
      const grades = s.Grades || [];

      const semesterMap = {};
      const highestGrades = {};

      grades.forEach(g => {
        const sem = g.Class?.semester || 'Kỳ trước';
        if (!semesterMap[sem]) semesterMap[sem] = [];
        semesterMap[sem].push(g);

        const courseId = g.courseId;
        if (!highestGrades[courseId] || highestGrades[courseId].grade4 < g.grade4) {
          highestGrades[courseId] = g;
        }
      });

      const currentGrades = semesterMap[currentSemester] || [];
      let currentCredits = 0;
      let currentWeight = 0;
      currentGrades.forEach(g => {
        if (g.Course) {
          currentCredits += g.Course.credits;
          currentWeight += g.grade4 * g.Course.credits;
        }
      });
      const gpa = currentCredits > 0 ? parseFloat((currentWeight / currentCredits).toFixed(2)) : 0;

      let totalCreditsCPA = 0;
      let sumWeightCPA = 0;
      Object.values(highestGrades).forEach(g => {
        if (g.Course) {
          totalCreditsCPA += g.Course.credits;
          sumWeightCPA += g.grade4 * g.Course.credits;
        }
      });
      const cpa = totalCreditsCPA > 0 ? parseFloat((sumWeightCPA / totalCreditsCPA).toFixed(2)) : 0;

      const isAtRisk = (currentCredits > 0 && gpa < 1.0)
        || (totalCreditsCPA > 0 && cpa < 1.5);
      const hasAcademicAction = s.status !== 'active';
      if (isAtRisk || hasAcademicAction) {
        warningList.push({
          student: s,
          gpa,
          cpa,
          currentCredits,
          isAtRisk,
          suggestedStatus: getSuggestedWarningStatus(s.status, isAtRisk)
        });
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Đăng ký Học';
    const worksheet = workbook.addWorksheet('Canh_Bao_Hoc_Vu', {
      views: [{ showGridLines: true }]
    });

    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `DANH SÁCH SINH VIÊN VI PHẠM CẢNH BÁO HỌC VỤ`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'C00000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:G2');
    worksheet.getCell('A2').value = `Đợt quét tự động | Tổng số: ${warningList.length} sinh viên`;
    worksheet.getCell('A2').font = { name: 'Calibri', size: 11, italic: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    const headers = ['STT', 'Mã Sinh Viên', 'Họ và Tên', 'Lớp Sinh Hoạt', 'GPA Kỳ Hiện Tại', 'CPA Tích Lũy', 'Trạng Thái Cảnh Báo'];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C00000' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    let index = 1;
    for (let item of warningList) {
      const statusLabels = {
        active: 'Diện nguy cơ - đề xuất Cảnh báo mức 1',
        warning_1: 'Cảnh báo mức 1',
        warning_2: 'Cảnh báo mức 2',
        dismissed: 'Buộc thôi học'
      };
      const row = worksheet.addRow([
        index++,
        item.student.id,
        item.student.name,
        item.student.class || '',
        item.gpa,
        item.cpa,
        statusLabels[item.student.status] || item.student.status
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: [1, 2, 4, 5, 6, 7].includes(colNumber) ? 'center' : 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D9D9D9' } },
          left: { style: 'thin', color: { argb: 'D9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
          right: { style: 'thin', color: { argb: 'D9D9D9' } }
        };
      });
    }

    worksheet.columns.forEach((col, i) => {
      let maxLen = headers[i] ? headers[i].length : 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const cellLen = cell.value ? cell.value.toString().length : 0;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      col.width = Math.max(maxLen + 4, 15);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Danh_Sach_Canh_Bao_Hoc_Vu.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Lỗi xuất Excel cảnh báo học vụ:', error);
    return res.status(500).json({ message: 'Lỗi server khi xuất file.' });
  }
});

// ==========================================================================
// QUẢN LÝ HỌC PHÍ DÀNH CHO PHÒNG ĐÀO TẠO (PDT)
// ==========================================================================

// 8. Lấy danh sách hóa đơn học phí của tất cả sinh viên
router.get('/tuition', async (req, res) => {
  try {
    const { status, search } = req.query;
    const semester = await getCurrentSemester();

    const whereClause = { semester };
    if (status && ['paid', 'unpaid'].includes(status)) {
      whereClause.status = status;
    }

    const studentWhere = {};
    if (search && search.trim()) {
      const q = search.trim();
      studentWhere[Op.or] = [
        { id: { [Op.like]: `%${q}%` } },
        { name: { [Op.like]: `%${q}%` } },
        { class: { [Op.like]: `%${q}%` } }
      ];
    }

    const queryOptions = {
      where: whereClause,
      include: [
        {
          model: Student,
          where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined
        }
      ],
      order: [['id', 'DESC']],
      distinct: true
    };
    if (wantsPagination(req)) {
      const { page, limit, offset } = getPagination(req.query);
      const { rows, count } = await Payment.findAndCountAll({ ...queryOptions, limit, offset });
      return res.json(paginatedResponse(rows.map(paymentWithBalance), count, page, limit));
    }
    return res.json((await Payment.findAll(queryOptions)).map(paymentWithBalance));
  } catch (error) {
    console.error('Lỗi lấy danh sách học phí PDT:', error);
    return res.status(500).json({ message: 'Lỗi server khi lấy danh sách học phí.' });
  }
});

// 9. Thống kê học phí chung
router.get('/tuition/stats', async (req, res) => {
  try {
    const semester = await getCurrentSemester();
    const payments = await Payment.findAll({ where: { semester } });

    let totalStudents = payments.length;
    let totalPayable = 0;
    let totalCollected = 0;
    let totalUnpaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    payments.forEach(p => {
      const balance = getPaymentBalance(p);
      totalPayable += balance.finalAmount;
      totalCollected += Math.min(balance.paidAmount, balance.finalAmount);
      totalUnpaid += balance.remainingAmount;
      if (p.status === 'paid') {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    return res.json({
      totalStudents,
      totalPayable,
      totalCollected,
      totalUnpaid,
      paidCount,
      unpaidCount,
      completionRate: totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê học phí:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 10. Điều chỉnh tỷ lệ & lý do miễn giảm học phí cho Sinh viên
router.post('/tuition/:paymentId/discount', async (req, res) => {
  const { paymentId } = req.params;
  const { discountRate, discountReason } = req.body;

  try {
    const payment = await Payment.findByPk(paymentId, { include: [Student] });
    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn học phí.' });
    }

    const rate = parseFloat(discountRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      return res.status(400).json({ message: 'Tỷ lệ miễn giảm phải là con số từ 0.0 (0%) đến 1.0 (100%).' });
    }

    const oldFinalAmount = payment.finalAmount;
    payment.discountRate = rate;
    payment.discountReason = discountReason || null;
    payment.finalAmount = Math.round(payment.amount * (1 - rate));

    syncPaymentStatus(payment);

    await payment.save();

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'Phòng Đào Tạo';
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : 'Phòng Đào Tạo',
      action: 'DIEU_CHINH_MIEN_GIAM_HOC_PHI',
      details: JSON.stringify({
        paymentId: payment.id,
        studentId: payment.studentId,
        discountRate: rate,
        discountReason: discountReason || 'Không ghi lý do',
        oldAmount: oldFinalAmount,
        newAmount: payment.finalAmount
      }),
      ipAddress: clientIp
    });

    return res.json({
      message: `Cập nhật miễn giảm thành công cho sinh viên ${payment.studentId}! Số tiền phải nộp mới: ${payment.finalAmount.toLocaleString('vi-VN')} VNĐ`,
      payment
    });
  } catch (error) {
    console.error('Lỗi điều chỉnh miễn giảm:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 11. Xác nhận nộp học phí thủ công (Tiền mặt / Chuyển khoản trực tiếp tại trường)
router.post('/tuition/:paymentId/manual-pay', async (req, res) => {
  const { paymentId } = req.params;
  const { method, notes } = req.body;

  try {
    let payment = await Payment.findByPk(paymentId, { include: [Student] });
    if (!payment) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn học phí.' });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({ message: 'Hóa đơn học phí này đã được xác nhận đóng tiền trước đó.' });
    }

    const txId = 'PDT-MANUAL-' + Date.now();
    const receivedAmount = getPaymentBalance(payment).remainingAmount;
    const studentName = payment.Student?.name || '';
    const applied = await applyPaymentTransaction({
      paymentId: payment.id,
      transactionId: txId,
      amount: receivedAmount,
      method: method || 'Tiền mặt / Trực tiếp tại PDT',
      source: 'pdt_manual',
      receivedAt: new Date()
    });
    payment = applied.payment;
    payment.notes = notes || 'Xác nhận nộp thủ công bởi Phòng Đào Tạo';
    await payment.save();

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'Phòng Đào Tạo';
    await AuditLog.create({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : 'Phòng Đào Tạo',
      action: 'GACH_NO_HOC_PHI_THU_CONG',
      details: JSON.stringify({
        paymentId: payment.id,
        studentId: payment.studentId,
        amount: receivedAmount,
        method: payment.paymentMethod,
        transactionId: txId
      }),
      ipAddress: clientIp
    });

    // Phát thông báo Socket.IO tới sinh viên
    const io = req.app.get('io');
    if (io && payment.studentId) {
      io.to('student_' + payment.studentId).emit('payment_confirmed', {
        paymentId: payment.id,
        amount: receivedAmount,
        transactionId: txId,
        paidAt: payment.paidAt,
        status: payment.status,
        remainingAmount: applied.balance.remainingAmount,
        message: 'Thanh toán học phí đã được Phòng Đào Tạo xác nhận gạch nợ thành công!'
      });
    }

    return res.json({
      message: `Xác nhận gạch nợ thành công cho SV ${payment.studentId} (${studentName})!`,
      payment
    });
  } catch (error) {
    console.error('Lỗi gạch nợ thủ công:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 12. Xuất Danh sách Báo cáo Học phí ra Excel (.xlsx)
router.get('/tuition/export-excel', async (req, res) => {
  try {
    const semester = await getCurrentSemester();
    const payments = await Payment.findAll({
      where: { semester },
      include: [Student],
      order: [['id', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Đăng ký Học';
    const worksheet = workbook.addWorksheet('Danh_Sach_Hoc_Phi', {
      views: [{ showGridLines: true }]
    });

    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `BÁO CÁO TÌNH HÌNH THU HỌC PHÍ HỌC KỲ ${semester}`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: '1F4E79' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:I2');
    worksheet.getCell('A2').value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Tổng số: ${payments.length} sinh viên`;
    worksheet.getCell('A2').font = { name: 'Calibri', size: 11, italic: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    const headers = [
      'STT', 'Mã Sinh Viên', 'Họ và Tên', 'Lớp Sinh Hoạt',
      'Tổng Tiền Gốc', 'Miễn Giảm (%)', 'Lý Do Miễn Giảm', 'Thực Nộp (VNĐ)', 'Trạng Thái'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    let index = 1;
    let sumPayable = 0;
    let sumCollected = 0;

    for (let p of payments) {
      sumPayable += p.finalAmount || 0;
      sumCollected += Math.min(Number(p.paidAmount) || 0, Number(p.finalAmount) || 0);

      const row = worksheet.addRow([
        index++,
        p.studentId,
        p.Student ? p.Student.name : '',
        p.Student ? p.Student.class : '',
        p.amount || 0,
        `${(p.discountRate || 0) * 100}%`,
        p.discountReason || '-',
        p.finalAmount || 0,
        p.status === 'paid' ? 'Đã hoàn thành' : 'Chưa đóng'
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: [1, 2, 4, 6, 9].includes(colNumber) ? 'center' : ([5, 8].includes(colNumber) ? 'right' : 'left'),
          vertical: 'middle'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D9D9D9' } },
          left: { style: 'thin', color: { argb: 'D9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
          right: { style: 'thin', color: { argb: 'D9D9D9' } }
        };
      });
    }

    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['', '', 'TỔNG CỘNG THỰC PHẢI THU:', '', '', '', '', `${sumPayable.toLocaleString('vi-VN')} VNĐ`, `Đã thu: ${sumCollected.toLocaleString('vi-VN')} VNĐ`]);
    summaryRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '1F4E79' } };

    worksheet.columns.forEach((col, i) => {
      let maxLen = headers[i] ? headers[i].length : 12;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const cellLen = cell.value ? cell.value.toString().length : 0;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      col.width = Math.max(maxLen + 4, 14);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Danh_Sach_Hoc_Phi.xlsx');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Lỗi xuất Excel danh sách học phí:', error);
    return res.status(500).json({ message: 'Lỗi server khi xuất file.' });
  }
});

export default router;
