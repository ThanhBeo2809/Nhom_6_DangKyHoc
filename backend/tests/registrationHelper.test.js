import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FORCE_SQLITE = 'true';
process.env.SQLITE_STORAGE = ':memory:';

const {
  sequelize,
  User,
  Department,
  Major,
  Student,
  Lecturer,
  Course,
  Class,
  Registration
} = await import('../models/index.js');
const {
  classifyRegistrationType,
  findCourseRegistration,
  getRegistrationTypePriority
} = await import('../utils/registrationHelper.js');

test.before(async () => {
  await sequelize.sync({ force: true });

  const studentUser = await User.create({
    username: 'student-test',
    password: 'test',
    role: 'student'
  });
  const lecturerUser = await User.create({
    username: 'lecturer-test',
    password: 'test',
    role: 'lecturer'
  });
  await Department.create({ id: 'TEST_DEP', name: 'Khoa kiểm thử' });
  await Major.create({
    id: 'TEST_MAJOR',
    name: 'Ngành kiểm thử',
    departmentId: 'TEST_DEP'
  });
  await Student.create({
    id: 'TEST_STUDENT',
    name: 'Sinh viên kiểm thử',
    gender: 'Nam',
    dob: '2005-01-01',
    email: 'student-test@example.com',
    enrollmentDate: '2023-09-01',
    majorId: 'TEST_MAJOR',
    class: 'TEST_CLASS',
    userId: studentUser.id
  });
  await Lecturer.create({
    id: 'TEST_LECTURER',
    name: 'Giảng viên kiểm thử',
    gender: 'Nam',
    dob: '1980-01-01',
    startDate: '2010-01-01',
    position: 'Giảng viên',
    departmentId: 'TEST_DEP',
    userId: lecturerUser.id
  });
  await Course.bulkCreate([
    { id: 'COURSE_A', name: 'Môn A', credits: 3, majorId: 'TEST_MAJOR' },
    { id: 'COURSE_B', name: 'Môn B', credits: 3, majorId: 'TEST_MAJOR' }
  ]);
  await Class.bulkCreate([
    {
      id: 'COURSE_A_L01',
      courseId: 'COURSE_A',
      lecturerId: 'TEST_LECTURER',
      roomName: 'A101',
      semester: 'HK1-2026',
      dayOfWeek: 2,
      shift: 'morning',
      startSlot: 1
    },
    {
      id: 'COURSE_A_L02',
      courseId: 'COURSE_A',
      lecturerId: 'TEST_LECTURER',
      roomName: 'A102',
      semester: 'HK1-2026',
      dayOfWeek: 3,
      shift: 'morning',
      startSlot: 1
    },
    {
      id: 'COURSE_B_L01',
      courseId: 'COURSE_B',
      lecturerId: 'TEST_LECTURER',
      roomName: 'B101',
      semester: 'HK1-2026',
      dayOfWeek: 4,
      shift: 'morning',
      startSlot: 1
    }
  ]);
  await Registration.create({
    studentId: 'TEST_STUDENT',
    classId: 'COURSE_A_L01',
    status: 'enrolled'
  });
});

test.after(async () => {
  await sequelize.close();
});

test('phát hiện sinh viên đã đăng ký một lớp khác của cùng môn trong cùng học kỳ', async () => {
  const conflict = await findCourseRegistration(
    'TEST_STUDENT',
    'COURSE_A',
    'HK1-2026'
  );

  assert.ok(conflict);
  assert.equal(conflict.classId, 'COURSE_A_L01');
});

test('không báo trùng với môn khác trong cùng học kỳ', async () => {
  const conflict = await findCourseRegistration(
    'TEST_STUDENT',
    'COURSE_B',
    'HK1-2026'
  );

  assert.equal(conflict, null);
});

test('phân loại đúng học mới, học lại và học nâng điểm', () => {
  assert.equal(classifyRegistrationType([]), 'new');
  assert.equal(
    classifyRegistrationType([{ letterGrade: 'F' }]),
    'retake'
  );
  assert.equal(
    classifyRegistrationType([{ letterGrade: 'B+' }]),
    'improve'
  );
  assert.equal(
    classifyRegistrationType([{ letterGrade: 'F' }, { letterGrade: 'C' }]),
    'improve'
  );
});

test('xếp đúng thứ tự ưu tiên học lại, nâng điểm và học mới', () => {
  assert.equal(getRegistrationTypePriority('retake'), 1);
  assert.equal(getRegistrationTypePriority('improve'), 2);
  assert.equal(getRegistrationTypePriority('new'), 3);
  assert.equal(getRegistrationTypePriority('regular'), 3);
  assert.equal(getRegistrationTypePriority('unknown'), 3);
});
