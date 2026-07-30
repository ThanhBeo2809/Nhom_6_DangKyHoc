import express from 'express';
import ExcelJS from 'exceljs';
import { sequelize, Class, Course, Lecturer, Registration, Student, Grade, Payment, AuditLog, Major } from '../models/index.js';
import { Op } from 'sequelize';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { updateTuition } from '../utils/tuitionHelper.js';
import { calculateAcademicProgress } from '../utils/studentAcademicHelper.js';

const router = express.Router();

// Áp dụng middleware bảo mật JWT và Phân quyền Sinh viên cho toàn bộ router
router.use(authenticateToken, authorizeRoles('student'));

// Helper: Lấy thông tin Student từ JWT Token (req.user)
async function getStudentFromReq(req, res) {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
        res.status(401).json({ message: 'Chưa đăng nhập.' });
        return null;
    }
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        res.status(403).json({ message: 'Không tìm thấy hồ sơ sinh viên tương ứng.' });
        return null;
    }
    return student;
}

// Helper: Kiểm tra môn học có thuộc Ngành (Đại cương, Cơ sở ngành, Chuyên ngành) của Sinh viên hay không
function isCourseBelongsToStudentMajor(course, studentMajorId) {
    if (!course || !studentMajorId) return false;

    const mId = String(studentMajorId).trim().toLowerCase();
    const cMajorId = course.majorId ? String(course.majorId).trim().toLowerCase() : null;
    const courseId = String(course.id).trim().toUpperCase();

    // 1. Môn Đại cương dùng chung toàn trường (MLN, HCM, LSD, MAT, STA, PHY, ENG, TC, QP)
    const isGeneralSubject = courseId.startsWith('MLN') ||
        courseId.startsWith('HCM') ||
        courseId.startsWith('LSD') ||
        courseId.startsWith('MAT') ||
        courseId.startsWith('STA') ||
        courseId.startsWith('PHY') ||
        courseId.startsWith('ENG') ||
        courseId.startsWith('TC') ||
        courseId.startsWith('QP');

    if (isGeneralSubject) {
        return true;
    }

    // 2. Khối các ngành thuộc Khoa CNTT (cntt, attt, hthong_tt)
    const isITGroupStudent = ['cntt', 'attt', 'hthong_tt'].includes(mId);
    if (isITGroupStudent) {
        // Môn Cơ sở ngành CNTT (INT101 -> INT118) dùng chung cho Khoa CNTT
        if (courseId.startsWith('INT1')) return true;

        // Môn Chuyên ngành cụ thể của từng ngành thuộc Khoa CNTT
        if (mId === 'cntt' && courseId.startsWith('INT2')) return true;
        if (mId === 'attt' && courseId.startsWith('SEC')) return true;
        if (mId === 'hthong_tt' && courseId.startsWith('MIS')) return true;

        return false;
    }

    // 3. Khối các ngành thuộc Khoa Kinh tế (kdqt, logistics, tmdt)
    const isEcoGroupStudent = ['kdqt', 'logistics', 'tmdt'].includes(mId);
    if (isEcoGroupStudent) {
        // Môn Cơ sở ngành Kinh tế (ECO101 -> ECO118) dùng chung cho Khoa Kinh tế
        if (courseId.startsWith('ECO1')) return true;

        // Môn Chuyên ngành cụ thể của từng ngành thuộc Khoa Kinh tế
        if (mId === 'kdqt' && courseId.startsWith('ECO2')) return true;
        if (mId === 'logistics' && courseId.startsWith('LOG')) return true;
        if (mId === 'tmdt' && courseId.startsWith('ECOM')) return true;

        return false;
    }

    // 4. Khớp trực tiếp theo majorId đối với các trường hợp khác
    if (cMajorId === mId) return true;

    return false;
}

// 1. Danh sách lớp học phần đang mở để đăng ký
router.get('/courses/available', async (req, res) => {
    try {
        const student = await getStudentFromReq(req, res);
        if (!student) return;

        // Lấy học kỳ hiện tại đang mở lớp (mặc định HK1-2025)
        const semester = 'HK1-2025';

        // Tính toán tiến độ học tập hiện tại của sinh viên (Ví dụ: SV 2024 -> Học kỳ 3 (Kỳ 1 Năm 2))
        const progress = calculateAcademicProgress(student.enrollmentDate, semester);
        const studentTerm = progress.semesterOrdinal;

        // Lấy danh sách lớp học phần trong kỳ kèm thông tin môn học, ngành và giảng viên
        const classes = await Class.findAll({
            where: { semester, status: 'active' },
            include: [
                {
                    model: Course,
                    include: [{ model: Major }]
                },
                { model: Lecturer }
            ]
        });

        // Lọc và chỉ giữ lại các lớp học phần thuộc Ngành và Lộ trình học kỳ hiện tại của sinh viên (hoặc học lại)
        const classStats = [];
        for (let c of classes) {
            const course = c.Course;

            // 1. Kiểm tra xem môn học này có thuộc Ngành (Đại cương / Cơ sở ngành / Chuyên ngành) của sinh viên không
            if (!isCourseBelongsToStudentMajor(course, student.majorId)) {
                continue; // Bỏ qua nếu môn học không thuộc ngành học của sinh viên
            }

            // 2. Xác định loại đăng ký (Mới, Học lại do điểm F, Học cải thiện)
            let regType = 'new';
            const pastGrades = await Grade.findAll({
                where: { studentId: student.id, courseId: course.id, isLocked: true }
            });
            if (pastGrades.length > 0) {
                const hasFailed = pastGrades.some(g => g.letterGrade === 'F');
                const hasPassed = pastGrades.some(g => g.letterGrade !== 'F');
                if (hasFailed && !hasPassed) {
                    regType = 'retake';
                } else if (hasPassed) {
                    regType = 'improve';
                }
            }

            // 3. Lọc theo Lộ trình Học kỳ (term):
            // Chỉ hiển thị môn học ứng với học kỳ lộ trình hiện tại của sinh viên (course.term === studentTerm)
            // HOẶC môn sinh viên phải học lại do bị điểm F (regType === 'retake')
            const courseTerm = course ? (course.term || 1) : 1;
            if (courseTerm !== studentTerm && regType !== 'retake') {
                continue;
            }

            const enrolledCount = await Registration.count({
                where: { classId: c.id, status: 'enrolled' }
            });
            const waitlistCount = await Registration.count({
                where: { classId: c.id, status: 'waitlist' }
            });

            // Lấy thông tin đăng ký của sinh viên hiện tại đối với lớp này (nếu có)
            const myReg = await Registration.findOne({
                where: { classId: c.id, studentId: student.id }
            });

            // Kiểm tra thông tin môn học tiên quyết (nếu có)
            let prereqInfo = null;
            if (course && course.prerequisiteId) {
                const prereqCourse = await Course.findByPk(course.prerequisiteId);
                const prereqPassed = await Grade.findOne({
                    where: {
                        studentId: student.id,
                        courseId: course.prerequisiteId,
                        letterGrade: { [Op.ne]: 'F' },
                        isLocked: true
                    }
                });
                prereqInfo = {
                    requiredId: course.prerequisiteId,
                    requiredName: prereqCourse ? prereqCourse.name : course.prerequisiteId,
                    isPassed: !!prereqPassed
                };
            }

            const courseId = course ? String(course.id).toUpperCase() : '';
            const isGeneral = courseId.startsWith('MLN') || courseId.startsWith('HCM') ||
                courseId.startsWith('LSD') || courseId.startsWith('MAT') ||
                courseId.startsWith('STA') || courseId.startsWith('PHY') ||
                courseId.startsWith('ENG') || courseId.startsWith('TC') || courseId.startsWith('QP');

            let courseMajorName = 'Cơ sở ngành';
            if (isGeneral) {
                courseMajorName = 'Đại cương';
            } else if (courseId.startsWith('INT1')) {
                courseMajorName = 'Cơ sở ngành CNTT';
            } else if (courseId.startsWith('ECO1')) {
                courseMajorName = 'Cơ sở ngành Kinh tế';
            } else if (course && course.Major && course.Major.name) {
                courseMajorName = `Chuyên ngành ${course.Major.name}`;
            }

            classStats.push({
                classInfo: c,
                enrolledCount,
                waitlistCount,
                myStatus: myReg ? myReg.status : null,
                belongsToMajor: true,
                isGeneral,
                courseMajorId: course ? course.majorId : null,
                courseMajorName,
                studentMajorId: student.majorId,
                term: courseTerm,
                studentTerm,
                regType,
                prereqInfo
            });
        }

        return res.json(classStats);
    } catch (error) {
        console.error('Lỗi lấy danh sách đăng ký:', error);
        return res.status(500).json({ message: 'Lỗi server.' });
    }
});
