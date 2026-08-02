import sequelize from '../config/db.js';
import User from './User.js';
import Department from './Department.js';
import Major from './Major.js';
import Student from './Student.js';
import Lecturer from './Lecturer.js';
import Course from './Course.js';
import Class from './Class.js';
import Registration from './Registration.js';
import Grade from './Grade.js';
import Payment from './Payment.js';
import PaymentTransaction from './PaymentTransaction.js';
import AuditLog from './AuditLog.js';
import AcademicTerm from './AcademicTerm.js';
import RegistrationPeriod from './RegistrationPeriod.js';
import RefreshToken from './RefreshToken.js';
import Notification from './Notification.js';

// --- Establish Associations ---

// Department <-> Major (Một khoa có nhiều ngành)
Department.hasMany(Major, { foreignKey: 'departmentId', onDelete: 'CASCADE' });
Major.belongsTo(Department, { foreignKey: 'departmentId' });

// Major <-> Student (Một ngành có nhiều sinh viên học)
Major.hasMany(Student, { foreignKey: 'majorId' });
Student.belongsTo(Major, { foreignKey: 'majorId' });

// Department <-> Lecturer (Một khoa có nhiều giảng viên trực thuộc)
Department.hasMany(Lecturer, { foreignKey: 'departmentId' });
Lecturer.belongsTo(Department, { foreignKey: 'departmentId' });

// User <-> Student (Một tài khoản người dùng gắn với một sinh viên)
User.hasOne(Student, { foreignKey: 'userId', onDelete: 'CASCADE' });
Student.belongsTo(User, { foreignKey: 'userId' });

// User <-> Lecturer (Một tài khoản người dùng gắn với một giảng viên)
User.hasOne(Lecturer, { foreignKey: 'userId', onDelete: 'CASCADE' });
Lecturer.belongsTo(User, { foreignKey: 'userId' });

// Major <-> Course (Môn học thuộc về Ngành học hoặc null nếu là môn đại cương)
Major.hasMany(Course, { foreignKey: 'majorId' });
Course.belongsTo(Major, { foreignKey: 'majorId' });

// Course Prerequisite (Môn học có môn học tiên quyết)
Course.belongsTo(Course, { as: 'Prerequisite', foreignKey: 'prerequisiteId' });

// Course <-> Class (Một môn học có nhiều lớp học phần)
Course.hasMany(Class, { foreignKey: 'courseId' });
Class.belongsTo(Course, { foreignKey: 'courseId' });

// Lecturer <-> Class (Một giảng viên đứng lớp nhiều lớp học phần)
Lecturer.hasMany(Class, { foreignKey: 'lecturerId' });
Class.belongsTo(Lecturer, { foreignKey: 'lecturerId' });

// Student <-> Registration <-> Class (Đăng ký học phần - bảng trung gian nhiều-nhiều)
Student.hasMany(Registration, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Registration.belongsTo(Student, { foreignKey: 'studentId' });

Class.hasMany(Registration, { foreignKey: 'classId' });
Registration.belongsTo(Class, { foreignKey: 'classId' });

// Student <-> Grade <-> Course/Class (Điểm học tập)
Student.hasMany(Grade, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Grade.belongsTo(Student, { foreignKey: 'studentId' });

Course.hasMany(Grade, { foreignKey: 'courseId' });
Grade.belongsTo(Course, { foreignKey: 'courseId' });

Class.hasMany(Grade, { foreignKey: 'classId' });
Grade.belongsTo(Class, { foreignKey: 'classId' });

// Student <-> Payment (Một sinh viên đóng học phí nhiều kỳ học)
Student.hasMany(Payment, { foreignKey: 'studentId', onDelete: 'CASCADE' });
Payment.belongsTo(Student, { foreignKey: 'studentId' });

Payment.hasMany(PaymentTransaction, { foreignKey: 'paymentId', onDelete: 'CASCADE' });
PaymentTransaction.belongsTo(Payment, { foreignKey: 'paymentId' });

// User <-> AuditLog (Người thực hiện ghi nhận log)
User.hasMany(AuditLog, { foreignKey: 'userId', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// Academic terms and their configurable course-registration windows.
AcademicTerm.hasMany(RegistrationPeriod, { foreignKey: 'termId', onDelete: 'CASCADE' });
RegistrationPeriod.belongsTo(AcademicTerm, { foreignKey: 'termId' });

// Server-managed sessions and persistent user notifications.
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

export {
  sequelize,
  User,
  Department,
  Major,
  Student,
  Lecturer,
  Course,
  Class,
  Registration,
  Grade,
  Payment,
  PaymentTransaction,
  AuditLog,
  AcademicTerm,
  RegistrationPeriod,
  RefreshToken,
  Notification
};
