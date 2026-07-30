import {
  Department,
  Major,
  User,
  Student,
  Lecturer,
  Course,
  Class,
  Registration,
  Grade,
  Payment,
  AuditLog,
  AcademicTerm,
  RegistrationPeriod
} from './models/index.js';
import bcrypt from 'bcryptjs';
import { rebalanceLecturerWorkloads } from './utils/lecturerWorkloadHelper.js';
import { seedAllStudentAcademicResults } from './utils/demoAcademicResultsSeeder.js';

async function ensureAcademicConfiguration() {
  await AcademicTerm.findOrCreate({
    where: { id: 'HK1-2026' },
    defaults: {
      name: 'Học kỳ 1 năm học 2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      status: 'active',
      isCurrent: true
    }
  });

  const currentCount = await AcademicTerm.count({ where: { isCurrent: true } });
  if (currentCount === 0) {
    const fallbackCurrent = await AcademicTerm.findByPk('HK1-2026');
    fallbackCurrent.isCurrent = true;
    fallbackCurrent.status = 'active';
    await fallbackCurrent.save();
  }

  const periodCount = await RegistrationPeriod.count({ where: { termId: 'HK1-2026' } });
  if (periodCount === 0) {
    const startAt = new Date();
    startAt.setDate(startAt.getDate() - 30);
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + 30);
    await RegistrationPeriod.create({
      termId: 'HK1-2026',
      name: 'Đợt đăng ký chính thức',
      startAt,
      endAt,
      isEnabled: true
    });
  }
}

export async function seedPastGrades() {
  const pastGrades = [
    { studentId: '24100001', courseId: 'MLN101', classId: null, attendanceGrade: 10, midtermGrade: 9, finalGrade: 9, total10: 9.1, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100001', courseId: 'MAT101', classId: null, attendanceGrade: 8, midtermGrade: 7, finalGrade: 7.5, total10: 7.4, letterGrade: 'B', grade4: 3.0, isLocked: true },
    
    // === Sinh viên 24100002 (Lê Minh Anh - Năm 2): Điểm đầy đủ Học kỳ 1 & 2 Năm 1 ===
    // HK1 Năm 1 (18 tín chỉ)
    { studentId: '24100002', courseId: 'MLN101', classId: null, attendanceGrade: 10, midtermGrade: 8.5, finalGrade: 9.0, total10: 8.95, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'MAT101', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 8.0, total10: 8.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'ENG101', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 7.5, total10: 7.80, letterGrade: 'B+', grade4: 3.5, isLocked: true },
    { studentId: '24100002', courseId: 'TC01',   classId: null, attendanceGrade: 10, midtermGrade: 9.0, finalGrade: 9.0, total10: 9.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'QP01',   classId: null, attendanceGrade: 10, midtermGrade: 8.5, finalGrade: 8.5, total10: 8.65, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'INT101', classId: null, attendanceGrade: 9, midtermGrade: 8.5, finalGrade: 8.5, total10: 8.55, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'INT102', classId: null, attendanceGrade: 8.5, midtermGrade: 8.0, finalGrade: 7.5, total10: 7.75, letterGrade: 'B+', grade4: 3.5, isLocked: true },

    // HK2 Năm 1 (19 tín chỉ)
    { studentId: '24100002', courseId: 'MLN102', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 8.0, total10: 8.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'MAT102', classId: null, attendanceGrade: 8.5, midtermGrade: 7.5, finalGrade: 7.5, total10: 7.60, letterGrade: 'B+', grade4: 3.5, isLocked: true },
    { studentId: '24100002', courseId: 'ENG102', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 8.0, total10: 8.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'PHY101', classId: null, attendanceGrade: 8, midtermGrade: 7.0, finalGrade: 7.0, total10: 7.10, letterGrade: 'B', grade4: 3.0, isLocked: true },
    { studentId: '24100002', courseId: 'TC02',   classId: null, attendanceGrade: 10, midtermGrade: 9.0, finalGrade: 9.0, total10: 9.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'INT103', classId: null, attendanceGrade: 9.5, midtermGrade: 9.0, finalGrade: 8.5, total10: 8.75, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'INT104', classId: null, attendanceGrade: 9, midtermGrade: 8.5, finalGrade: 8.0, total10: 8.25, letterGrade: 'A', grade4: 4.0, isLocked: true },
    { studentId: '24100002', courseId: 'INT106', classId: null, attendanceGrade: 9.5, midtermGrade: 9.0, finalGrade: 9.0, total10: 9.05, letterGrade: 'A', grade4: 4.0, isLocked: true },

    { studentId: '24100003', courseId: 'INT103', classId: null, attendanceGrade: 5, midtermGrade: 4, finalGrade: 3, total10: 3.5, letterGrade: 'F', grade4: 0.0, isLocked: true }
  ];
  for (let pg of pastGrades) {
    const exists = await Grade.findOne({ where: { studentId: pg.studentId, courseId: pg.courseId } });
    if (!exists) {
      await Grade.create(pg);
    }
  }
}

export async function seedMockData() {
  try {
    await ensureAcademicConfiguration();
    const userCount = await User.count();
    const studentCount = await Student.count();
    const forceSync = process.env.DB_SYNC_FORCE === 'true';
    if (userCount > 0 && studentCount > 0 && !forceSync) {
      await seedPastGrades().catch(e => {});
      console.log('✅ Cơ sở dữ liệu đã có dữ liệu mẫu ban đầu (Đã cập nhật bảng điểm).');
      return;
    }
    // --- 1. Tạo Khoa (Departments) ---
    const depts = [
      { id: 'CNTT', name: 'Khoa Công nghệ thông tin' },
      { id: 'KT', name: 'Khoa Kinh tế và Kinh doanh quốc tế' }
    ];
    await Department.bulkCreate(depts, { ignoreDuplicates: true });

    // --- 2. Tạo Ngành (Majors) ---
    const majors = [
      { id: 'cntt', name: 'Công nghệ thông tin', departmentId: 'CNTT' },
      { id: 'attt', name: 'An toàn thông tin', departmentId: 'CNTT' },
      { id: 'hthong_tt', name: 'Hệ thống thông tin', departmentId: 'CNTT' },
      { id: 'kdqt', name: 'Kinh doanh quốc tế', departmentId: 'KT' },
      { id: 'logistics', name: 'Logistics và Quản lý chuỗi cung ứng', departmentId: 'KT' },
      { id: 'tmdt', name: 'Thương mại điện tử', departmentId: 'KT' }
    ];
    await Major.bulkCreate(majors, { ignoreDuplicates: true });

    // --- 3. Tạo Môn học (Courses) ---
    const courses = [
      // ==========================================
      // I. KHỐI ĐẠI CƯƠNG CHUNG (20 môn dùng chung toàn trường)
      // ==========================================
      { id: 'MLN101', name: 'Triết học Mác - Lênin', credits: 3, majorId: null, term: 1 },
      { id: 'MLN102', name: 'Kinh tế chính trị Mác - Lênin', credits: 3, prerequisiteId: 'MLN101', majorId: null, term: 2 },
      { id: 'MLN103', name: 'Chủ nghĩa xã hội khoa học', credits: 3, prerequisiteId: 'MLN102', majorId: null, term: 3 },
      { id: 'HCM101', name: 'Tư tưởng Hồ Chí Minh', credits: 2, majorId: null, term: 4 },
      { id: 'LSD101', name: 'Lịch sử Đảng Cộng sản Việt Nam', credits: 2, majorId: null, term: 4 },
      { id: 'MAT101', name: 'Toán cao cấp A1 (Đại số tuyến tính)', credits: 3, majorId: null, term: 1 },
      { id: 'MAT102', name: 'Toán cao cấp A2 (Giải tích)', credits: 3, prerequisiteId: 'MAT101', majorId: null, term: 2 },
      { id: 'STA101', name: 'Lý thuyết xác suất và Thống kê toán', credits: 3, prerequisiteId: 'MAT101', majorId: null, term: 3 },
      { id: 'PHY101', name: 'Vật lý đại cương 1', credits: 3, majorId: null, term: 2 },
      { id: 'PHY102', name: 'Vật lý đại cương 2 (Thí nghiệm)', credits: 2, prerequisiteId: 'PHY101', majorId: null, term: 3 },
      { id: 'ENG101', name: 'Tiếng Anh cơ bản 1', credits: 3, majorId: null, term: 1 },
      { id: 'ENG102', name: 'Tiếng Anh cơ bản 2', credits: 3, prerequisiteId: 'ENG101', majorId: null, term: 2 },
      { id: 'ENG103', name: 'Tiếng Anh chuyên ngành 1', credits: 3, prerequisiteId: 'ENG102', majorId: null, term: 3 },
      { id: 'ENG104', name: 'Tiếng Anh chuyên ngành 2', credits: 3, prerequisiteId: 'ENG103', majorId: null, term: 4 },
      { id: 'TC01', name: 'Thể dục: Điền kinh', credits: 1, majorId: null, term: 1 },
      { id: 'TC02', name: 'Thể dục: Cầu lông', credits: 1, majorId: null, term: 2 },
      { id: 'TC03', name: 'Thể dục: Bóng đá', credits: 1, majorId: null, term: 3 },
      { id: 'TC04', name: 'Thể dục: Bóng rổ', credits: 1, majorId: null, term: 4 },
      { id: 'QP01', name: 'Giáo dục Quốc phòng - An ninh 1', credits: 2, majorId: null, term: 1 },
      { id: 'QP02', name: 'Giáo dục Quốc phòng - An ninh 2', credits: 2, majorId: null, term: 3 },
      
      // ==========================================
      // II. KHỐI CƠ SỞ NGÀNH CNTT & KỸ THUẬT (18 môn)
      // ==========================================
      { id: 'INT101', name: 'Nhập môn Công nghệ thông tin', credits: 3, majorId: 'cntt', term: 1 },
      { id: 'INT102', name: 'Toán rời rạc', credits: 3, majorId: 'cntt', term: 1 },
      { id: 'INT103', name: 'Kỹ thuật lập trình (C/C++)', credits: 3, majorId: 'cntt', term: 2 },
      { id: 'INT104', name: 'Lập trình hướng đối tượng (Java/C#)', credits: 3, majorId: 'cntt', term: 2 },
      { id: 'INT105', name: 'Cấu trúc dữ liệu và giải thuật', credits: 3, prerequisiteId: 'INT103', majorId: 'cntt', term: 3 },
      { id: 'INT106', name: 'Cơ sở dữ liệu', credits: 3, majorId: 'cntt', term: 2 },
      { id: 'INT107', name: 'Mạng máy tính và truyền thông', credits: 3, majorId: 'cntt', term: 3 },
      { id: 'INT108', name: 'Kiến trúc máy tính và Hợp ngữ', credits: 3, majorId: 'cntt', term: 3 },
      { id: 'INT109', name: 'Hệ điều hành', credits: 3, majorId: 'cntt', term: 3 },
      { id: 'INT110', name: 'Phương pháp tính & Đại số số học', credits: 3, majorId: 'cntt', term: 4 },
      { id: 'INT111', name: 'Nhập môn Trí tuệ nhân tạo (AI)', credits: 3, majorId: 'cntt', term: 4 },
      { id: 'INT112', name: 'Xử lý tín hiệu số', credits: 3, majorId: 'cntt', term: 4 },
      { id: 'INT113', name: 'Điện tử số và Vi điều khiển', credits: 3, majorId: 'cntt', term: 4 },
      { id: 'INT114', name: 'Hệ quản trị cơ sở dữ liệu (Oracle/SQL Server)', credits: 3, prerequisiteId: 'INT106', majorId: 'cntt', term: 4 },
      { id: 'INT115', name: 'Phân tích thuật toán và Độ phức tạp', credits: 3, prerequisiteId: 'INT105', majorId: 'cntt', term: 4 },
      { id: 'INT116', name: 'Nhập môn Khoa học dữ liệu (Data Science)', credits: 3, majorId: 'cntt', term: 4 },
      { id: 'INT117', name: 'Đồ họa máy tính và Xử lý ảnh', credits: 3, majorId: 'cntt', term: 4 },
      { id: 'INT118', name: 'Công nghệ phần mềm đại cương', credits: 3, majorId: 'cntt', term: 4 },

      // ==========================================
      // III. KHỐI CƠ SỞ NGÀNH KINH TẾ (18 môn)
      // ==========================================
      { id: 'ECO101', name: 'Kinh tế vi mô', credits: 3, majorId: 'kdqt', term: 1 },
      { id: 'ECO102', name: 'Kinh tế vĩ mô', credits: 3, majorId: 'kdqt', term: 2 },
      { id: 'ECO103', name: 'Marketing căn bản', credits: 3, majorId: 'kdqt', term: 1 },
      { id: 'ECO104', name: 'Lý thuyết tài chính tiền tệ', credits: 3, majorId: 'kdqt', term: 2 },
      { id: 'ECO105', name: 'Pháp luật đại cương & Luật kinh tế', credits: 3, majorId: 'kdqt', term: 3 },
      { id: 'ECO106', name: 'Nguyên lý kế toán', credits: 3, majorId: 'kdqt', term: 2 },
      { id: 'ECO107', name: 'Phân tích dữ liệu kinh doanh trong Excel/R', credits: 3, majorId: 'kdqt', term: 3 },
      { id: 'ECO108', name: 'Quản trị học đại cương', credits: 3, majorId: 'kdqt', term: 3 },
      { id: 'ECO109', name: 'Kinh tế lượng', credits: 3, prerequisiteId: 'STA101', majorId: 'kdqt', term: 3 },
      { id: 'ECO110', name: 'Quản trị Tài chính Doanh nghiệp', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO111', name: 'Đổi mới sáng tạo & Khởi nghiệp kinh doanh', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO112', name: 'Tâm lý học quản lý & Hành vi tổ chức', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO113', name: 'Quản trị Nhân sự & Thu hút nhân tài', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO114', name: 'Kế toán quản trị & Dự báo tài chính', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO115', name: 'Thương mại quốc tế đại cương', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO116', name: 'Phương pháp nghiên cứu trong Kinh tế', credits: 3, majorId: 'kdqt', term: 4 },
      { id: 'ECO117', name: 'Đạo đức kinh doanh & Trách nhiệm xã hội', credits: 2, majorId: 'kdqt', term: 4 },
      { id: 'ECO118', name: 'Nhập môn Kinh tế số (Digital Economy)', credits: 3, majorId: 'kdqt', term: 4 },

      // ==========================================
      // IV. CHUYÊN NGÀNH CÔNG NGHỆ THÔNG TIN (15 môn)
      // ==========================================
      { id: 'INT201', name: 'Công nghệ phần mềm nâng cao', credits: 3, majorId: 'cntt', term: 5 },
      { id: 'INT202', name: 'Lập trình Web Full-Stack (NodeJS/React)', credits: 3, majorId: 'cntt', term: 5 },
      { id: 'INT203', name: 'Lập trình thiết bị di động (Flutter/Android)', credits: 3, majorId: 'cntt', term: 5 },
      { id: 'INT204', name: 'Triển khai ứng dụng Cloud & DevOps', credits: 3, majorId: 'cntt', term: 5 },
      { id: 'INT205', name: 'Lập trình Doanh nghiệp Java Spring Boot', credits: 3, prerequisiteId: 'INT104', majorId: 'cntt', term: 6 },
      { id: 'INT206', name: 'Kiến trúc Microservices & Serverless', credits: 3, majorId: 'cntt', term: 6 },
      { id: 'INT207', name: 'Kiểm thử và Bảo trì Phần mềm (Software Testing)', credits: 3, majorId: 'cntt', term: 6 },
      { id: 'INT208', name: 'Học máy (Machine Learning) & Deep Learning', credits: 3, prerequisiteId: 'INT111', majorId: 'cntt', term: 6 },
      { id: 'INT209', name: 'Điện toán đám mây (AWS/Azure)', credits: 3, majorId: 'cntt', term: 7 },
      { id: 'INT210', name: 'Xử lý ngôn ngữ tự nhiên (NLP)', credits: 3, majorId: 'cntt', term: 7 },
      { id: 'INT211', name: 'Thị giác máy tính (Computer Vision)', credits: 3, majorId: 'cntt', term: 7 },
      { id: 'INT212', name: 'Phát triển Game với Unity Engine', credits: 3, majorId: 'cntt', term: 7 },
      { id: 'INT213', name: 'Công nghệ Blockchain & Smart Contracts', credits: 3, majorId: 'cntt', term: 7 },
      { id: 'INT214', name: 'Lập trình Hệ thống nhúng & IoT', credits: 3, majorId: 'cntt', term: 7 },
      { id: 'INT215', name: 'Thực tập tốt nghiệp & Đồ án tốt nghiệp CNTT', credits: 6, majorId: 'cntt', term: 8 },

      // ==========================================
      // V. CHUYÊN NGÀNH AN TOÀN THÔNG TIN (15 môn)
      // ==========================================
      { id: 'SEC201', name: 'Cryptography & An ninh mạng', credits: 3, majorId: 'attt', term: 5 },
      { id: 'SEC202', name: 'Quản trị hệ thống & Bảo mật mạng', credits: 3, prerequisiteId: 'INT107', majorId: 'attt', term: 5 },
      { id: 'SEC203', name: 'Phân tích mã độc & Reverse Engineering', credits: 3, prerequisiteId: 'SEC201', majorId: 'attt', term: 6 },
      { id: 'SEC204', name: 'Đánh giá An toàn thông tin (Penetration Testing)', credits: 3, prerequisiteId: 'SEC202', majorId: 'attt', term: 6 },
      { id: 'SEC205', name: 'Giám sát & Đọc hồ sơ An ninh mạng (SOC)', credits: 3, majorId: 'attt', term: 5 },
      { id: 'SEC206', name: 'An toàn Hệ điều hành và Ứng dụng Web', credits: 3, majorId: 'attt', term: 5 },
      { id: 'SEC207', name: 'An ninh Điện toán đám mây & IoT Security', credits: 3, majorId: 'attt', term: 6 },
      { id: 'SEC208', name: 'Điều tra vết kỹ thuật số (Computer Forensics)', credits: 3, prerequisiteId: 'SEC203', majorId: 'attt', term: 6 },
      { id: 'SEC209', name: 'Phòng chống Tấn công mạng & Firewall/IDS', credits: 3, majorId: 'attt', term: 7 },
      { id: 'SEC210', name: 'Quản lý Rủi ro & Tiêu chuẩn ISO 27001', credits: 3, majorId: 'attt', term: 7 },
      { id: 'SEC211', name: 'Bảo mật Cơ sở dữ liệu & Ứng dụng di động', credits: 3, majorId: 'attt', term: 7 },
      { id: 'SEC212', name: 'An toàn thông tin trong Giao dịch Điện tử', credits: 3, majorId: 'attt', term: 7 },
      { id: 'SEC213', name: 'Kỹ thuật Tấn công & Phòng thủ Mạng (Red/Blue Team)', credits: 3, prerequisiteId: 'SEC204', majorId: 'attt', term: 7 },
      { id: 'SEC214', name: 'Phát triển Phần mềm An toàn (DevSecOps)', credits: 3, majorId: 'attt', term: 7 },
      { id: 'SEC215', name: 'Thực tập tốt nghiệp & Đồ án tốt nghiệp ATTT', credits: 6, majorId: 'attt', term: 8 },

      // ==========================================
      // VI. CHUYÊN NGÀNH HỆ THỐNG THÔNG TIN (15 môn)
      // ==========================================
      { id: 'MIS201', name: 'Phân tích và thiết kế hệ thống thông tin', credits: 3, majorId: 'hthong_tt', term: 5 },
      { id: 'MIS202', name: 'Quản trị và Phân tích Dữ liệu lớn (Big Data)', credits: 3, prerequisiteId: 'INT106', majorId: 'hthong_tt', term: 5 },
      { id: 'MIS203', name: 'Quản trị Hệ thống Hoạch định ERP (SAP/Odoo)', credits: 3, majorId: 'hthong_tt', term: 5 },
      { id: 'MIS204', name: 'Khai phá dữ liệu & Đột phá Tri thức (Data Mining)', credits: 3, prerequisiteId: 'MIS202', majorId: 'hthong_tt', term: 6 },
      { id: 'MIS205', name: 'Xây dựng Kho dữ liệu (Data Warehouse) & BI', credits: 3, prerequisiteId: 'MIS204', majorId: 'hthong_tt', term: 6 },
      { id: 'MIS206', name: 'Hệ quản trị Nội dung & Cổng thông tin Doanh nghiệp', credits: 3, majorId: 'hthong_tt', term: 5 },
      { id: 'MIS207', name: 'Quản trị Dự án Hệ thống Thông tin (Agile/Scrum)', credits: 3, prerequisiteId: 'MIS201', majorId: 'hthong_tt', term: 6 },
      { id: 'MIS208', name: 'Phân tích Quy trình Kinh doanh (BPMN)', credits: 3, majorId: 'hthong_tt', term: 6 },
      { id: 'MIS209', name: 'Hệ thống Trợ giúp Quyết định (DSS) & Web Mining', credits: 3, majorId: 'hthong_tt', term: 7 },
      { id: 'MIS210', name: 'An toàn & Bảo mật Hệ thống Thông tin Doanh nghiệp', credits: 3, majorId: 'hthong_tt', term: 7 },
      { id: 'MIS211', name: 'Tự động hóa Quy trình Doanh nghiệp (RPA)', credits: 3, majorId: 'hthong_tt', term: 7 },
      { id: 'MIS212', name: 'Hệ thống Thông tin Địa lý (GIS)', credits: 3, majorId: 'hthong_tt', term: 7 },
      { id: 'MIS213', name: 'Quản trị Tri thức Doanh nghiệp (KMS)', credits: 3, majorId: 'hthong_tt', term: 7 },
      { id: 'MIS214', name: 'Kiến trúc Doanh nghiệp (TOGAF Framework)', credits: 3, prerequisiteId: 'MIS203', majorId: 'hthong_tt', term: 7 },
      { id: 'MIS215', name: 'Thực tập tốt nghiệp & Đồ án tốt nghiệp HTTT', credits: 6, majorId: 'hthong_tt', term: 8 },

      // ==========================================
      // VII. CHUYÊN NGÀNH KINH DOANH QUỐC TẾ (15 môn)
      // ==========================================
      { id: 'ECO201', name: 'Giao dịch thương mại quốc tế', credits: 3, majorId: 'kdqt', term: 5 },
      { id: 'ECO202', name: 'Thanh toán quốc tế', credits: 3, prerequisiteId: 'ECO201', majorId: 'kdqt', term: 6 },
      { id: 'ECO203', name: 'Đầu tư quốc tế & Tài chính đa quốc gia', credits: 3, prerequisiteId: 'ECO104', majorId: 'kdqt', term: 5 },
      { id: 'ECO204', name: 'Quản trị Chiến lược Kinh doanh Quốc tế', credits: 3, prerequisiteId: 'ECO201', majorId: 'kdqt', term: 6 },
      { id: 'ECO205', name: 'Vận tải đa phương thức & Bảo hiểm hàng hải', credits: 3, majorId: 'kdqt', term: 5 },
      { id: 'ECO206', name: 'Marketing Quốc tế & Nghiên cứu Thị trường Toàn cầu', credits: 3, majorId: 'kdqt', term: 5 },
      { id: 'ECO207', name: 'Đàm phán Kinh doanh & Hợp đồng Thương mại Quốc tế', credits: 3, majorId: 'kdqt', term: 6 },
      { id: 'ECO208', name: 'Quản trị Chuỗi giá trị Toàn cầu (GVC)', credits: 3, prerequisiteId: 'ECO204', majorId: 'kdqt', term: 6 },
      { id: 'ECO209', name: 'Thương vụ Quốc tế & Sáp nhập Doanh nghiệp (M&A)', credits: 3, majorId: 'kdqt', term: 7 },
      { id: 'ECO210', name: 'Luật Thương mại Quốc tế & Giải quyết Tranh chấp WTO', credits: 3, prerequisiteId: 'ECO105', majorId: 'kdqt', term: 7 },
      { id: 'ECO211', name: 'Thương mại Điện tử Xuyên biên giới', credits: 3, majorId: 'kdqt', term: 7 },
      { id: 'ECO212', name: 'Quản trị Rủi ro & Tỷ giá trong Kinh doanh Quốc tế', credits: 3, majorId: 'kdqt', term: 7 },
      { id: 'ECO213', name: 'Văn hóa Doanh nghiệp & Giao thoa Văn hóa Toàn cầu', credits: 3, majorId: 'kdqt', term: 7 },
      { id: 'ECO214', name: 'Logistics Quốc tế & Thủ tục Hải quan xuất nhập khẩu', credits: 3, majorId: 'kdqt', term: 7 },
      { id: 'ECO215', name: 'Thực tập tốt nghiệp & Đồ án tốt nghiệp KDQT', credits: 6, majorId: 'kdqt', term: 8 },

      // ==========================================
      // VIII. CHUYÊN NGÀNH LOGISTICS & CHUỖI CUNG ỨNG (15 môn)
      // ==========================================
      { id: 'LOG201', name: 'Quản trị Vận tải & Kho hàng', credits: 3, majorId: 'logistics', term: 5 },
      { id: 'LOG202', name: 'Quản trị Chuỗi cung ứng Toàn cầu', credits: 3, prerequisiteId: 'LOG201', majorId: 'logistics', term: 6 },
      { id: 'LOG203', name: 'Quản trị Mua hàng & Cung ứng Vật tư (Procurement)', credits: 3, majorId: 'logistics', term: 5 },
      { id: 'LOG204', name: 'Thuật toán Tối ưu hóa Chuỗi cung ứng', credits: 3, prerequisiteId: 'LOG202', majorId: 'logistics', term: 6 },
      { id: 'LOG205', name: 'Quản trị Thu hồi & Logistics Đảo ngược', credits: 3, prerequisiteId: 'LOG202', majorId: 'logistics', term: 6 },
      { id: 'LOG206', name: 'Quản trị Giao nhận & Đại lý Vận tải (Freight Forwarding)', credits: 3, majorId: 'logistics', term: 5 },
      { id: 'LOG207', name: 'Hệ thống Thông tin Logistics (WMS / TMS / ERP)', credits: 3, prerequisiteId: 'LOG201', majorId: 'logistics', term: 6 },
      { id: 'LOG208', name: 'Quản trị Hàng tồn kho & Dự báo Nhu cầu', credits: 3, majorId: 'logistics', term: 6 },
      { id: 'LOG209', name: 'Quản trị Cảng biển & Sân bay Logistics', credits: 3, majorId: 'logistics', term: 7 },
      { id: 'LOG210', name: 'Logistics Chuỗi lạnh (Cold Chain Logistics)', credits: 3, majorId: 'logistics', term: 7 },
      { id: 'LOG211', name: 'Đóng gói Hàng hóa & An toàn Lao động Logistics', credits: 3, majorId: 'logistics', term: 7 },
      { id: 'LOG212', name: 'Luật Logistics & Thủ tục Hải quan Chuyên sâu', credits: 3, majorId: 'logistics', term: 7 },
      { id: 'LOG213', name: 'Quản trị Rủi ro Chuỗi cung ứng & Gián đoạn Vận tải', credits: 3, prerequisiteId: 'LOG202', majorId: 'logistics', term: 7 },
      { id: 'LOG214', name: 'Logistics Xanh & Phát triển Bền vững (Green Logistics)', credits: 3, majorId: 'logistics', term: 7 },
      { id: 'LOG215', name: 'Thực tập tốt nghiệp & Đồ án tốt nghiệp Logistics', credits: 6, majorId: 'logistics', term: 8 },

      // ==========================================
      // IX. CHUYÊN NGÀNH THƯƠNG MẠI ĐIỆN TỬ (15 môn)
      // ==========================================
      { id: 'ECOM201', name: 'Sàn giao dịch & Thanh toán điện tử', credits: 3, majorId: 'tmdt', term: 5 },
      { id: 'ECOM202', name: 'Digital Marketing & SEO/SEM', credits: 3, prerequisiteId: 'ECO103', majorId: 'tmdt', term: 5 },
      { id: 'ECOM203', name: 'Xây dựng & Quản trị Hệ thống TMĐT', credits: 3, prerequisiteId: 'ECOM201', majorId: 'tmdt', term: 6 },
      { id: 'ECOM204', name: 'Quản trị Quan hệ Khách hàng (CRM) trong TMĐT', credits: 3, majorId: 'tmdt', term: 5 },
      { id: 'ECOM205', name: 'Phân tích Hành vi Người tiêu dùng Số', credits: 3, majorId: 'tmdt', term: 5 },
      { id: 'ECOM206', name: 'Social Media Marketing & Content Strategy', credits: 3, prerequisiteId: 'ECOM202', majorId: 'tmdt', term: 6 },
      { id: 'ECOM207', name: 'Phân tích Dữ liệu Web & Conversion Rate (CRO)', credits: 3, prerequisiteId: 'ECOM203', majorId: 'tmdt', term: 6 },
      { id: 'ECOM208', name: 'Quản trị Gian hàng trên Shopee/Amazon/TikTok Shop', credits: 3, majorId: 'tmdt', term: 6 },
      { id: 'ECOM209', name: 'Thiết kế Trải nghiệm Người dùng (UI/UX) cho TMĐT', credits: 3, majorId: 'tmdt', term: 7 },
      { id: 'ECOM210', name: 'Pháp luật & An toàn Bảo mật trong TMĐT', credits: 3, majorId: 'tmdt', term: 7 },
      { id: 'ECOM211', name: 'Kinh doanh Trực tuyến & Mô hình Start-up TMĐT', credits: 3, majorId: 'tmdt', term: 7 },
      { id: 'ECOM212', name: 'Quản trị Chuỗi Cung ứng & Fulfillment trong TMĐT', credits: 3, majorId: 'tmdt', term: 7 },
      { id: 'ECOM213', name: 'Công nghệ Video Marketing & Livestream Bán hàng', credits: 3, majorId: 'tmdt', term: 7 },
      { id: 'ECOM214', name: 'Quảng cáo Trực tuyến (Facebook Ads/Google Ads/TikTok Ads)', credits: 3, prerequisiteId: 'ECOM206', majorId: 'tmdt', term: 7 },
      { id: 'ECOM215', name: 'Thực tập tốt nghiệp & Đồ án tốt nghiệp TMĐT', credits: 6, majorId: 'tmdt', term: 8 }
    ];
    await Course.bulkCreate(courses, { updateOnDuplicate: ['prerequisiteId', 'name', 'credits', 'majorId', 'term'] });

    // Tự động sinh 300 sinh viên (50 sinh viên cho mỗi ngành học)
    const hoList = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
    const demNam = ['Văn', 'Minh', 'Đức', 'Quốc', 'Hoàng', 'Tuấn', 'Hải', 'Thành', 'Hữu', 'Đình'];
    const demNu = ['Thị', 'Minh', 'Thu', 'Khánh', 'Ngọc', 'Phương', 'Bích', 'Hải', 'Ánh'];
    const tenNam = ['Anh', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Đức', 'Hải', 'Hiếu', 'Hùng', 'Huy', 'Khoa', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phúc', 'Quân', 'Sơn', 'Tài', 'Tân', 'Thành', 'Thắng', 'Thịnh', 'Trung', 'Tuấn', 'Việt', 'Vinh'];
    const tenNu = ['Anh', 'Bình', 'Chi', 'Dung', 'Hà', 'Hằng', 'Hoa', 'Hương', 'Huyền', 'Linh', 'Mai', 'Nga', 'Ngân', 'Nhi', 'Nhung', 'Phương', 'Quyên', 'Quỳnh', 'Thảo', 'Trang', 'Tuyết', 'Vân', 'Yến'];

    const majorList = ['cntt', 'attt', 'hthong_tt', 'kdqt', 'logistics', 'tmdt'];
    const majorClassSuffix = { cntt: 'CNTT', attt: 'ATTT', hthong_tt: 'HTTT', kdqt: 'KDQT', logistics: 'LOG', tmdt: 'TMDT' };
    const cohortYears = ['2025-09-05', '2024-09-05', '2023-09-05', '2022-09-05']; // Năm 1, Năm 2, Năm 3, Năm 4
    const cohortPrefixes = ['D25', 'D24', 'D23', 'D22'];

    const generatedUsers = [];
    const generatedStudents = [];

    for (let i = 4; i <= 303; i++) {
      const idxStr = String(i).padStart(4, '0');
      const msv = `2410${idxStr}`;
      const userId = 200 + i;
      const isMale = (i % 2 === 0);
      const gender = isMale ? 'Nam' : 'Nữ';
      
      const ho = hoList[i % hoList.length];
      const dem = isMale ? demNam[i % demNam.length] : demNu[i % demNu.length];
      const ten = isMale ? tenNam[i % tenNam.length] : tenNu[i % tenNu.length];
      const fullName = `${ho} ${dem} ${ten}`;

      const cohortIdx = i % 4; // Chia đều thành 4 năm học
      const enrollmentDate = cohortYears[cohortIdx];
      const enrollYear = parseInt(enrollmentDate.split('-')[0], 10);
      const birthYear = enrollYear - 18; // Năm 4 (2022) -> sinh 2004; Năm 3 (2023) -> sinh 2005; Năm 2 (2024) -> sinh 2006; Năm 1 (2025) -> sinh 2007

      const month = String((i % 12) + 1).padStart(2, '0');
      const day = String((i % 28) + 1).padStart(2, '0');
      const dob = `${birthYear}-${month}-${day}`;

      const majorId = majorList[i % majorList.length];
      const classCode = `${cohortPrefixes[cohortIdx]}${majorClassSuffix[majorId]}${(i % 2) + 1}`;
      const email = `sv${idxStr}@student.pka.edu.vn`;

      generatedUsers.push({
        id: userId,
        username: `${msv}@pka.edu.vn`,
        password: msv,
        role: 'student'
      });

      generatedStudents.push({
        id: msv,
        name: fullName,
        gender,
        dob,
        email,
        enrollmentDate,
        majorId,
        class: classCode,
        status: (i === 15 || i === 28 || i === 115 || i === 188) ? 'warning_1' : (i === 42 || i === 242 ? 'warning_2' : 'active'),
        userId
      });
    }

    // --- 4. Tạo Tài khoản Users ---
    // Mật khẩu đầu vào mẫu sẽ được băm trước khi lưu.
    const users = [
      { id: 1, username: 'admin@pka.edu.vn', password: '12345678', role: 'admin' },
      { id: 2, username: 'pdt@pka.edu.vn', password: '12345678', role: 'pdt' },
      
      // Giảng viên (Định dạng PE20220117@pka.edu.vn)
      { id: 10, username: 'PE20220117@pka.edu.vn', password: '12345678', role: 'lecturer' },
      { id: 11, username: 'PE20220118@pka.edu.vn', password: '12345678', role: 'lecturer' },
      { id: 12, username: 'PE20220119@pka.edu.vn', password: '12345678', role: 'lecturer' },
      
      // Sinh viên mẫu ban đầu
      { id: 20, username: '24100001@pka.edu.vn', password: '24100001', role: 'student' },
      { id: 21, username: '24100002@pka.edu.vn', password: '24100002', role: 'student' },
      { id: 22, username: '24100003@pka.edu.vn', password: '24100003', role: 'student' },
      ...generatedUsers
    ];
    for (const user of users) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    await User.bulkCreate(users, { ignoreDuplicates: true });

    // Đồng bộ lại Username & Mật khẩu cho DB hiện có
    for (let u of users) {
      const existingUser = await User.findByPk(u.id);
      if (existingUser) {
        existingUser.username = u.username;
        existingUser.password = u.password;
        await existingUser.save();
      }
    }

    // --- 5. Tạo Giảng viên ---
    const lecturers = [
      { id: 'PE20220117', name: 'Nguyễn Văn Hùng', gender: 'Nam', dob: '1980-05-15', startDate: '2010-09-01', position: 'Giảng viên cơ hữu', departmentId: 'CNTT', mainSubject: 'Cấu trúc dữ liệu và giải thuật', userId: 10 },
      { id: 'PE20220118', name: 'Trần Thị Mai', gender: 'Nữ', dob: '1985-11-20', startDate: '2012-03-01', position: 'Phó Trưởng khoa', departmentId: 'CNTT', mainSubject: 'Lập trình Web', userId: 11 },
      { id: 'PE20220119', name: 'Lê Hoàng Nam', gender: 'Nam', dob: '1978-08-10', startDate: '2008-09-01', position: 'Trưởng bộ môn', departmentId: 'KT', mainSubject: 'Kinh tế vi mô', userId: 12 }
    ];
    await Lecturer.bulkCreate(lecturers, { ignoreDuplicates: true });

    // Đồng bộ lại Mã giảng viên trong DB nếu đã tồn tại
    for (let lec of lecturers) {
      const existingLec = await Lecturer.findOne({ where: { userId: lec.userId } });
      if (existingLec && existingLec.id !== lec.id) {
        await Lecturer.destroy({ where: { userId: lec.userId } });
        await Lecturer.create(lec);
      }
    }

    // --- 6. Tạo Sinh viên ---
    const students = [
      { id: '24100001', name: 'Phạm Minh Khoa', gender: 'Nam', dob: '2004-02-14', email: 'sv001@student.pka.edu.vn', enrollmentDate: '2022-09-05', majorId: 'cntt', class: 'D22CNTT1', status: 'active', userId: 20 },
      { id: '24100002', name: 'Lê Minh Anh', gender: 'Nữ', dob: '2006-07-22', email: 'sv002@student.pka.edu.vn', enrollmentDate: '2024-09-05', majorId: 'attt', class: 'D24ATTT1', status: 'active', userId: 21 },
      { id: '24100003', name: 'Đỗ Quốc Việt', gender: 'Nam', dob: '2005-10-05', email: 'sv003@student.pka.edu.vn', enrollmentDate: '2023-09-05', majorId: 'kdqt', class: 'D23KDQT1', status: 'warning_1', userId: 22 },
      ...generatedStudents
    ];
    await Student.bulkCreate(students, { ignoreDuplicates: true });

    // Đồng bộ lại Ngày nhập học, Ngày sinh (dob) và Lớp học cho toàn bộ sinh viên trong DB
    for (let st of students) {
      const existingSt = await Student.findByPk(st.id);
      if (existingSt) {
        existingSt.enrollmentDate = st.enrollmentDate;
        existingSt.dob = st.dob;
        existingSt.class = st.class;
        await existingSt.save();
      }
    }

    // --- 7. Tạo các Lớp học phần (Classes) đa dạng thời gian cho Học kỳ "HK1-2026" ---
    const roomList = ['A101', 'A102', 'A201', 'A202', 'B101', 'B102', 'B201', 'B202', 'Lab101', 'Lab102', 'Lab201', 'Lab202'];
    const shiftConfigs = [
      { shift: 'morning', startSlot: 1, numSlots: 3 },
      { shift: 'morning', startSlot: 4, numSlots: 3 },
      { shift: 'afternoon', startSlot: 7, numSlots: 3 },
      { shift: 'afternoon', startSlot: 10, numSlots: 3 }
    ];
    const lecturerIds = ['PE20220117', 'PE20220118', 'PE20220119'];

    let globalClassIndex = 0;
    const classes = [];

    for (let crs of courses) {
      // Mỗi môn học tạo 2 đến 3 lớp học phần (L01, L02, L03) ở các ca, thứ và phòng học khác nhau
      const numClassesForCourse = (crs.id.startsWith('MLN') || crs.id.startsWith('MAT') || crs.id.startsWith('ENG') || crs.id.startsWith('INT1') || crs.id.startsWith('ECO1')) ? 3 : 2;

      for (let l = 1; l <= numClassesForCourse; l++) {
        const classId = `${crs.id}_L${String(l).padStart(2, '0')}`;
        const dayOfWeek = (globalClassIndex % 6) + 2; // Thứ 2 đến Thứ 7
        const shiftCfg = shiftConfigs[globalClassIndex % shiftConfigs.length];
        const roomName = roomList[globalClassIndex % roomList.length];
        const lecturerId = lecturerIds[globalClassIndex % lecturerIds.length];
        const isLab = crs.name.toLowerCase().includes('lập trình') || crs.name.toLowerCase().includes('thí nghiệm') || crs.name.toLowerCase().includes('lab') || crs.name.toLowerCase().includes('cơ sở dữ liệu');

        classes.push({
          id: classId,
          courseId: crs.id,
          lecturerId,
          roomName: isLab ? roomName.replace('A', 'Lab').replace('B', 'Lab') : roomName,
          roomType: isLab ? 'lab' : 'theory',
          capacity: 40,
          semester: 'HK1-2026',
          dayOfWeek,
          shift: shiftCfg.shift,
          startSlot: shiftCfg.startSlot,
          numSlots: shiftCfg.numSlots,
          status: 'active'
        });

        globalClassIndex++;
      }
    }

    await Class.bulkCreate(classes, { updateOnDuplicate: ['courseId', 'lecturerId', 'roomName', 'roomType', 'capacity', 'semester', 'dayOfWeek', 'shift', 'startSlot', 'numSlots', 'status'] });

    // Đồng bộ lại lecturerId cho các Lớp học phần
    for (let c of classes) {
      const cls = await Class.findByPk(c.id);
      if (cls) {
        cls.lecturerId = c.lecturerId;
        await cls.save();
      }
    }

    // Bổ sung giảng viên và cân bằng lại: mỗi người phụ trách 2-3 học phần,
    // có thể dạy nhiều lớp của các học phần đó và không bị trùng lịch.
    await rebalanceLecturerWorkloads({ semester: 'HK1-2026' });

    // --- 8. Tạo dữ liệu điểm quá khứ để tính CPA ---
    // Ví dụ sinh viên SV001 đã học xong Triết học (đạt A) và Toán cao cấp A1 (đạt B) ở kỳ trước
    const pastGrades = [
      { studentId: '24100001', courseId: 'MLN101', classId: null, attendanceGrade: 10, midtermGrade: 9, finalGrade: 9, total10: 9.1, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100001', courseId: 'MAT101', classId: null, attendanceGrade: 8, midtermGrade: 7, finalGrade: 7.5, total10: 7.4, letterGrade: 'B', grade4: 3.0, isLocked: true },
      
      // === Sinh viên 24100002 (Lê Minh Anh - Năm 2): Điểm đầy đủ Học kỳ 1 & 2 Năm 1 ===
      // HK1 Năm 1 (18 tín chỉ)
      { studentId: '24100002', courseId: 'MLN101', classId: null, attendanceGrade: 10, midtermGrade: 8.5, finalGrade: 9.0, total10: 8.95, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'MAT101', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 8.0, total10: 8.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'ENG101', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 7.5, total10: 7.80, letterGrade: 'B+', grade4: 3.5, isLocked: true },
      { studentId: '24100002', courseId: 'TC01',   classId: null, attendanceGrade: 10, midtermGrade: 9.0, finalGrade: 9.0, total10: 9.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'QP01',   classId: null, attendanceGrade: 10, midtermGrade: 8.5, finalGrade: 8.5, total10: 8.65, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'INT101', classId: null, attendanceGrade: 9, midtermGrade: 8.5, finalGrade: 8.5, total10: 8.55, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'INT102', classId: null, attendanceGrade: 8.5, midtermGrade: 8.0, finalGrade: 7.5, total10: 7.75, letterGrade: 'B+', grade4: 3.5, isLocked: true },

      // HK2 Năm 1 (19 tín chỉ)
      { studentId: '24100002', courseId: 'MLN102', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 8.0, total10: 8.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'MAT102', classId: null, attendanceGrade: 8.5, midtermGrade: 7.5, finalGrade: 7.5, total10: 7.60, letterGrade: 'B+', grade4: 3.5, isLocked: true },
      { studentId: '24100002', courseId: 'ENG102', classId: null, attendanceGrade: 9, midtermGrade: 8.0, finalGrade: 8.0, total10: 8.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'PHY101', classId: null, attendanceGrade: 8, midtermGrade: 7.0, finalGrade: 7.0, total10: 7.10, letterGrade: 'B', grade4: 3.0, isLocked: true },
      { studentId: '24100002', courseId: 'TC02',   classId: null, attendanceGrade: 10, midtermGrade: 9.0, finalGrade: 9.0, total10: 9.10, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'INT103', classId: null, attendanceGrade: 9.5, midtermGrade: 9.0, finalGrade: 8.5, total10: 8.75, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'INT104', classId: null, attendanceGrade: 9, midtermGrade: 8.5, finalGrade: 8.0, total10: 8.25, letterGrade: 'A', grade4: 4.0, isLocked: true },
      { studentId: '24100002', courseId: 'INT106', classId: null, attendanceGrade: 9.5, midtermGrade: 9.0, finalGrade: 9.0, total10: 9.05, letterGrade: 'A', grade4: 4.0, isLocked: true },

      // Sinh viên 3 bị trượt Kỹ thuật lập trình kỳ trước nên phải học lại
      { studentId: '24100003', courseId: 'INT103', classId: null, attendanceGrade: 5, midtermGrade: 4, finalGrade: 3, total10: 3.5, letterGrade: 'F', grade4: 0.0, isLocked: true }
    ];
    for (let pg of pastGrades) {
      const exists = await Grade.findOne({ where: { studentId: pg.studentId, courseId: pg.courseId } });
      if (!exists) {
        await Grade.create(pg);
      }
    }

    // --- 9. Đăng ký trước một số môn để kiểm thử (ví dụ SV001 đã đăng ký Kỹ thuật lập trình và CSDL) ---
    const regs = [
      { studentId: '24100001', classId: 'INT103_L01', status: 'enrolled', type: 'regular' },
      { studentId: '24100001', classId: 'INT106_L01', status: 'enrolled', type: 'regular' }
    ];
    await Registration.bulkCreate(regs, { ignoreDuplicates: true });

    // --- 10. Tạo hóa đơn học phí mẫu cho SV001 dựa trên số môn đã đăng ký ---
    // INT103 (3TC) + INT106 (3TC) = 6TC * 1.000đ = 6.000 VNĐ
    const payments = [
      { studentId: '24100001', semester: 'HK1-2026', amount: 6000, discountRate: 0.0, finalAmount: 6000, status: 'unpaid', deadline: '2027-02-28' },
      { studentId: '24100003', semester: 'HK1-2026', amount: 0, discountRate: 0.0, finalAmount: 0, status: 'paid', deadline: '2027-02-28' }
    ];
    await Payment.bulkCreate(payments, { ignoreDuplicates: true });

    // Đồng bộ lại trạng thái hóa đơn: nếu finalAmount > 0 nhưng paid mà không có giao dịch thực tế -> reset về unpaid
    // (xảy ra khi sinh viên đăng ký môn sau khi đã được auto-paid do học phí = 0)
    const { Op } = await import('sequelize');
    await Payment.update(
      { status: 'unpaid' },
      {
        where: {
          status: 'paid',
          finalAmount: { [Op.gt]: 0 },
          transactionId: null,
          paidAt: null
        }
      }
    );

    await seedPastGrades().catch(e => {});
    await seedAllStudentAcademicResults();
    console.log('✅ Mock data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
  }
}
