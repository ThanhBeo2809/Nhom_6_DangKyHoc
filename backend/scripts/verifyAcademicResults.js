import { Op } from 'sequelize';
import { Class, Course, Grade, Registration, Student, sequelize } from '../models/index.js';

const PREFIX = 'KQHIST_';
const GENERAL_COURSE_PREFIXES = [
  'MLN', 'HCM', 'LSD', 'MAT', 'STA', 'PHY', 'ENG', 'TC', 'QP'
];

function belongsToInformationTechnologyCurriculum(course) {
  if (course.majorId === 'cntt') return true;
  if (course.majorId !== null) return false;
  const courseId = String(course.id).toUpperCase();
  return GENERAL_COURSE_PREFIXES.some(prefix => courseId.startsWith(prefix));
}

try {
  const [students, allCourses, grades, registrations, classes] = await Promise.all([
    Student.findAll({ where: { majorId: 'cntt' }, attributes: ['id'], raw: true }),
    Course.findAll({
      where: { term: { [Op.between]: [1, 4] } },
      attributes: ['id', 'credits', 'term', 'majorId'],
      raw: true
    }),
    Grade.findAll({
      where: { classId: { [Op.like]: `${PREFIX}%` } },
      attributes: ['studentId', 'courseId', 'letterGrade', 'grade4', 'isLocked'],
      raw: true
    }),
    Registration.findAll({
      where: { classId: { [Op.like]: `${PREFIX}%` } },
      attributes: ['studentId', 'classId'],
      raw: true
    }),
    Class.findAll({
      where: { id: { [Op.like]: `${PREFIX}%` } },
      attributes: ['id', 'courseId', 'lecturerId', 'semester'],
      raw: true
    })
  ]);
  const courses = allCourses.filter(belongsToInformationTechnologyCurriculum);

  const courseById = new Map(courses.map(course => [course.id, course]));
  const resultsByStudent = new Map();
  for (const grade of grades) {
    const list = resultsByStudent.get(grade.studentId) || [];
    list.push(grade);
    resultsByStudent.set(grade.studentId, list);
  }

  const studentSummaries = students.map(student => {
    const studentGrades = resultsByStudent.get(student.id) || [];
    let attemptedCredits = 0;
    let completedCredits = 0;
    let weightedGradePoints = 0;
    for (const grade of studentGrades) {
      const credits = Number(courseById.get(grade.courseId)?.credits || 0);
      attemptedCredits += credits;
      weightedGradePoints += Number(grade.grade4 || 0) * credits;
      if (grade.letterGrade !== 'F') completedCredits += credits;
    }
    const termCredits = {};
    for (const grade of studentGrades) {
      const course = courseById.get(grade.courseId);
      termCredits[course.term] = (termCredits[course.term] || 0) + Number(course.credits || 0);
    }
    return {
      studentId: student.id,
      results: studentGrades.length,
      hasHigh: studentGrades.some(grade => grade.letterGrade === 'A'),
      hasImproveCandidate: studentGrades.some(grade => grade.letterGrade === 'D'),
      hasFailed: studentGrades.some(grade => grade.letterGrade === 'F'),
      allLocked: studentGrades.every(grade => grade.isLocked),
      termCredits,
      completedCredits,
      cpa: attemptedCredits > 0
        ? Number((weightedGradePoints / attemptedCredits).toFixed(2))
        : 0
    };
  });

  const semesterCounts = classes.reduce((result, classInfo) => {
    result[classInfo.semester] = (result[classInfo.semester] || 0) + 1;
    return result;
  }, {});
  const completeStudents = studentSummaries.filter(summary =>
    summary.hasHigh
    && summary.hasImproveCandidate
    && summary.hasFailed
    && summary.allLocked
    && [1, 2, 3, 4].every(term =>
      Number(summary.termCredits[term]) >= 12
      && Number(summary.termCredits[term]) <= 24
    )
  );

  const report = {
    students: students.length,
    curriculumCoursesThroughTerm4: courses.length,
    curriculumCreditsThroughTerm4: courses.reduce((sum, course) => sum + Number(course.credits), 0),
    actualResults: grades.length,
    registrations: registrations.length,
    classes: classes.length,
    semesterCounts,
    fullyCoveredStudents: completeStudents.length,
    completedCreditsRange: {
      min: Math.min(...studentSummaries.map(item => item.completedCredits)),
      max: Math.max(...studentSummaries.map(item => item.completedCredits))
    },
    studiedCreditsRange: {
      min: Math.min(...studentSummaries.map(item =>
        Object.values(item.termCredits).reduce((sum, credits) => sum + Number(credits), 0)
      )),
      max: Math.max(...studentSummaries.map(item =>
        Object.values(item.termCredits).reduce((sum, credits) => sum + Number(credits), 0)
      ))
    },
    cpaRange: {
      min: Math.min(...studentSummaries.map(item => item.cpa)),
      max: Math.max(...studentSummaries.map(item => item.cpa))
    },
    samples: studentSummaries.slice(0, 3)
  };
  console.log(JSON.stringify(report, null, 2));

  const validSemesters = ['HK1-2024', 'HK2-2024', 'HK1-2025', 'HK2-2025']
    .every(semester => semesterCounts[semester] > 0);
  const hasAssignedLecturer = classes.every(classInfo => Boolean(classInfo.lecturerId));
  if (
    registrations.length !== grades.length
    || classes.length !== courses.length
    || completeStudents.length !== students.length
    || !validSemesters
    || !hasAssignedLecturer
  ) {
    console.error('Dữ liệu kết quả học tập chưa đáp ứng đầy đủ chương trình CNTT học kỳ 1-4.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Không thể kiểm tra dữ liệu kết quả học tập:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
