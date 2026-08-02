import { Op } from 'sequelize';
import {
  Class,
  Course,
  Grade,
  Lecturer,
  Registration,
  Student,
  sequelize
} from '../models/index.js';
import { getAcademicResultProfile } from './demoAcademicResultsPolicy.js';

const HISTORY_CLASS_PREFIX = 'KQHIST_';
const GENERAL_COURSE_PREFIXES = Object.freeze([
  'MLN', 'HCM', 'LSD', 'MAT', 'STA', 'PHY', 'ENG', 'TC', 'QP'
]);
const TERM_SEMESTERS = Object.freeze({
  1: 'HK1-2024',
  2: 'HK2-2024',
  3: 'HK1-2025',
  4: 'HK2-2025'
});

const RESULT_PROFILES = Object.freeze({
  A: Object.freeze({ attendanceGrade: 9.2, midtermGrade: 8.8, finalGrade: 9.0 }),
  B: Object.freeze({ attendanceGrade: 8.0, midtermGrade: 7.4, finalGrade: 7.2 }),
  C: Object.freeze({ attendanceGrade: 7.0, midtermGrade: 6.0, finalGrade: 5.8 }),
  D: Object.freeze({ attendanceGrade: 6.0, midtermGrade: 4.5, finalGrade: 4.2 }),
  F: Object.freeze({ attendanceGrade: 5.0, midtermGrade: 3.0, finalGrade: 2.5 })
});

const TERM_CREDIT_TARGETS = Object.freeze({
  1: Object.freeze([18]),
  2: Object.freeze([22]),
  3: Object.freeze([20, 23]),
  4: Object.freeze([17, 20, 23])
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

function historyClassId(course) {
  return `${HISTORY_CLASS_PREFIX}T${course.term}_${course.id}`;
}

function resultProfileFor(student, studentIndex, courseIndex) {
  const bucket = (studentIndex * 3 + courseIndex) % 12;
  let defaultProfile = 'A';
  if (bucket === 0) defaultProfile = 'F';
  else if (bucket === 1) defaultProfile = 'D';
  else if (bucket === 2) defaultProfile = 'C';
  else if (bucket <= 6) defaultProfile = 'B';
  return getAcademicResultProfile(student.status, courseIndex, defaultProfile);
}

function calculateProgramCredits(courses) {
  return courses.reduce((sum, course) => sum + Number(course.credits || 0), 0);
}

function belongsToInformationTechnologyCurriculum(course) {
  if (course.majorId === 'cntt') return true;
  if (course.majorId !== null) return false;
  const courseId = String(course.id).toUpperCase();
  return GENERAL_COURSE_PREFIXES.some(prefix => courseId.startsWith(prefix));
}

function rotate(items, offset) {
  if (items.length === 0) return [];
  const normalizedOffset = offset % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

function selectStudentCourses(courses, studentIndex) {
  const selected = [];
  const selectedIds = new Set();

  for (let term = 1; term <= 4; term += 1) {
    const termCourses = courses.filter(course => Number(course.term) === term);
    const commonCourses = termCourses.filter(course => course.majorId === null);
    const majorCourses = rotate(
      termCourses.filter(course => course.majorId === 'cntt'),
      studentIndex + term
    );
    const targets = TERM_CREDIT_TARGETS[term];
    const targetCredits = targets[studentIndex % targets.length];
    const termSelection = [...commonCourses];
    let selectedCredits = calculateProgramCredits(termSelection);

    for (const course of majorCourses) {
      const prerequisiteSatisfied = !course.prerequisiteId
        || selectedIds.has(course.prerequisiteId);
      if (!prerequisiteSatisfied) continue;
      const nextCredits = selectedCredits + Number(course.credits || 0);
      if (nextCredits > targetCredits) continue;
      termSelection.push(course);
      selectedCredits = nextCredits;
    }

    if (selectedCredits < 12 || selectedCredits > 24) {
      throw new Error(
        `Sinh viên thứ ${studentIndex + 1} có ${selectedCredits} tín chỉ ở học kỳ ${term}; yêu cầu 12-24.`
      );
    }
    termSelection.forEach(course => selectedIds.add(course.id));
    selected.push(...termSelection);
  }

  return selected;
}

export async function seedAllStudentAcademicResults() {
  const transaction = await sequelize.transaction();
  try {
    const [students, allCourses, lecturers] = await Promise.all([
      Student.findAll({
        where: { majorId: 'cntt' },
        order: [['id', 'ASC']],
        transaction
      }),
      Course.findAll({
        where: { term: { [Op.between]: [1, 4] } },
        order: [['term', 'ASC'], ['id', 'ASC']],
        transaction
      }),
      Lecturer.findAll({
        order: [['id', 'ASC']],
        transaction
      })
    ]);
    const courses = allCourses.filter(belongsToInformationTechnologyCurriculum);

    if (students.length === 0) throw new Error('Chưa có sinh viên ngành Công nghệ thông tin để nhập kết quả.');
    const cnttLecturers = lecturers.filter(lecturer => lecturer.departmentId === 'CNTT');
    const politicalTheoryLecturers = lecturers.filter(lecturer => lecturer.departmentId === 'LLCT');
    if (cnttLecturers.length === 0) throw new Error('Chưa có giảng viên Khoa Công nghệ thông tin để gán lớp.');
    if (courses.some(course => course.id === 'HCM101') && politicalTheoryLecturers.length === 0) {
      throw new Error('Chưa có giảng viên Bộ môn Lý luận chính trị để gán HCM101.');
    }

    for (const term of Object.keys(TERM_SEMESTERS).map(Number)) {
      if (!courses.some(course => Number(course.term) === term)) {
        throw new Error(`Chương trình Công nghệ thông tin chưa có môn cho học kỳ ${term}.`);
      }
    }

    const studentIds = students.map(student => student.id);

    // Kết quả học tập được xây lại toàn bộ để không lẫn dữ liệu demo cũ,
    // bản ghi không gắn lớp hoặc nhiều lần học không chủ đích.
    await Grade.destroy({
      where: { studentId: { [Op.in]: studentIds } },
      transaction
    });
    await Registration.destroy({
      where: {
        [Op.or]: [
          { classId: { [Op.like]: 'KQDEMO_%' } },
          { classId: { [Op.like]: `${HISTORY_CLASS_PREFIX}%` } }
        ]
      },
      transaction
    });
    await Class.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.like]: 'KQDEMO_%' } },
          { id: { [Op.like]: `${HISTORY_CLASS_PREFIX}%` } }
        ]
      },
      transaction
    });

    const historyClasses = courses.map((course, index) => {
      const lecturerPool = course.id === 'HCM101'
        ? politicalTheoryLecturers
        : cnttLecturers;
      const lecturer = lecturerPool[index % lecturerPool.length];
      return {
        id: historyClassId(course),
        courseId: course.id,
        lecturerId: lecturer.id,
        roomName: `HIST-${course.term}-${String(index + 1).padStart(2, '0')}`,
        roomType: course.id.startsWith('INT') ? 'lab' : 'theory',
        capacity: Math.max(students.length, 50),
        semester: TERM_SEMESTERS[course.term],
        dayOfWeek: 2 + (index % 6),
        shift: index % 2 === 0 ? 'morning' : 'afternoon',
        startSlot: index % 2 === 0 ? 1 : 4,
        numSlots: 3,
        status: 'active'
      };
    });
    await Class.bulkCreate(historyClasses, { transaction });

    const gradeRows = [];
    const registrationRows = [];
    students.forEach((student, studentIndex) => {
      const selectedCourses = selectStudentCourses(courses, studentIndex);
      const prerequisiteCourseIds = new Set(
        selectedCourses.map(course => course.prerequisiteId).filter(Boolean)
      );
      const profileNames = selectedCourses.map((course, courseIndex) => {
        const profileName = resultProfileFor(student, studentIndex, courseIndex);
        return profileName === 'F' && prerequisiteCourseIds.has(course.id)
          ? 'D'
          : profileName;
      });
      if (!profileNames.includes('F')) {
        const failIndex = selectedCourses.findLastIndex(
          course => !prerequisiteCourseIds.has(course.id)
        );
        if (failIndex < 0) throw new Error(`Không tìm được môn phù hợp để tạo điểm F cho ${student.id}.`);
        profileNames[failIndex] = 'F';
      }
      if (!profileNames.includes('D')) {
        const improveIndex = profileNames.findIndex(profile => profile !== 'F');
        profileNames[improveIndex] = 'D';
      }
      if (!profileNames.includes('A')) {
        const highIndex = profileNames.findIndex(profile => profile !== 'F' && profile !== 'D');
        profileNames[highIndex] = 'A';
      }
      selectedCourses.forEach((course, courseIndex) => {
        const classId = historyClassId(course);
        gradeRows.push({
          studentId: student.id,
          courseId: course.id,
          classId,
          ...calculateGrade(profileNames[courseIndex]),
          isLocked: true,
          reEvalStatus: 'none',
          reEvalNote: null
        });
        registrationRows.push({
          studentId: student.id,
          classId,
          status: 'enrolled',
          type: 'regular',
          queueOrder: null
        });
      });
    });

    await Grade.bulkCreate(gradeRows, { transaction });
    await Registration.bulkCreate(registrationRows, { transaction });

    const expectedResults = gradeRows.length;
    const createdResults = await Grade.count({
      where: {
        studentId: { [Op.in]: studentIds },
        classId: { [Op.like]: `${HISTORY_CLASS_PREFIX}%` },
        isLocked: true
      },
      transaction
    });
    if (createdResults !== expectedResults) {
      throw new Error(`Thiếu kết quả học tập: ${createdResults}/${expectedResults}.`);
    }

    await transaction.commit();
    return {
      students: students.length,
      availableCoursesThroughTerm4: courses.length,
      availableCreditsThroughTerm4: calculateProgramCredits(courses),
      grades: gradeRows.length,
      registrations: registrationRows.length,
      historyClasses: historyClasses.length,
      semesters: TERM_SEMESTERS
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
