import {
  AcademicTerm,
  Class,
  Course,
  Grade,
  Lecturer,
  Registration,
  Student,
  sequelize
} from '../models/index.js';
import { Op } from 'sequelize';
import { updateTuition } from './tuitionHelper.js';
import {
  chooseFreeLecturer,
  getDemoAcademicStatus,
  selectDemoCourses
} from './demoAcademicResultsPolicy.js';

const RESULT_PROFILES = Object.freeze({
  A: Object.freeze({ attendanceGrade: 9.2, midtermGrade: 8.8, finalGrade: 9.0 }),
  B: Object.freeze({ attendanceGrade: 8.0, midtermGrade: 7.4, finalGrade: 7.2 }),
  D: Object.freeze({ attendanceGrade: 6.0, midtermGrade: 4.5, finalGrade: 4.2 }),
  F: Object.freeze({ attendanceGrade: 5.0, midtermGrade: 3.0, finalGrade: 2.5 })
});

const CLASS_ROLES = Object.freeze({
  high: Object.freeze({ suffix: 'H', semester: 'current', dayOfWeek: 2 }),
  low: Object.freeze({ suffix: 'L', semester: 'current', dayOfWeek: 3 }),
  retake: Object.freeze({ suffix: 'R', semester: 'current', dayOfWeek: 4 }),
  improve: Object.freeze({ suffix: 'I', semester: 'current', dayOfWeek: 5 }),
  past: Object.freeze({ suffix: 'P', semester: 'past', dayOfWeek: 6 })
});

function calculateGrade(profileName) {
  const components = RESULT_PROFILES[profileName];
  const total10 = Number((
    components.attendanceGrade * 0.1
    + components.midtermGrade * 0.3
    + components.finalGrade * 0.6
  ).toFixed(1));

  if (total10 >= 8.5) return { ...components, total10, letterGrade: 'A', grade4: 4 };
  if (total10 >= 7) return { ...components, total10, letterGrade: 'B', grade4: 3 };
  if (total10 >= 5.5) return { ...components, total10, letterGrade: 'C', grade4: 2 };
  if (total10 >= 4) return { ...components, total10, letterGrade: 'D', grade4: 1 };
  return { ...components, total10, letterGrade: 'F', grade4: 0 };
}

function classId(courseId, role) {
  return `KQDEMO_${courseId}_${CLASS_ROLES[role].suffix}`;
}

function gradeRow(studentId, courseId, role, profileName) {
  return {
    studentId,
    courseId,
    classId: classId(courseId, role),
    ...calculateGrade(profileName),
    isLocked: true,
    reEvalStatus: 'none',
    reEvalNote: null
  };
}

export async function seedAllStudentAcademicResults() {
  const transaction = await sequelize.transaction();
  try {
    const [students, courses, lecturers, currentTerm] = await Promise.all([
      Student.findAll({ order: [['id', 'ASC']], transaction }),
      Course.findAll({ order: [['term', 'ASC'], ['id', 'ASC']], transaction }),
      Lecturer.findAll({ order: [['id', 'ASC']], transaction }),
      AcademicTerm.findOne({
        where: { isCurrent: true },
        order: [['startDate', 'DESC']],
        transaction
      })
    ]);

    if (students.length === 0) throw new Error('Chưa có sinh viên để nhập kết quả.');
    if (courses.length < 4) throw new Error('Cần ít nhất 4 môn học để tạo kết quả.');
    if (lecturers.length === 0) throw new Error('Chưa có giảng viên để gán lớp kết quả mẫu.');
    if (!currentTerm) throw new Error('Chưa cấu hình học kỳ hiện tại.');

    // Chỉ thay thế dữ liệu do chính trình tạo này quản lý.
    await Registration.destroy({
      where: { classId: { [Op.like]: 'KQDEMO_%' } },
      transaction
    });
    await Grade.destroy({
      where: { classId: { [Op.like]: 'KQDEMO_%' } },
      transaction
    });
    await Class.destroy({
      where: { id: { [Op.like]: 'KQDEMO_%' } },
      transaction
    });

    const existingRegistrations = await Registration.findAll({
      include: [{
        model: Class,
        required: true,
        where: { semester: currentTerm.id },
        attributes: ['courseId']
      }],
      transaction
    });
    const blockedCoursesByStudent = new Map();
    for (const registration of existingRegistrations) {
      const blocked = blockedCoursesByStudent.get(registration.studentId) || new Set();
      blocked.add(registration.Class.courseId);
      blockedCoursesByStudent.set(registration.studentId, blocked);
    }

    const assignments = students.map((student, index) => {
      const blockedCourses = blockedCoursesByStudent.get(student.id) || new Set();
      const isDemoEligible = blockedCourses.size === 0;
      return {
        student,
        isDemoEligible,
        status: isDemoEligible ? getDemoAcademicStatus(index) : 'active',
        courses: isDemoEligible
          ? selectDemoCourses(student, courses, index, blockedCourses)
          : []
      };
    });
    const usedCourses = new Map();
    assignments.forEach(({ courses: selected }) => {
      selected.forEach(course => usedCourses.set(course.id, course));
    });

    const existingClasses = await Class.findAll({
      where: { status: 'active' },
      attributes: [
        'lecturerId', 'semester', 'dayOfWeek', 'shift', 'startSlot', 'numSlots'
      ],
      transaction
    });
    const lecturerMeetings = new Map();
    for (const classInfo of existingClasses) {
      const meetings = lecturerMeetings.get(classInfo.lecturerId) || [];
      meetings.push({
        semester: classInfo.semester,
        dayOfWeek: classInfo.dayOfWeek,
        shift: classInfo.shift,
        startSlot: classInfo.startSlot,
        numSlots: classInfo.numSlots
      });
      lecturerMeetings.set(classInfo.lecturerId, meetings);
    }

    const demoClasses = [];
    let lecturerCursor = 0;
    for (const course of usedCourses.values()) {
      for (const [role, config] of Object.entries(CLASS_ROLES)) {
        const meeting = {
          semester: config.semester === 'current' ? currentTerm.id : 'HK2-2025',
          dayOfWeek: config.dayOfWeek,
          shift: 'morning',
          startSlot: 1,
          numSlots: 3
        };
        const lecturer = chooseFreeLecturer(
          lecturers,
          lecturerMeetings,
          meeting,
          lecturerCursor
        );
        lecturerCursor = (lecturers.indexOf(lecturer) + 1) % lecturers.length;
        demoClasses.push({
          id: classId(course.id, role),
          courseId: course.id,
          lecturerId: lecturer.id,
          roomName: `KQ-${config.suffix}-${course.id}`,
          roomType: 'theory',
          capacity: 1000,
          ...meeting,
          status: 'active'
        });
      }
    }
    await Class.bulkCreate(demoClasses, {
      updateOnDuplicate: [
        'courseId', 'lecturerId', 'roomName', 'roomType', 'capacity',
        'semester', 'dayOfWeek', 'shift', 'startSlot', 'numSlots', 'status'
      ],
      transaction
    });

    const gradeRows = [];
    const registrationRows = [];
    for (const { student, status, courses: selected, isDemoEligible } of assignments) {
      if (!isDemoEligible) continue;
      const [highCourse, lowCourse, retakeCourse, improveCourse] = selected;
      const isActive = status === 'active';

      // Sinh viên bình thường có điểm A và F trong cùng kỳ nhưng GPA vẫn đạt.
      // Sinh viên thuộc diện học vụ có điểm A ở kỳ trước và các điểm F ở kỳ này.
      gradeRows.push(
        gradeRow(student.id, highCourse.id, isActive ? 'high' : 'past', 'A'),
        gradeRow(student.id, lowCourse.id, 'low', 'F'),
        gradeRow(student.id, retakeCourse.id, 'past', 'F'),
        gradeRow(student.id, retakeCourse.id, 'retake', isActive ? 'B' : 'F'),
        gradeRow(student.id, improveCourse.id, 'past', 'D'),
        gradeRow(student.id, improveCourse.id, 'improve', isActive ? 'A' : 'F')
      );

      if (isActive) {
        registrationRows.push({
          studentId: student.id,
          classId: classId(highCourse.id, 'high'),
          status: 'enrolled',
          type: 'regular',
          queueOrder: null
        });
      }
      registrationRows.push(
        {
          studentId: student.id,
          classId: classId(lowCourse.id, 'low'),
          status: 'enrolled',
          type: 'regular',
          queueOrder: null
        },
        {
          studentId: student.id,
          classId: classId(retakeCourse.id, 'retake'),
          status: 'enrolled',
          type: 'retake',
          queueOrder: null
        },
        {
          studentId: student.id,
          classId: classId(improveCourse.id, 'improve'),
          status: 'enrolled',
          type: 'improve',
          queueOrder: null
        }
      );
    }

    await Grade.bulkCreate(gradeRows, {
      updateOnDuplicate: [
        'attendanceGrade', 'midtermGrade', 'finalGrade', 'total10',
        'letterGrade', 'grade4', 'isLocked', 'reEvalStatus', 'reEvalNote'
      ],
      transaction
    });
    await Registration.bulkCreate(registrationRows, {
      updateOnDuplicate: ['status', 'type', 'queueOrder'],
      transaction
    });

    for (const { student, status } of assignments) {
      await Student.update({ status }, { where: { id: student.id }, transaction });
      await updateTuition(student.id, currentTerm.id, transaction);
    }

    await transaction.commit();
    return {
      students: students.length,
      demoStudents: assignments.filter(item => item.isDemoEligible).length,
      grades: gradeRows.length,
      registrations: registrationRows.length,
      demoClasses: demoClasses.length,
      currentSemester: currentTerm.id
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
