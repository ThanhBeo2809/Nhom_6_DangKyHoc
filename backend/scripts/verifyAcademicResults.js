import { Op, fn, col } from 'sequelize';
import {
  Class,
  Grade,
  Registration,
  Student,
  sequelize
} from '../models/index.js';

try {
  const [statuses, grades, registrations, demoClasses] = await Promise.all([
    Student.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true
    }),
    Grade.findAll({
      attributes: ['studentId', 'letterGrade'],
      where: { classId: { [Op.like]: 'KQDEMO_%' } },
      raw: true
    }),
    Registration.findAll({
      attributes: ['studentId', 'type'],
      where: { classId: { [Op.like]: 'KQDEMO_%' } },
      raw: true
    }),
    Class.count({ where: { id: { [Op.like]: 'KQDEMO_%' } } })
  ]);

  const gradesByStudent = new Map();
  for (const grade of grades) {
    const list = gradesByStudent.get(grade.studentId) || [];
    list.push(grade.letterGrade);
    gradesByStudent.set(grade.studentId, list);
  }
  const registrationTypes = registrations.reduce((counts, registration) => {
    counts[registration.type] = (counts[registration.type] || 0) + 1;
    return counts;
  }, {});
  const typesByStudent = new Map();
  for (const registration of registrations) {
    const types = typesByStudent.get(registration.studentId) || new Set();
    types.add(registration.type);
    typesByStudent.set(registration.studentId, types);
  }
  const students = await Student.count();
  const fullyCovered = [...gradesByStudent.values()].filter(gradesForStudent =>
    gradesForStudent.length === 6
    && gradesForStudent.includes('A')
    && gradesForStudent.includes('F')
  ).length;
  const demoStudents = gradesByStudent.size;

  const summary = {
    students,
    demoStudents,
    statuses,
    demoGrades: grades.length,
    demoClasses,
    demoRegistrations: registrations.length,
    registrationTypes,
    studentsWithSixHighAndLowResults: fullyCovered
  };
  console.log(JSON.stringify(summary, null, 2));

  const statusNames = new Set(statuses.map(item => item.status));
  const hasValidSeedStatuses = [...statusNames]
    .every(status => status === 'active' || status === 'warning_1');
  const isComplete = demoStudents > 0
    && fullyCovered === demoStudents
    && registrationTypes.retake === demoStudents
    && registrationTypes.improve === demoStudents
    && [...typesByStudent.values()].filter(types =>
      types.has('retake') && types.has('improve')
    ).length === demoStudents
    && hasValidSeedStatuses;

  if (!isComplete) {
    console.error('Dữ liệu kết quả học tập chưa đáp ứng đầy đủ các trường hợp yêu cầu.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Không thể kiểm tra dữ liệu kết quả học tập:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
