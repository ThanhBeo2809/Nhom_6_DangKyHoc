import express from 'express';
import ExcelJS from 'exceljs';
import { sequelize, Class, Course, Lecturer, Registration, Student, Grade, AuditLog, Department } from '../models/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { getCurrentSemester } from '../utils/academicTermHelper.js';
import { createNotification } from '../utils/notificationHelper.js';
import { parseReEvaluationGrades } from '../utils/reEvaluationHelper.js';

const router = express.Router();

// Áp dụng middleware bảo mật JWT và Phân quyền Giảng viên cho toàn bộ router
router.use(authenticateToken, authorizeRoles('lecturer'));

// Helper: Lấy thông tin Giảng viên từ JWT Token (req.user)
async function getLecturerFromReq(req, res) {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    res.status(401).json({ message: 'Chưa đăng nhập.' });
    return null;
  }
  const lecturer = await Lecturer.findOne({ where: { userId } });
  if (!lecturer) {
    res.status(403).json({ message: 'Không tìm thấy hồ sơ giảng viên tương ứng.' });
    return null;
  }
  return lecturer;
}

// Helper: Quy đổi điểm số sang thang chữ và hệ 4
function calculateGradeDetails(att, mid, fin) {
  if (att === null || mid === null || fin === null) {
    return { total10: null, letterGrade: null, grade4: null };
  }
  
  // Tính tổng điểm hệ 10 làm tròn 1 chữ số thập phân
  const total = parseFloat((att * 0.1 + mid * 0.3 + fin * 0.6).toFixed(1));
  let letter = 'F';
  let g4 = 0.0;

  if (total >= 8.5) {
    letter = 'A';
    g4 = 4.0;
  } else if (total >= 7.0) {
    letter = 'B';
    g4 = 3.0;
  } else if (total >= 5.5) {
    letter = 'C';
    g4 = 2.0;
  } else if (total >= 4.0) {
    letter = 'D';
    g4 = 1.0;
  } else {
    letter = 'F';
    g4 = 0.0;
  }

  return { total10: total, letterGrade: letter, grade4: g4 };
}

// 0. Lấy Hồ sơ chi tiết của Giảng viên
router.get('/profile', async (req, res) => {
  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const fullProfile = await Lecturer.findOne({
      where: { id: lecturer.id },
      include: [Department]
    });

    return res.json(fullProfile);
  } catch (error) {
    console.error('Lỗi lấy hồ sơ giảng viên:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 0b. Lấy Thời khóa biểu giảng dạy của Giảng viên
router.get('/schedule', async (req, res) => {
  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const semester = await getCurrentSemester();
    const classes = await Class.findAll({
      where: { lecturerId: lecturer.id, semester, status: 'active' },
      include: [Course]
    });

    const scheduleList = [];
    for (let c of classes) {
      const enrolledCount = await Registration.count({
        where: { classId: c.id, status: 'enrolled' }
      });
      scheduleList.push({
        classId: c.id,
        courseId: c.courseId,
        courseName: c.Course ? c.Course.name : '',
        credits: c.Course ? c.Course.credits : 0,
        roomName: c.roomName,
        roomType: c.roomType,
        capacity: c.capacity,
        enrolledCount,
        dayOfWeek: c.dayOfWeek,
        shift: c.shift,
        startSlot: c.startSlot,
        numSlots: c.numSlots
      });
    }

    return res.json(scheduleList);
  } catch (error) {
    console.error('Lỗi lấy TKB giảng viên:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 1. Lấy danh sách lớp giảng viên đang dạy trong kỳ
router.get('/classes', async (req, res) => {
  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const semester = await getCurrentSemester();
    const classes = await Class.findAll({
      where: { lecturerId: lecturer.id, semester, status: 'active' },
      include: [Course]
    });

    return res.json(classes);
  } catch (error) {
    console.error('Lỗi lấy lớp giảng dạy:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 2. Lấy danh sách sinh viên học lớp đó (kèm bảng điểm hiện tại)
router.get('/classes/:classId/students', async (req, res) => {
  const { classId } = req.params;

  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const cls = await Class.findOne({
      where: { id: classId, lecturerId: lecturer.id }
    });

    if (!cls) {
      return res.status(403).json({ message: 'Bạn không có quyền giảng dạy lớp này.' });
    }

    // Lấy tất cả sinh viên có trạng thái 'enrolled' trong lớp
    const regs = await Registration.findAll({
      where: { classId, status: 'enrolled' },
      include: [Student]
    });

    const studentsWithGrades = [];
    for (let r of regs) {
      const student = r.Student;
      
      // Tìm hoặc khởi tạo bản ghi điểm cho sinh viên tại lớp học phần này
      let [grade] = await Grade.findOrCreate({
        where: {
          studentId: student.id,
          classId: classId,
          courseId: cls.courseId
        },
        defaults: {
          attendanceGrade: null,
          midtermGrade: null,
          finalGrade: null,
          total10: null,
          letterGrade: null,
          grade4: null,
          isLocked: false
        }
      });

      studentsWithGrades.push({
        student,
        grade
      });
    }

    return res.json(studentsWithGrades);
  } catch (error) {
    console.error('Lỗi lấy danh sách sinh viên lớp:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 3. Nhập/Sửa điểm cho sinh viên trong lớp học phần
router.post('/classes/:classId/grades', async (req, res) => {
  const { classId } = req.params;
  const { studentId, attendanceGrade, midtermGrade, finalGrade } = req.body;

  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const cls = await Class.findOne({
      where: { id: classId, lecturerId: lecturer.id }
    });

    if (!cls) {
      return res.status(403).json({ message: 'Bạn không dạy lớp học này.' });
    }

    // Tìm bản ghi điểm
    const grade = await Grade.findOne({
      where: { studentId, classId }
    });

    if (!grade) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin điểm của sinh viên trong lớp này.' });
    }

    if (grade.isLocked) {
      return res.status(400).json({ message: 'Điểm số đã được khóa, bạn không thể thay đổi.' });
    }

    // Tính toán quy đổi
    const att = parseFloat(attendanceGrade);
    const mid = parseFloat(midtermGrade);
    const fin = parseFloat(finalGrade);

    // Validate khoảng điểm hợp lệ trong khoảng [0, 10]
    if (isNaN(att) || att < 0 || att > 10 || isNaN(mid) || mid < 0 || mid > 10 || isNaN(fin) || fin < 0 || fin > 10) {
      return res.status(400).json({ message: 'Điểm số nhập vào phải nằm trong khoảng từ 0 đến 10.' });
    }

    const details = calculateGradeDetails(att, mid, fin);

    // Cập nhật điểm
    grade.attendanceGrade = att;
    grade.midtermGrade = mid;
    grade.finalGrade = fin;
    grade.total10 = details.total10;
    grade.letterGrade = details.letterGrade;
    grade.grade4 = details.grade4;
    await grade.save();

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: lecturer.userId,
      username: lecturer.id,
      action: 'NHAP_DIEM_SINH_VIEN',
      details: JSON.stringify({ studentId, classId, grades: { att, mid, fin }, total10: details.total10 }),
      ipAddress: clientIp
    });

    return res.json({ message: 'Cập nhật điểm thành công!', grade });
  } catch (error) {
    console.error('Lỗi nhập điểm:', error);
    return res.status(500).json({ message: 'Lỗi server khi nhập điểm.' });
  }
});

// Import điểm từ chính mẫu Excel do hệ thống xuất ra.
router.post('/classes/:classId/import-excel', async (req, res) => {
  const { classId } = req.params;
  const { fileBase64 } = req.body;
  if (!fileBase64) return res.status(400).json({ message: 'Chưa cung cấp tệp Excel.' });

  const transaction = await sequelize.transaction();
  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) {
      await transaction.rollback();
      return;
    }

    const cls = await Class.findOne({
      where: { id: classId, lecturerId: lecturer.id },
      transaction
    });
    if (!cls) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Bạn không phụ trách lớp học phần này.' });
    }

    const workbook = new ExcelJS.Workbook();
    const rawBase64 = String(fileBase64).replace(/^data:.*;base64,/, '');
    const excelBuffer = Buffer.from(rawBase64, 'base64');
    if (excelBuffer.length > 8 * 1024 * 1024) {
      throw new Error('Tệp Excel vượt quá giới hạn 8 MB.');
    }
    await workbook.xlsx.load(excelBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('Tệp Excel không có worksheet.');

    let headerRowNumber = 0;
    const headers = new Map();
    worksheet.eachRow((row, rowNumber) => {
      if (headerRowNumber) return;
      row.eachCell((cell, columnNumber) => {
        const value = String(cell.value || '').trim().toLowerCase();
        if (value.includes('mã sinh viên')) headerRowNumber = rowNumber;
        if (value) headers.set(value, columnNumber);
      });
    });
    if (!headerRowNumber) throw new Error('Không tìm thấy dòng tiêu đề có cột Mã Sinh Viên.');

    headers.clear();
    worksheet.getRow(headerRowNumber).eachCell((cell, columnNumber) => {
      headers.set(String(cell.value || '').trim().toLowerCase(), columnNumber);
    });
    const findColumn = (...needles) => {
      for (const [name, column] of headers.entries()) {
        if (needles.some(needle => name.includes(needle))) return column;
      }
      return 0;
    };

    const studentColumn = findColumn('mã sinh viên');
    const attendanceColumn = findColumn('chuyên cần');
    const midtermColumn = findColumn('giữa kỳ');
    const finalColumn = findColumn('cuối kỳ');
    if (!studentColumn || !attendanceColumn || !midtermColumn || !finalColumn) {
      throw new Error('Tệp phải có đủ các cột Mã Sinh Viên, Chuyên Cần, Giữa Kỳ và Cuối Kỳ.');
    }

    const inputRows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      const studentId = String(row.getCell(studentColumn).value || '').trim();
      if (!studentId) return;
      inputRows.push({
        rowNumber,
        studentId,
        attendanceGrade: Number(row.getCell(attendanceColumn).value),
        midtermGrade: Number(row.getCell(midtermColumn).value),
        finalGrade: Number(row.getCell(finalColumn).value)
      });
    });
    if (!inputRows.length) throw new Error('Tệp Excel không có dữ liệu sinh viên.');

    const errors = [];
    let imported = 0;
    for (const item of inputRows) {
      const validGrades = [item.attendanceGrade, item.midtermGrade, item.finalGrade]
        .every(value => Number.isFinite(value) && value >= 0 && value <= 10);
      if (!validGrades) {
        errors.push(`Dòng ${item.rowNumber}: điểm phải nằm trong khoảng 0-10.`);
        continue;
      }
      const registration = await Registration.findOne({
        where: { classId, studentId: item.studentId, status: 'enrolled' },
        transaction
      });
      if (!registration) {
        errors.push(`Dòng ${item.rowNumber}: sinh viên ${item.studentId} không thuộc lớp.`);
        continue;
      }
      const [grade] = await Grade.findOrCreate({
        where: { studentId: item.studentId, courseId: cls.courseId, classId },
        defaults: { isLocked: false },
        transaction
      });
      if (grade.isLocked) {
        errors.push(`Dòng ${item.rowNumber}: điểm của ${item.studentId} đã khóa.`);
        continue;
      }
      const details = calculateGradeDetails(item.attendanceGrade, item.midtermGrade, item.finalGrade);
      grade.attendanceGrade = item.attendanceGrade;
      grade.midtermGrade = item.midtermGrade;
      grade.finalGrade = item.finalGrade;
      grade.total10 = details.total10;
      grade.letterGrade = details.letterGrade;
      grade.grade4 = details.grade4;
      await grade.save({ transaction });
      imported++;
    }

    if (errors.length) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Tệp có dữ liệu không hợp lệ nên chưa có điểm nào được nhập.',
        errors
      });
    }

    await AuditLog.create({
      userId: lecturer.userId,
      username: lecturer.id,
      action: 'IMPORT_DIEM_EXCEL',
      details: JSON.stringify({ classId, imported }),
      ipAddress: req.ip || req.headers['x-forwarded-for']
    }, { transaction });
    await transaction.commit();
    return res.json({ message: `Đã nhập điểm thành công cho ${imported} sinh viên.`, imported });
  } catch (error) {
    await transaction.rollback();
    console.error('Lỗi import điểm Excel:', error);
    return res.status(400).json({ message: error.message || 'Không thể đọc tệp Excel.' });
  }
});

// 4. Khóa điểm học phần cho toàn bộ lớp học
router.post('/classes/:classId/lock-grades', async (req, res) => {
  const { classId } = req.params;

  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const cls = await Class.findOne({
      where: { id: classId, lecturerId: lecturer.id }
    });

    if (!cls) {
      return res.status(403).json({ message: 'Bạn không dạy lớp học này.' });
    }

    // Kiểm tra xem còn sinh viên nào chưa được nhập đầy đủ điểm hay không
    const incompleteCount = await Grade.count({
      where: {
        classId,
        [Op.or]: [
          { attendanceGrade: null },
          { midtermGrade: null },
          { finalGrade: null }
        ]
      }
    });

    if (incompleteCount > 0) {
      return res.status(400).json({ message: `Không thể khóa bảng điểm! Hiện vẫn còn ${incompleteCount} sinh viên chưa được nhập đầy đủ 3 đầu điểm.` });
    }

    // Khóa tất cả điểm số của lớp này
    await Grade.update(
      { isLocked: true },
      { where: { classId } }
    );

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: lecturer.userId,
      username: lecturer.id,
      action: 'KHOA_BANG_DIEM_LOP',
      details: JSON.stringify({ classId }),
      ipAddress: clientIp
    });

    const enrolled = await Registration.findAll({
      where: { classId, status: 'enrolled' },
      include: [Student]
    });
    for (const registration of enrolled) {
      await createNotification({
        userId: registration.Student?.userId,
        type: 'grade',
        title: 'Bảng điểm đã được công bố',
        message: `Giảng viên đã khóa và công bố điểm lớp ${classId}.`,
        data: { classId },
        io: req.app.get('io')
      });
    }

    return res.json({ message: 'Đã khóa bảng điểm lớp thành công! Sinh viên hiện tại có thể xem điểm chính thức.' });
  } catch (error) {
    console.error('Lỗi khóa điểm:', error);
    return res.status(500).json({ message: 'Lỗi khóa điểm.' });
  }
});

// 5. Danh sách yêu cầu phúc khảo của các lớp giảng viên dạy
router.get('/phuc-khao', async (req, res) => {
  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    // Truy vấn trực tiếp qua lớp để chỉ trả đơn đúng giảng viên phụ trách.
    const requests = await Grade.findAll({
      where: { reEvalStatus: 'requested' },
      include: [
        Student,
        Course,
        {
          model: Class,
          required: true,
          where: { lecturerId: lecturer.id },
          attributes: ['id', 'semester', 'lecturerId']
        }
      ],
      order: [['updatedAt', 'ASC'], ['id', 'ASC']]
    });

    return res.json(requests);
  } catch (error) {
    console.error('Lỗi lấy đơn phúc khảo:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 6. Xử lý yêu cầu phúc khảo (Chấm điểm lại)
router.post('/phuc-khao/:gradeId/resolve', async (req, res) => {
  const { gradeId } = req.params;
  const { attendanceGrade, midtermGrade, finalGrade } = req.body;

  let transaction;
  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const parsedGrades = parseReEvaluationGrades({
      attendanceGrade,
      midtermGrade,
      finalGrade
    });
    transaction = await sequelize.transaction();

    const grade = await Grade.findByPk(gradeId, {
      include: [{
        model: Class,
        required: true,
        where: { lecturerId: lecturer.id }
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!grade) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Không tìm thấy đơn phúc khảo thuộc lớp bạn phụ trách.' });
    }

    if (grade.reEvalStatus !== 'requested') {
      await transaction.rollback();
      return res.status(409).json({ message: 'Đơn phúc khảo này không còn ở trạng thái chờ xử lý.' });
    }

    const att = parsedGrades.attendanceGrade;
    const mid = parsedGrades.midtermGrade;
    const fin = parsedGrades.finalGrade;
    const details = calculateGradeDetails(att, mid, fin);

    // Lưu lại điểm số sau phúc khảo
    const beforeGrades = { att: grade.attendanceGrade, mid: grade.midtermGrade, fin: grade.finalGrade };
    
    grade.attendanceGrade = att;
    grade.midtermGrade = mid;
    grade.finalGrade = fin;
    grade.total10 = details.total10;
    grade.letterGrade = details.letterGrade;
    grade.grade4 = details.grade4;
    grade.reEvalStatus = 'completed'; // Đã chấm lại xong
    await grade.save({ transaction });

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: lecturer.userId,
      username: lecturer.id,
      action: 'DUYET_DIEM_PHUC_KHAO',
      details: JSON.stringify({
        gradeId,
        studentId: grade.studentId,
        before: beforeGrades,
        after: { att, mid, fin },
        total10: details.total10
      }),
      ipAddress: clientIp
    }, { transaction });

    const gradeStudent = await Student.findByPk(grade.studentId, { transaction });
    const notification = await createNotification({
      userId: gradeStudent?.userId,
      type: 'grade',
      title: 'Phúc khảo đã được xử lý',
      message: `Kết quả phúc khảo môn ${grade.courseId} đã được cập nhật.`,
      data: { gradeId: grade.id, classId: grade.classId },
      transaction
    });

    await transaction.commit();
    const io = req.app.get('io');
    if (io && notification) {
      io.to(`user_${gradeStudent.userId}`).emit('notification_created', notification.toJSON());
    }

    return res.json({ message: 'Giải quyết phúc khảo và cập nhật điểm số mới thành công!', grade });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Lỗi xử lý phúc khảo:', error);
    return res.status(error.status || 500).json({
      code: error.code,
      message: error.message || 'Lỗi server khi phê duyệt điểm.'
    });
  }
});

// 7. Xuất Bảng điểm Lớp học phần ra file Excel (.xlsx)
router.get('/classes/:classId/export-excel', async (req, res) => {
  const { classId } = req.params;

  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const cls = await Class.findOne({
      where: { id: classId, lecturerId: lecturer.id },
      include: [Course]
    });

    if (!cls) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập lớp học phần này.' });
    }

    const regs = await Registration.findAll({
      where: { classId, status: 'enrolled' },
      include: [Student]
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Đăng ký Học';
    const worksheet = workbook.addWorksheet('Bang_Diem', {
      views: [{ showGridLines: true }]
    });

    // Tiêu đề Bảng điểm
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `BẢNG ĐIỂM HỌC PHẦN: ${cls.Course ? cls.Course.name.toUpperCase() : ''} (${cls.id})`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: '1F4E79' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Thông tin bổ sung
    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = `Giảng viên: ${lecturer.name} | Học kỳ: ${cls.semester} | Sĩ số: ${regs.length} sinh viên`;
    worksheet.getCell('A2').font = { name: 'Calibri', size: 11, italic: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Dòng trống

    // Header bảng
    const headers = [
      'STT', 'Mã Sinh Viên', 'Họ và Tên', 'Ngày Sinh', 'Lớp Sinh Hoạt',
      'Chuyên Cần (10%)', 'Giữa Kỳ (30%)', 'Cuối Kỳ (60%)', 'Tổng Điểm (10)', 'Điểm Chữ', 'Thang 4'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E79' }
      };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Đổ dữ liệu sinh viên & điểm số
    let index = 1;
    for (let r of regs) {
      const student = r.Student;
      const grade = await Grade.findOne({ where: { studentId: student.id, classId } });

      const row = worksheet.addRow([
        index++,
        student.id,
        student.name,
        student.dob || '',
        student.class || '',
        grade && grade.attendanceGrade !== null ? grade.attendanceGrade : '-',
        grade && grade.midtermGrade !== null ? grade.midtermGrade : '-',
        grade && grade.finalGrade !== null ? grade.finalGrade : '-',
        grade && grade.total10 !== null ? grade.total10 : '-',
        grade && grade.letterGrade ? grade.letterGrade : '-',
        grade && grade.grade4 !== null ? grade.grade4 : '-'
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11].includes(colNumber) ? 'center' : 'left',
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

    // Tự động căn chỉnh độ rộng cột
    worksheet.columns.forEach((col, i) => {
      let maxLen = headers[i] ? headers[i].length : 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.row > 3) {
          const cellLen = cell.value ? cell.value.toString().length : 0;
          if (cellLen > maxLen) maxLen = cellLen;
        }
      });
      col.width = Math.max(maxLen + 4, 12);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Bang_Diem_${classId}.xlsx`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Lỗi xuất Excel bảng điểm:', error);
    return res.status(500).json({ message: 'Lỗi server khi xuất file Excel.' });
  }
});

export default router;
