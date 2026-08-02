import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import {
  Class,
  Course,
  Lecturer,
  Major,
  User
} from '../models/index.js';

function schedulesOverlap(firstCourse, secondCourse) {
  return firstCourse.meetings.some(firstMeeting =>
    secondCourse.meetings.some(secondMeeting => {
      if (firstMeeting.dayOfWeek !== secondMeeting.dayOfWeek) return false;
      const firstEnd = firstMeeting.startSlot + firstMeeting.numSlots;
      const secondEnd = secondMeeting.startSlot + secondMeeting.numSlots;
      return firstMeeting.startSlot < secondEnd &&
        secondMeeting.startSlot < firstEnd;
    })
  );
}

/**
 * Gom mỗi giảng viên 2-3 học phần và không để các lớp thuộc những học phần
 * của cùng một giảng viên bị trùng lịch.
 */
export function groupCoursesWithoutScheduleConflicts(courses) {
  const remaining = [...courses].sort((a, b) => a.id.localeCompare(b.id));
  const groups = [];

  while (remaining.length > 0) {
    const group = [remaining.shift()];

    for (let index = 0; index < remaining.length && group.length < 3;) {
      const candidate = remaining[index];
      const canJoin = group.every(course => {
        const courseId = course.courseId || course.id;
        const candidateCourseId = candidate.courseId || candidate.id;
        return courseId !== candidateCourseId &&
          !schedulesOverlap(course, candidate);
      });
      if (canJoin) {
        group.push(remaining.splice(index, 1)[0]);
      } else {
        index++;
      }
    }

    groups.push(group);
  }

  const singleGroup = groups.find(group => group.length < 2);
  if (singleGroup) {
    throw new Error(
      `Không thể phân bổ tối thiểu 2 học phần cho một giảng viên; học phần còn lại: ${singleGroup[0].id}.`
    );
  }

  return groups;
}

const FAMILY_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi',
  'Đỗ', 'Hồ', 'Ngô', 'Dương'
];
const MIDDLE_NAMES = [
  'Minh', 'Quang', 'Thành', 'Thu', 'Ngọc', 'Khánh', 'Đức', 'Phương'
];
const GIVEN_NAMES = [
  'Anh', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hương',
  'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Nga', 'Phong', 'Thảo',
  'Trang', 'Trung', 'Tuấn', 'Uyên'
];

function generatedLecturerName(index) {
  return [
    FAMILY_NAMES[index % FAMILY_NAMES.length],
    MIDDLE_NAMES[Math.floor(index / FAMILY_NAMES.length) % MIDDLE_NAMES.length],
    GIVEN_NAMES[Math.floor(index / (FAMILY_NAMES.length * MIDDLE_NAMES.length)) % GIVEN_NAMES.length]
  ].join(' ');
}

async function createGeneratedLecturer({
  sequence,
  departmentId,
  mainSubject,
  passwordHash,
  transaction
}) {
  let currentSequence = sequence;
  let lecturerId;

  do {
    lecturerId = `GV2026${String(currentSequence).padStart(4, '0')}`;
    currentSequence++;
  } while (await Lecturer.findByPk(lecturerId, { transaction }));

  const user = await User.create({
    username: `${lecturerId}@pka.edu.vn`,
    password: passwordHash,
    role: 'lecturer',
    status: 'active',
    isFirstLogin: true
  }, { transaction });

  const lecturerIndex = currentSequence - 2;
  const lecturer = await Lecturer.create({
    id: lecturerId,
    name: generatedLecturerName(lecturerIndex),
    gender: lecturerIndex % 2 === 0 ? 'Nam' : 'Nữ',
    dob: `${1978 + (lecturerIndex % 14)}-${String((lecturerIndex % 12) + 1).padStart(2, '0')}-${String((lecturerIndex % 27) + 1).padStart(2, '0')}`,
    startDate: `${2010 + (lecturerIndex % 13)}-09-01`,
    position: 'Giảng viên cơ hữu',
    departmentId,
    mainSubject,
    userId: user.id
  }, { transaction });

  return { lecturer, nextSequence: currentSequence };
}

export async function rebalanceLecturerWorkloads({
  semester,
  transaction
}) {
  const courses = await Course.findAll({
    attributes: ['id', 'name'],
    include: [{
      model: Major,
      attributes: ['departmentId']
    }],
    transaction
  });

  const existingLecturers = await Lecturer.findAll({
    order: [['id', 'ASC']],
    transaction
  });
  if (existingLecturers.length === 0) {
    throw new Error('Cần có ít nhất một giảng viên trước khi phân bổ lớp.');
  }

  const highDemandPrefixes = ['MLN', 'MAT', 'ENG', 'INT1', 'ECO1'];
  const scheduleSlots = [];
  for (let dayOfWeek = 2; dayOfWeek <= 7; dayOfWeek++) {
    for (const startSlot of [1, 4, 7, 10]) {
      scheduleSlots.push({
        dayOfWeek,
        shift: startSlot <= 4 ? 'morning' : 'afternoon',
        startSlot,
        numSlots: 3
      });
    }
  }

  const normalizedCourses = courses
    .map(course => ({
      id: course.id,
      name: course.name,
      category: ['HCM', 'MLN', 'LSD'].some(prefix => course.id.startsWith(prefix))
        ? 'LLCT'
        : (course.Major?.departmentId || 'GENERAL')
    }))
    .sort((first, second) =>
      first.category.localeCompare(second.category) ||
      first.id.localeCompare(second.id)
    );

  // Môn đại cương/cơ sở ngành đông sinh viên mở 7 lớp; các môn còn lại
  // mở 6 lớp. Toàn bộ 921 lớp được trải đều trên 24 ca và 40 phòng.
  const classRows = [];
  const teachingBundles = [];
  let globalClassIndex = 0;

  for (const course of normalizedCourses) {
    const targetClassCount = highDemandPrefixes.some(prefix =>
      course.id.startsWith(prefix)
    ) ? 7 : 6;
    const courseClasses = [];
    const isLab = ['lập trình', 'thí nghiệm', 'lab', 'cơ sở dữ liệu']
      .some(keyword => course.name.toLowerCase().includes(keyword));

    for (let classNumber = 1; classNumber <= targetClassCount; classNumber++) {
      const schedule = scheduleSlots[globalClassIndex % scheduleSlots.length];
      const roomIndex = Math.floor(globalClassIndex / scheduleSlots.length) % 40;
      const classInfo = {
        id: `${course.id}_L${String(classNumber).padStart(2, '0')}`,
        courseId: course.id,
        lecturerId: existingLecturers[0].id,
        roomName: `${isLab ? 'LAB' : 'P'}${String(roomIndex + 1).padStart(3, '0')}`,
        roomType: isLab ? 'lab' : 'theory',
        capacity: 40,
        semester,
        dayOfWeek: schedule.dayOfWeek,
        shift: schedule.shift,
        startSlot: schedule.startSlot,
        numSlots: schedule.numSlots,
        status: 'active'
      };
      classRows.push(classInfo);
      courseClasses.push(classInfo);
      globalClassIndex++;
    }

    // Mỗi giảng viên nhận 1-2 lớp của cùng học phần. Một môn 6 lớp tạo
    // 3 nhóm giảng dạy; môn 7 lớp tạo 4 nhóm giảng dạy.
    for (let bundleIndex = 0; bundleIndex < courseClasses.length; bundleIndex += 2) {
      const bundleClasses = courseClasses.slice(bundleIndex, bundleIndex + 2);
      teachingBundles.push({
        id: `${course.id}_B${String((bundleIndex / 2) + 1).padStart(2, '0')}`,
        courseId: course.id,
        courseName: course.name,
        category: course.category,
        classIds: bundleClasses.map(classInfo => classInfo.id),
        meetings: bundleClasses.map(classInfo => ({
          dayOfWeek: classInfo.dayOfWeek,
          startSlot: classInfo.startSlot,
          numSlots: classInfo.numSlots
        }))
      });
    }
  }

  await Class.bulkCreate(classRows, {
    updateOnDuplicate: [
      'courseId', 'lecturerId', 'roomName', 'roomType', 'capacity',
      'semester', 'dayOfWeek', 'shift', 'startSlot', 'numSlots', 'status'
    ],
    transaction
  });

  const categories = ['CNTT', 'KT', 'LLCT', 'GENERAL'];
  const groupedByCategory = new Map();
  for (const category of categories) {
    groupedByCategory.set(
      category,
      groupCoursesWithoutScheduleConflicts(
        teachingBundles.filter(bundle => bundle.category === category)
      )
    );
  }

  const usedLecturerIds = new Set();
  const assignments = [];
  let generatedSequence = 1;
  let generalDepartmentIndex = 0;
  const passwordHash = await bcrypt.hash('12345678', 10);

  for (const category of categories) {
    const groups = groupedByCategory.get(category);

    for (const group of groups) {
      let lecturer = existingLecturers.find(item => {
        if (usedLecturerIds.has(item.id)) return false;
        if (category === 'GENERAL') return true;
        return item.departmentId === category;
      });

      if (!lecturer) {
        const departmentId = category === 'GENERAL'
          ? (generalDepartmentIndex++ % 2 === 0 ? 'CNTT' : 'KT')
          : category;
        const generated = await createGeneratedLecturer({
          sequence: generatedSequence,
          departmentId,
          mainSubject: group[0].courseName,
          passwordHash,
          transaction
        });
        lecturer = generated.lecturer;
        generatedSequence = generated.nextSequence;
        existingLecturers.push(lecturer);
      }

      usedLecturerIds.add(lecturer.id);
      lecturer.mainSubject = group[0].courseName;
      await lecturer.save({ transaction });

      const classIds = group.flatMap(bundle => bundle.classIds);
      const courseIds = group.map(bundle => bundle.courseId);
      await Class.update(
        { lecturerId: lecturer.id },
        {
          where: {
            semester,
            id: { [Op.in]: classIds }
          },
          transaction
        }
      );
      assignments.push({
        lecturerId: lecturer.id,
        courseIds,
        classIds
      });
    }
  }

  return {
    lecturerCount: assignments.length,
    courseCount: normalizedCourses.length,
    classCount: classRows.length,
    teachingBundleCount: teachingBundles.length,
    assignments
  };
}
