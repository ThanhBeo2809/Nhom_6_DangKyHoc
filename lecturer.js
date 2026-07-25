import express from 'express';
import ExcelJS from 'exceljs';
import { Class, Course, Lecturer, Registration, Student, Grade, AuditLog } from '../models/index.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Áp dụng middleware bảo mật JWT và Phân quyền Giảng viên cho toàn bộ router
router.use(authenticateToken, authorizeRoles('lecturer'));

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

    const semester = 'HK1-2025';
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

    const semester = 'HK1-2025';
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

    // Tìm tất cả lớp học phần của giảng viên
    const classes = await Class.findAll({
      where: { lecturerId: lecturer.id }
    });
    const classIds = classes.map(c => c.id);

    // Tìm các yêu cầu phúc khảo chưa giải quyết
    const requests = await Grade.findAll({
      where: {
        classId: classIds,
        reEvalStatus: 'requested'
      },
      include: [Student, Course]
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

  try {
    const lecturer = await getLecturerFromReq(req, res);
    if (!lecturer) return;

    const grade = await Grade.findByPk(gradeId);
    if (!grade) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi điểm số.' });
    }

    // Xác nhận giảng viên dạy lớp đó
    const cls = await Class.findOne({
      where: { id: grade.classId, lecturerId: lecturer.id }
    });

    if (!cls) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa điểm phúc khảo của lớp này.' });
    }

    const att = parseFloat(attendanceGrade);
    const mid = parseFloat(midtermGrade);
    const fin = parseFloat(finalGrade);
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
    await grade.save();

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
    });

    return res.json({ message: 'Giải quyết phúc khảo và cập nhật điểm số mới thành công!', grade });
  } catch (error) {
    console.error('Lỗi xử lý phúc khảo:', error);
    return res.status(500).json({ message: 'Lỗi server khi phê duyệt điểm.' });
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
