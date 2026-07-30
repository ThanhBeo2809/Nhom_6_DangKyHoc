import { Class, Registration } from '../models/index.js';

/**
 * Phân loại mục đích đăng ký từ lịch sử điểm đã khóa.
 * Nếu từng đạt môn, lần đăng ký tiếp theo là học nâng điểm; nếu chỉ có F
 * thì là học lại; chưa có kết quả là học mới.
 */
export function classifyRegistrationType(pastGrades = []) {
  const hasFailed = pastGrades.some(grade => grade.letterGrade === 'F');
  const hasPassed = pastGrades.some(
    grade => grade.letterGrade && grade.letterGrade !== 'F'
  );

  if (hasPassed) return 'improve';
  if (hasFailed) return 'retake';
  return 'new';
}

const REGISTRATION_TYPE_PRIORITIES = Object.freeze({
  retake: 1,
  improve: 2,
  new: 3,
  regular: 3
});

export function getRegistrationTypePriority(registrationType) {
  return REGISTRATION_TYPE_PRIORITIES[registrationType]
    ?? REGISTRATION_TYPE_PRIORITIES.new;
}

/**
 * Tìm đăng ký hiện có của một sinh viên cho cùng môn trong cùng học kỳ.
 * Cả trạng thái enrolled và waitlist đều được xem là đã giữ một lựa chọn.
 */
export async function findCourseRegistration(
  studentId,
  courseId,
  semester,
  { transaction, lock } = {}
) {
  const queryOptions = {
    where: { studentId },
    include: [{
      model: Class,
      required: true,
      where: { courseId, semester },
      attributes: ['id', 'courseId', 'semester']
    }]
  };

  if (transaction) queryOptions.transaction = transaction;
  if (lock) queryOptions.lock = lock;

  return Registration.findOne(queryOptions);
}
