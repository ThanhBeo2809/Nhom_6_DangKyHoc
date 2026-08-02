import express from 'express';
import ExcelJS from 'exceljs';
import {
  sequelize, Class, Course, Lecturer, Registration, Student, Grade,
  Payment, PaymentTransaction, AuditLog, Major
} from '../models/index.js';
import { Op, col, fn } from 'sequelize';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { updateTuition, COST_PER_CREDIT } from '../utils/tuitionHelper.js';
import { calculateAcademicProgress } from '../utils/studentAcademicHelper.js';
import { assertRegistrationOpen, getCurrentSemester, getRegistrationWindow } from '../utils/academicTermHelper.js';
import { createNotification } from '../utils/notificationHelper.js';
import {
  classifyRegistrationType,
  findCourseRegistration,
  getRegistrationTypePriority
} from '../utils/registrationHelper.js';
import { getRegistrationPolicy } from '../utils/academicStandingHelper.js';
import { paymentWithBalance } from '../utils/paymentBalanceHelper.js';
import {
  getEligibleReEvaluationTerm,
  isCourseEligibleForReEvaluation,
  normalizeReEvaluationReason
} from '../utils/reEvaluationHelper.js';

const router = express.Router();

// Áp dụng middleware bảo mật JWT và Phân quyền Sinh viên cho toàn bộ router
router.use(authenticateToken, authorizeRoles('student'));

router.get('/registration-status', async (req, res) => {
  try {
    const semester = await getCurrentSemester();
    const window = await getRegistrationWindow(semester);
    return res.json({
      semester,
      isOpen: window.isOpen,
      period: window.period,
      nextPeriod: window.nextPeriod
    });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải trạng thái cổng đăng ký.' });
  }
});

// Helper: Lấy thông tin Student từ JWT Token (req.user)
async function getStudentFromReq(req, res, queryOptions = {}) {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    res.status(401).json({ message: 'Chưa đăng nhập.' });
    return null;
  }
  const student = await Student.findOne({ where: { userId }, ...queryOptions });
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
                           courseId.startsWith('TC')  ||
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

    // Lấy học kỳ hiện tại đang mở lớp (mặc định HK1-2026)
    const semester = await getCurrentSemester();

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

    // Một sinh viên chỉ được giữ một đăng ký (chính thức hoặc hàng chờ)
    // cho mỗi môn trong cùng học kỳ, bất kể môn đó mở bao nhiêu lớp.
    const semesterRegistrations = await Registration.findAll({
      where: { studentId: student.id },
      include: [{
        model: Class,
        required: true,
        where: { semester },
        attributes: ['id', 'courseId']
      }]
    });

    // Nạp trước dữ liệu dùng chung để số truy vấn không tăng theo 921 lớp.
    const lockedGrades = await Grade.findAll({
      where: { studentId: student.id, isLocked: true }
    });
    const gradesByCourse = new Map();
    for (const grade of lockedGrades) {
      if (!gradesByCourse.has(grade.courseId)) {
        gradesByCourse.set(grade.courseId, []);
      }
      gradesByCourse.get(grade.courseId).push(grade);
    }

    const classIds = classes.map(classInfo => classInfo.id);
    const registrationCounts = classIds.length > 0
      ? await Registration.findAll({
        where: { classId: { [Op.in]: classIds } },
        attributes: [
          'classId',
          'status',
          [fn('COUNT', col('Registration.id')), 'count']
        ],
        group: ['classId', 'status'],
        raw: true
      })
      : [];
    const countByClassAndStatus = new Map(
      registrationCounts.map(item => [
        `${item.classId}:${item.status}`,
        Number(item.count)
      ])
    );

    const prerequisiteIds = [...new Set(
      classes
        .map(classInfo => classInfo.Course?.prerequisiteId)
        .filter(Boolean)
    )];
    const prerequisiteCourses = prerequisiteIds.length > 0
      ? await Course.findAll({
        where: { id: { [Op.in]: prerequisiteIds } },
        attributes: ['id', 'name']
      })
      : [];
    const prerequisiteCourseById = new Map(
      prerequisiteCourses.map(course => [course.id, course])
    );

    // Lọc và chỉ giữ lại các lớp học phần thuộc Ngành và Lộ trình học kỳ hiện tại của sinh viên (hoặc học lại)
    const classStats = [];
    for (let c of classes) {
      const course = c.Course;
      
      // 1. Xác định loại đăng ký từ lịch sử điểm đã khóa.
      const pastGrades = gradesByCourse.get(course.id) || [];
      const regType = classifyRegistrationType(pastGrades);
      const isHistoricalRegistration = regType === 'retake' || regType === 'improve';

      // 2. Môn học mới phải thuộc chương trình của ngành. Nếu sinh viên đã
      // từng học môn này thì lịch sử điểm hợp lệ cho phép học lại/nâng điểm,
      // kể cả sau khi chuyển ngành hoặc dữ liệu chương trình đã thay đổi.
      if (!isHistoricalRegistration &&
          !isCourseBelongsToStudentMajor(course, student.majorId)) {
        continue;
      }

      // 3. Lọc theo Lộ trình Học kỳ (term):
      // Môn mới theo đúng lộ trình; môn đã học được mở lại để học lại/nâng điểm.
      const courseTerm = course ? (course.term || 1) : 1;
      if (courseTerm !== studentTerm && !isHistoricalRegistration) {
        continue;
      }

      const enrolledCount = countByClassAndStatus.get(`${c.id}:enrolled`) || 0;
      const waitlistCount = countByClassAndStatus.get(`${c.id}:waitlist`) || 0;

      // Tìm cả đăng ký đúng lớp hiện tại và đăng ký ở lớp khác của cùng môn.
      const courseRegistration = semesterRegistrations.find(
        registration => registration.Class?.courseId === course.id
      );
      const myReg = semesterRegistrations.find(
        registration => registration.classId === c.id
      );

      // Kiểm tra thông tin môn học tiên quyết (nếu có)
      let prereqInfo = null;
      if (course && course.prerequisiteId) {
        const prereqCourse = prerequisiteCourseById.get(course.prerequisiteId);
        const prereqPassed = (gradesByCourse.get(course.prerequisiteId) || [])
          .some(grade => grade.letterGrade && grade.letterGrade !== 'F');
        prereqInfo = {
          requiredId: course.prerequisiteId,
          requiredName: prereqCourse ? prereqCourse.name : course.prerequisiteId,
          isPassed: prereqPassed
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
        registeredClassId: courseRegistration ? courseRegistration.classId : null,
        registeredStatus: courseRegistration ? courseRegistration.status : null,
        belongsToMajor: true,
        isGeneral,
        courseMajorId: course ? course.majorId : null,
        courseMajorName,
        studentMajorId: student.majorId,
        term: courseTerm,
        studentTerm,
        regType,
        registrationPriority: getRegistrationTypePriority(regType),
        prereqInfo
      });
    }

    classStats.sort((left, right) => {
      const priorityDifference = left.registrationPriority - right.registrationPriority;
      if (priorityDifference !== 0) return priorityDifference;

      const leftCourseId = String(left.classInfo?.Course?.id || left.classInfo?.courseId || '');
      const rightCourseId = String(right.classInfo?.Course?.id || right.classInfo?.courseId || '');
      const courseDifference = leftCourseId.localeCompare(rightCourseId, 'vi');
      if (courseDifference !== 0) return courseDifference;

      return String(left.classInfo?.id || '').localeCompare(
        String(right.classInfo?.id || ''),
        'vi'
      );
    });

    return res.json(classStats);
  } catch (error) {
    console.error('Lỗi lấy danh sách đăng ký:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 2. Đăng ký học phần (sử dụng Transaction)
router.post('/register', async (req, res) => {
  const { classId } = req.body;
  const t = await sequelize.transaction();

  try {
    // Khóa hồ sơ sinh viên trong transaction. Nhờ đó hai yêu cầu đồng thời
    // chọn hai lớp khác nhau của cùng môn sẽ được xử lý tuần tự.
    const student = await getStudentFromReq(req, res, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!student) {
      await t.rollback();
      return;
    }

    const registrationPolicy = getRegistrationPolicy(student.status);
    if (!registrationPolicy.canRegister) {
      await t.rollback();
      return res.status(403).json({
        message: 'Không thể đăng ký học phần vì hồ sơ sinh viên đang ở trạng thái buộc thôi học.'
      });
    }

    const cls = await Class.findByPk(classId, { 
      include: [Course], 
      transaction: t,
      lock: t.LOCK.UPDATE 
    });
    if (!cls || cls.status === 'canceled') {
      await t.rollback();
      return res.status(404).json({ message: 'Lớp học phần không tồn tại hoặc đã bị hủy.' });
    }

    const semester = cls.semester;
    await assertRegistrationOpen(semester, { transaction: t });

    // A. Kiểm tra xem đã đăng ký lớp này chưa
    const existingReg = await Registration.findOne({
      where: { studentId: student.id, classId },
      transaction: t
    });
    if (existingReg) {
      await t.rollback();
      return res.status(400).json({ message: 'Bạn đã đăng ký lớp học phần này rồi.' });
    }

    const course = cls.Course;

    // Không cho phép giữ hai lớp (kể cả hàng chờ) của cùng một môn trong
    // cùng học kỳ. Kiểm tra theo courseId thay vì chỉ theo classId.
    const existingCourseRegistration = await findCourseRegistration(
      student.id,
      course.id,
      semester,
      {
        transaction: t,
        lock: t.LOCK.UPDATE
      }
    );

    if (existingCourseRegistration) {
      await t.rollback();
      const statusText = existingCourseRegistration.status === 'waitlist'
        ? 'đang ở hàng chờ'
        : 'đã đăng ký';
      return res.status(409).json({
        message: `Bạn ${statusText} lớp ${existingCourseRegistration.classId} của môn ${course.name}. Mỗi môn chỉ được chọn một lớp trong cùng học kỳ.`,
        code: 'COURSE_ALREADY_REGISTERED',
        registeredClassId: existingCourseRegistration.classId
      });
    }

    const pastGrades = await Grade.findAll({
      where: { studentId: student.id, courseId: course.id, isLocked: true },
      transaction: t
    });
    const academicRegistrationType = classifyRegistrationType(pastGrades);
    const isRetake = academicRegistrationType === 'retake';
    const isImprove = academicRegistrationType === 'improve';
    const isHistoricalRegistration = isRetake || isImprove;

    // Môn mới phải thuộc ngành; lịch sử điểm đã khóa là căn cứ hợp lệ để
    // đăng ký học lại hoặc nâng điểm đối với môn từng học.
    if (!isHistoricalRegistration &&
        !isCourseBelongsToStudentMajor(course, student.majorId)) {
      await t.rollback();
      return res.status(400).json({ message: 'Môn học này không thuộc chương trình đào tạo của ngành bạn đang học.' });
    }

    // Môn học mới phải đúng lộ trình; học lại/nâng điểm được phép lệch kỳ.
    const progress = calculateAcademicProgress(student.enrollmentDate, semester);
    const studentTerm = progress.semesterOrdinal;
    const courseTerm = course ? (course.term || 1) : 1;

    if (courseTerm !== studentTerm && !isHistoricalRegistration) {
      await t.rollback();
      return res.status(400).json({
        message: `Môn học này thuộc Lộ trình Học kỳ ${courseTerm}, không dành cho Học kỳ ${studentTerm} hiện tại của bạn.`
      });
    }

    // B. Kiểm tra điều kiện môn tiên quyết
    // Sinh viên đã có kết quả của chính môn học này không cần kiểm tra lại
    // tiên quyết khi học lại hoặc nâng điểm.
    if (course.prerequisiteId && !isHistoricalRegistration) {
      const prereqPassed = await Grade.findOne({
        where: {
          studentId: student.id,
          courseId: course.prerequisiteId,
          letterGrade: { [Op.ne]: 'F' }, // Đã qua môn (khác điểm F)
          isLocked: true
        },
        transaction: t
      });

      if (!prereqPassed) {
        await t.rollback();
        return res.status(400).json({
          message: `Không đủ điều kiện đăng ký! Bạn phải hoàn thành môn tiên quyết: ${course.prerequisiteId} trước.`
        });
      }
    }

    // C. Kiểm tra giới hạn Tín chỉ và Trùng thời khóa biểu
    const myRegs = await Registration.findAll({
      where: { studentId: student.id, status: 'enrolled' },
      include: [{ model: Class, where: { semester, status: 'active' }, include: [Course] }],
      transaction: t
    });

    let currentCredits = 0;
    for (let r of myRegs) {
      if (r.Class && r.Class.Course) {
        currentCredits += r.Class.Course.credits;
      }
      const regClass = r.Class;
      if (regClass.dayOfWeek === cls.dayOfWeek && regClass.shift === cls.shift) {
        // Kiểm tra xem tiết học có bị giao nhau (overlap) không
        const start1 = cls.startSlot;
        const end1 = cls.startSlot + cls.numSlots;
        const start2 = regClass.startSlot;
        const end2 = regClass.startSlot + regClass.numSlots;

        if (start1 < end2 && start2 < end1) {
          await t.rollback();
          return res.status(400).json({
            message: `Trùng lịch học! Trùng ca học với lớp ${regClass.id} (${regClass.roomName}) vào thứ ${cls.dayOfWeek}.`
          });
        }
      }
    }

    // Kiểm tra giới hạn tín chỉ tối đa cho phép trong học kỳ
    const isWarning = student.status === 'warning_1' || student.status === 'warning_2';
    const maxAllowedCredits = registrationPolicy.maxCredits;

    if (currentCredits + course.credits > maxAllowedCredits) {
      await t.rollback();
      return res.status(400).json({
        message: `Không thể đăng ký! Vượt quá giới hạn tín chỉ học kỳ (${currentCredits + course.credits}/${maxAllowedCredits} tín chỉ). ${isWarning ? 'Sinh viên bị Cảnh báo học vụ bị giới hạn tối đa 12 TC/kỳ.' : 'Sinh viên bình thường tối đa 24 TC/kỳ.'}`
      });
    }

    // D. Kiểm tra sĩ số để xếp lớp chính thức hoặc hàng chờ
    const currentEnrolledCount = await Registration.count({
      where: { classId, status: 'enrolled' },
      transaction: t
    });

    let regStatus = 'enrolled';
    let queueOrder = null;

    if (currentEnrolledCount >= cls.capacity) {
      regStatus = 'waitlist';
      const waitlistCount = await Registration.count({
        where: { classId, status: 'waitlist' },
        transaction: t
      });
      queueOrder = waitlistCount + 1;
    }

    // E. Xác định loại đăng ký: bình thường, học lại, hay học nâng điểm
    const regType = academicRegistrationType === 'new'
      ? 'regular'
      : academicRegistrationType;

    // F. Tạo bản ghi đăng ký
    const newReg = await Registration.create({
      studentId: student.id,
      classId: cls.id,
      status: regStatus,
      type: regType,
      queueOrder
    }, { transaction: t });

    // G. Cập nhật học phí tự động (chỉ tính cho các lớp enrolled chính thức)
    await updateTuition(student.id, semester, t);

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: student.userId,
      username: student.email.split('@')[0],
      action: regStatus === 'enrolled' ? 'DANG_KY_MON' : 'XEP_HANG_CHO',
      details: JSON.stringify({ classId: cls.id, status: regStatus, type: regType }),
      ipAddress: clientIp
    }, { transaction: t });

    await t.commit();

    if (regStatus === 'waitlist') {
      return res.json({
        message: `Lớp học phần đã đầy! Bạn được đưa vào danh sách hàng chờ (Vị trí: ${queueOrder}).`,
        status: 'waitlist',
        queueOrder
      });
    }

    return res.json({ message: 'Đăng ký môn học thành công!', status: 'enrolled' });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi đăng ký lớp học phần:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Lỗi hệ thống khi đăng ký.',
      code: error.code
    });
  }
});

// 3. Hủy đăng ký môn học (Rút môn)
router.post('/unregister', async (req, res) => {
  const { classId } = req.body;
  const t = await sequelize.transaction();

  try {
    const student = await getStudentFromReq(req, res);
    if (!student) {
      await t.rollback();
      return;
    }

    const reg = await Registration.findOne({
      where: { studentId: student.id, classId },
      include: [{ model: Class }],
      transaction: t
    });

    if (!reg) {
      await t.rollback();
      return res.status(404).json({ message: 'Không tìm thấy đăng ký học phần này.' });
    }

    const semester = reg.Class.semester;
    await assertRegistrationOpen(semester, { transaction: t });
    const wasEnrolled = reg.status === 'enrolled';

    // Xóa đăng ký của sinh viên hiện tại
    await reg.destroy({ transaction: t });

    // Nếu sinh viên này đã ở trong lớp chính thức (enrolled), đôn sinh viên đầu tiên ở Waitlist lên
    if (wasEnrolled) {
      const nextInQueue = await Registration.findOne({
        where: { classId, status: 'waitlist' },
        order: [['queueOrder', 'ASC']],
        transaction: t
      });

      if (nextInQueue) {
        nextInQueue.status = 'enrolled';
        nextInQueue.queueOrder = null;
        await nextInQueue.save({ transaction: t });

        // Cập nhật học phí cho sinh viên được đôn lên
        await updateTuition(nextInQueue.studentId, semester, t);

        // Ghi Audit Log cho sinh viên được đôn lên
        await AuditLog.create({
          action: 'DON_HANG_CHO_LEN',
          details: JSON.stringify({ studentId: nextInQueue.studentId, classId }),
          ipAddress: 'Hệ thống tự động'
        }, { transaction: t });

        const promotedStudent = await Student.findByPk(nextInQueue.studentId, { transaction: t });
        await createNotification({
          userId: promotedStudent?.userId,
          type: 'registration',
          title: 'Đã được xếp vào lớp học phần',
          message: `Bạn đã được chuyển từ hàng chờ vào lớp ${classId}. Học phí đã được cập nhật.`,
          data: { classId },
          io: req.app.get('io'),
          transaction: t
        });

        // Cập nhật lại số thứ tự (queueOrder) của các sinh viên còn lại trong hàng chờ
        const remainingWaitlist = await Registration.findAll({
          where: { classId, status: 'waitlist' },
          order: [['queueOrder', 'ASC']],
          transaction: t
        });

        for (let i = 0; i < remainingWaitlist.length; i++) {
          remainingWaitlist[i].queueOrder = i + 1;
          await remainingWaitlist[i].save({ transaction: t });
        }
      }
    }

    // Cập nhật học phí cho sinh viên hủy
    await updateTuition(student.id, semester, t);

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: student.userId,
      username: student.email.split('@')[0],
      action: 'HUY_DANG_KY_MON',
      details: JSON.stringify({ classId }),
      ipAddress: clientIp
    }, { transaction: t });

    await t.commit();
    return res.json({ message: 'Hủy đăng ký môn học thành công!' });
  } catch (error) {
    await t.rollback();
    console.error('Lỗi hủy môn học:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Có lỗi xảy ra khi hủy môn học.',
      code: error.code
    });
  }
});

// 4. Lấy danh sách môn học đã đăng ký trong kỳ hiện tại
router.get('/registrations', async (req, res) => {
  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;

    const semester = await getCurrentSemester();
    const regs = await Registration.findAll({
      where: { studentId: student.id },
      include: [{
        model: Class,
        where: { semester },
        include: [Course, Lecturer]
      }]
    });

    return res.json(regs);
  } catch (error) {
    console.error('Lỗi lấy danh sách đã đăng ký:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 5. Lấy Thời khóa biểu dạng lưới học tập
router.get('/schedule', async (req, res) => {
  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;

    const semester = await getCurrentSemester();
    const regs = await Registration.findAll({
      where: { studentId: student.id, status: 'enrolled' }, // Chỉ hiện những môn đã ghi danh chính thức
      include: [{
        model: Class,
        where: { semester, status: 'active' },
        include: [Course, Lecturer]
      }]
    });

    const scheduleList = regs.map(r => ({
      classId: r.Class.id,
      courseId: r.Class.Course.id,
      courseName: r.Class.Course.name,
      credits: r.Class.Course.credits,
      lecturerName: r.Class.Lecturer.name,
      roomName: r.Class.roomName,
      roomType: r.Class.roomType,
      dayOfWeek: r.Class.dayOfWeek,
      shift: r.Class.shift,
      startSlot: r.Class.startSlot,
      numSlots: r.Class.numSlots
    }));

    return res.json(scheduleList);
  } catch (error) {
    console.error('Lỗi lấy thời khóa biểu:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 6. Xem học phí học kỳ
router.get('/tuition', async (req, res) => {
  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;

    const semester = await getCurrentSemester();
    await updateTuition(student.id, semester);
    const payment = await Payment.findOne({
      where: { studentId: student.id, semester },
      include: [{
        model: PaymentTransaction,
        separate: true,
        order: [['receivedAt', 'DESC']]
      }]
    });

    const regs = await Registration.findAll({
      where: { studentId: student.id, status: 'enrolled' },
      include: [{ model: Class, where: { semester, status: 'active' }, include: [Course] }]
    });

    const enrolledClasses = regs.map(r => ({
      classId: r.classId,
      courseId: r.Class?.Course?.id || '',
      courseName: r.Class?.Course?.name || '',
      credits: r.Class?.Course?.credits || 0,
      unitPrice: COST_PER_CREDIT,
      subtotal: (r.Class?.Course?.credits || 0) * COST_PER_CREDIT
    }));

    const totalCredits = enrolledClasses.reduce((sum, item) => sum + item.credits, 0);

    const paymentData = payment ? paymentWithBalance(payment) : {
      amount: totalCredits * COST_PER_CREDIT,
      discountRate: 0.0,
      discountReason: null,
      finalAmount: totalCredits * COST_PER_CREDIT,
      paidAmount: 0,
      remainingAmount: totalCredits * COST_PER_CREDIT,
      status: (totalCredits === 0) ? 'paid' : 'unpaid',
      deadline: '-'
    };

    return res.json({
      ...paymentData,
      costPerCredit: COST_PER_CREDIT,
      totalCredits,
      enrolledClasses
    });
  } catch (error) {
    console.error('Lỗi tra cứu học phí:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// Sinh viên chỉ được tạo/xem QR và chờ ngân hàng xác nhận.
// Không cho phép client tự gửi mã giao dịch để chuyển hóa đơn sang trạng thái paid.
router.post('/pay', async (req, res) => {
  return res.status(403).json({
    code: 'BANK_CONFIRMATION_REQUIRED',
    message: 'Hóa đơn chỉ được xác nhận sau khi ngân hàng hoặc Phòng Đào tạo đối soát giao dịch.'
  });
});

// 8. Xem bảng điểm số & Tiến độ tích lũy GPA/CPA
router.get('/grades', async (req, res) => {
  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;
    const currentSemester = await getCurrentSemester();

    // Lấy toàn bộ điểm số của sinh viên (kể cả quá khứ và kỳ này, chỉ lấy đã khóa để đảm bảo chính xác)
    const rawGrades = await Grade.findAll({
      where: { studentId: student.id, isLocked: true },
      include: [Course, { model: Class, attributes: ['id', 'semester', 'lecturerId'] }]
    });

    // Lọc loại bỏ bản ghi trùng lặp (nếu có)
    const seenKeys = new Set();
    const grades = rawGrades.filter(g => {
      const key = `${g.studentId}_${g.courseId}_${g.classId}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Gom nhóm điểm số theo kỳ để tính GPA kỳ
    const semesterMap = {};
    const highestGrades = {}; // Lưu điểm cao nhất của từng Course (dùng cho CPA)

    grades.forEach(g => {
      const sem = g.Class?.semester || 'Kỳ trước';
      
      if (!semesterMap[sem]) semesterMap[sem] = [];
      semesterMap[sem].push(g);

      // Lưu điểm cao nhất theo môn học để tính CPA tích lũy
      const courseId = g.courseId;
      if (!highestGrades[courseId] || highestGrades[courseId].grade4 < g.grade4) {
        highestGrades[courseId] = g;
      }
    });

    // 1. Tính GPA từng kỳ học
    const semestersGPA = {};
    Object.keys(semesterMap).forEach(sem => {
      let sumGradedCredits = 0;
      let sumWeight = 0;
      semesterMap[sem].forEach(g => {
        if (g.Course) {
          sumGradedCredits += g.Course.credits;
          sumWeight += g.grade4 * g.Course.credits;
        }
      });
      semestersGPA[sem] = sumGradedCredits > 0 ? parseFloat((sumWeight / sumGradedCredits).toFixed(2)) : 0;
    });

    // 2. Tính CPA tích lũy (Chỉ lấy điểm cao nhất của từng môn để loại trừ học lại/cải thiện)
    let totalCreditsCPA = 0;
    let sumWeightCPA = 0;
    let creditsCompleted = 0;

    Object.values(highestGrades).forEach(g => {
      if (g.Course) {
        totalCreditsCPA += g.Course.credits;
        sumWeightCPA += g.grade4 * g.Course.credits;
        
        // Hoàn thành môn học nếu điểm chữ khác F
        if (g.letterGrade !== 'F') {
          creditsCompleted += g.Course.credits;
        }
      }
    });

    const cpa = totalCreditsCPA > 0 ? parseFloat((sumWeightCPA / totalCreditsCPA).toFixed(2)) : 0;

    // Tổng số tín chỉ yêu cầu tốt nghiệp giả lập là 120 tín
    const totalRequiredCredits = 120;
    const progressPercent = Math.min(100, Math.round((creditsCompleted / totalRequiredCredits) * 100));

    return res.json({
      gradesDetail: grades,
      semestersGPA,
      cpa,
      creditsCompleted,
      totalRequiredCredits,
      progressPercent
    });
  } catch (error) {
    console.error('Lỗi lấy bảng điểm:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

// 9. Gửi đơn phúc khảo điểm trực tuyến
router.post('/phuc-khao', async (req, res) => {
  const { gradeId, reason } = req.body;
  let transaction;

  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;

    const normalizedReason = normalizeReEvaluationReason(reason);
    transaction = await sequelize.transaction();
    const currentSemester = await getCurrentSemester({ transaction });
    const academicProgress = calculateAcademicProgress(student.enrollmentDate, currentSemester);
    const eligibleTerm = getEligibleReEvaluationTerm(academicProgress.semesterOrdinal);

    const grade = await Grade.findOne({
      where: { id: gradeId, studentId: student.id },
      include: [
        { model: Course, required: false },
        {
          model: Class,
          required: false,
          include: [{ model: Lecturer, required: false }]
        }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!grade) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Không tìm thấy thông tin điểm số này.' });
    }

    if (!isCourseEligibleForReEvaluation(grade.Course?.term, academicProgress.semesterOrdinal)) {
      await transaction.rollback();
      return res.status(403).json({
        code: 'RE_EVALUATION_TERM_NOT_ELIGIBLE',
        message: `Học kỳ hiện tại là Học kỳ ${academicProgress.semesterOrdinal}. Chỉ được phúc khảo các môn thuộc Học kỳ ${eligibleTerm}.`
      });
    }

    if (!grade.isLocked) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Môn học chưa được giảng viên khóa điểm, không thể phúc khảo.' });
    }

    if (grade.reEvalStatus !== 'none') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Bạn đã nộp đơn phúc khảo cho môn này rồi.' });
    }

    const assignedLecturer = grade.Class?.Lecturer;
    if (!grade.classId || !assignedLecturer) {
      await transaction.rollback();
      return res.status(409).json({
        code: 'RE_EVALUATION_LECTURER_NOT_ASSIGNED',
        message: 'Kết quả này chưa gắn với lớp học phần và giảng viên phụ trách, nên chưa thể chuyển đơn phúc khảo. Vui lòng liên hệ Phòng Đào tạo để bổ sung dữ liệu lớp.'
      });
    }

    // Thay đổi trạng thái sang requested
    grade.reEvalStatus = 'requested';
    grade.reEvalNote = normalizedReason;
    await grade.save({ transaction });

    // Ghi Audit Log
    const clientIp = req.ip || req.headers['x-forwarded-for'];
    await AuditLog.create({
      userId: student.userId,
      username: student.email.split('@')[0],
      action: 'YEU_CAU_PHUC_KHAO',
      details: JSON.stringify({
        gradeId,
        courseId: grade.courseId,
        classId: grade.classId,
        lecturerId: assignedLecturer.id,
        reason: normalizedReason
      }),
      ipAddress: clientIp
    }, { transaction });

    const notification = await createNotification({
      userId: assignedLecturer.userId,
      type: 'grade',
      title: 'Có yêu cầu phúc khảo mới',
      message: `Sinh viên ${student.id} đã gửi yêu cầu phúc khảo môn ${grade.courseId}.`,
      data: { gradeId: grade.id, classId: grade.classId, studentId: student.id },
      transaction
    });

    await transaction.commit();
    const io = req.app.get('io');
    if (io && notification) {
      io.to(`user_${assignedLecturer.userId}`).emit('notification_created', notification.toJSON());
    }

    return res.json({
      message: `Nộp đơn phúc khảo thành công và đã chuyển đến giảng viên ${assignedLecturer.name}.`,
      reviewer: { id: assignedLecturer.id, name: assignedLecturer.name }
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Lỗi gửi phúc khảo:', error);
    return res.status(error.status || 500).json({
      code: error.code,
      message: error.message || 'Lỗi server khi nộp đơn.'
    });
  }
});

// 10. Xuất Bảng điểm cá nhân (Transcript) ra file Excel (.xlsx)
router.get('/grades/export-excel', async (req, res) => {
  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;

    const grades = await Grade.findAll({
      where: { studentId: student.id, isLocked: true },
      include: [Course]
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ thống Đăng ký Học';
    const worksheet = workbook.addWorksheet('Ket_Qua_Hoc_Tap', {
      views: [{ showGridLines: true }]
    });

    // Tiêu đề
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `BẢNG ĐIỂM KẾT QUẢ HỌC TẬP CÁ NHÂN`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: '1F4E79' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:J2');
    worksheet.getCell('A2').value = `Sinh viên: ${student.name} | MSV: ${student.id} | Lớp: ${student.class || 'N/A'}`;
    worksheet.getCell('A2').font = { name: 'Calibri', size: 11, italic: true };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    const headers = [
      'STT', 'Mã Môn', 'Tên Môn Học', 'Số Tín Chỉ',
      'Điểm Chuyên Cần', 'Điểm Giữa Kỳ', 'Điểm Cuối Kỳ', 'Điểm Hệ 10', 'Điểm Chữ', 'Thang 4'
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
    let totalCredits = 0;
    let sumWeight = 0;

    for (let g of grades) {
      const courseName = g.Course ? g.Course.name : '';
      const credits = g.Course ? g.Course.credits : 0;
      if (g.grade4 !== null && credits > 0) {
        totalCredits += credits;
        sumWeight += g.grade4 * credits;
      }

      const row = worksheet.addRow([
        index++,
        g.courseId,
        courseName,
        credits,
        g.attendanceGrade !== null ? g.attendanceGrade : '-',
        g.midtermGrade !== null ? g.midtermGrade : '-',
        g.finalGrade !== null ? g.finalGrade : '-',
        g.total10 !== null ? g.total10 : '-',
        g.letterGrade || '-',
        g.grade4 !== null ? g.grade4 : '-'
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: [1, 2, 4, 5, 6, 7, 8, 9, 10].includes(colNumber) ? 'center' : 'left',
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

    const cpa = totalCredits > 0 ? (sumWeight / totalCredits).toFixed(2) : '0.00';

    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['', '', 'ĐIỂM TRUNG BÌNH TÍCH LŨY (CPA):', `${cpa} / 4.0`, '', '', '', '', '', '']);
    summaryRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '1F4E79' } };

    worksheet.columns.forEach((col, i) => {
      let maxLen = headers[i] ? headers[i].length : 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const cellLen = cell.value ? cell.value.toString().length : 0;
        if (cellLen > maxLen) maxLen = cellLen;
      });
      col.width = Math.max(maxLen + 4, 12);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Bang_Diem_${student.id}.xlsx`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Lỗi xuất Excel bảng điểm sinh viên:', error);
    return res.status(500).json({ message: 'Lỗi server khi xuất file Excel.' });
  }
});

// 11. Xuất Biên lai Học phí HTML Printable / PDF Document
router.get('/tuition/export-receipt', async (req, res) => {
  try {
    const student = await getStudentFromReq(req, res);
    if (!student) return;

    const semester = await getCurrentSemester();
    const payment = await Payment.findOne({ where: { studentId: student.id, semester } });

    const regs = await Registration.findAll({
      where: { studentId: student.id, status: 'enrolled' },
      include: [{ model: Class, where: { semester }, include: [Course] }]
    });

    const isPaid = payment && payment.status === 'paid';
    const amount = payment ? payment.amount : 0;
    const discountRate = payment ? (payment.discountRate || 0) : 0;
    const discountReason = payment && payment.discountReason ? payment.discountReason : '';
    const discountAmount = Math.round(amount * discountRate);
    const finalAmount = payment ? payment.finalAmount : 0;
    const transactionId = payment && payment.transactionId ? payment.transactionId : 'N/A';

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên lai Học phí - ${student.id}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
    .receipt-box { border: 2px solid #1F4E79; padding: 30px; border-radius: 10px; max-width: 750px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px dashed #1F4E79; padding-bottom: 20px; }
    .header h1 { color: #1F4E79; margin: 0 0 5px 0; font-size: 1.8rem; }
    .header p { margin: 0; color: #666; font-size: 0.95rem; }
    .info-section { margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #1F4E79; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .total-box { text-align: right; margin-top: 20px; font-size: 1.05rem; background: #f8fafc; padding: 15px; border-radius: 8px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; }
    .badge-paid { background: #d4edda; color: #155724; }
    .badge-unpaid { background: #f8d7da; color: #721c24; }
    .footer { text-align: center; margin-top: 30px; font-size: 0.85rem; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center; margin-bottom: 20px;">
    <button onclick="window.print()" style="background:#1F4E79; color:white; border:none; padding:10px 20px; font-size:1rem; border-radius:5px; cursor:pointer;">
      🖨️ In / Tải PDF Biên Lai
    </button>
  </div>
  <div class="receipt-box">
    <div class="header">
      <h1>ĐĂNG KÝ HỌC - BIÊN LAI HỌC PHÍ</h1>
      <p>Học kỳ: ${semester} | Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>
    <div class="info-section">
      <div class="info-grid">
        <div><strong>Họ và tên:</strong> ${student.name}</div>
        <div><strong>Mã Sinh viên:</strong> ${student.id}</div>
        <div><strong>Lớp sinh hoạt:</strong> ${student.class || 'N/A'}</div>
        <div><strong>Trạng thái:</strong> ${isPaid ? '<span class="badge badge-paid">ĐÃ THANH TOÁN</span>' : '<span class="badge badge-unpaid">CHƯA THANH TOÁN</span>'}</div>
        <div><strong>Mã Giao dịch:</strong> ${transactionId}</div>
        <div><strong>Phương thức:</strong> ${payment ? (payment.paymentMethod || 'VietQR / Direct') : 'N/A'}</div>
      </div>
    </div>

    <h3>Chi tiết môn học đăng ký</h3>
    <table>
      <thead>
        <tr>
          <th>STT</th>
          <th>Mã Lớp HP</th>
          <th>Tên Môn Học</th>
          <th>Số Tín Chỉ</th>
          <th>Đơn Giá / TC</th>
          <th>Thành Tiền</th>
        </tr>
      </thead>
      <tbody>
        ${regs.map((r, idx) => {
          const crd = r.Class && r.Class.Course ? r.Class.Course.credits : 0;
          const lineTotal = crd * COST_PER_CREDIT;
          return `
          <tr>
            <td>${idx + 1}</td>
            <td>${r.classId}</td>
            <td>${r.Class && r.Class.Course ? r.Class.Course.name : ''}</td>
            <td>${crd}</td>
            <td>${COST_PER_CREDIT.toLocaleString('vi-VN')} VNĐ</td>
            <td>${lineTotal.toLocaleString('vi-VN')} VNĐ</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="total-box">
      <p>Tổng tiền gốc học phí: <strong>${amount.toLocaleString('vi-VN')} VNĐ</strong></p>
      ${discountRate > 0 ? `<p style="color:#d97706;">Miễn giảm chính sách (${discountRate * 100}%${discountReason ? ' - ' + discountReason : ''}): <strong>-${discountAmount.toLocaleString('vi-VN')} VNĐ</strong></p>` : ''}
      <p>Số tiền thực nộp: <strong style="font-size:1.4rem; color:#1F4E79;">${finalAmount.toLocaleString('vi-VN')} VNĐ</strong></p>
    </div>

    <div class="footer">
      <p>Biên lai xác nhận thanh toán tự động từ Hệ thống Đăng ký Học.</p>
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(htmlContent);
  } catch (error) {
    console.error('Lỗi xuất biên lai học phí:', error);
    return res.status(500).json({ message: 'Lỗi server.' });
  }
});

export default router;
