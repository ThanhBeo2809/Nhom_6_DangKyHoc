import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  courseId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  classId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  attendanceGrade: {
    type: DataTypes.FLOAT, // Trọng số 10%
    allowNull: true
  },
  midtermGrade: {
    type: DataTypes.FLOAT, // Trọng số 30%
    allowNull: true
  },
  finalGrade: {
    type: DataTypes.FLOAT, // Trọng số 60%
    allowNull: true
  },
  total10: {
    type: DataTypes.FLOAT, // Điểm tổng kết hệ 10
    allowNull: true
  },
  letterGrade: {
    type: DataTypes.STRING, // Điểm chữ (A, B, C, D, F)
    allowNull: true
  },
  grade4: {
    type: DataTypes.FLOAT, // Điểm hệ 4
    allowNull: true
  },
  isLocked: {
    type: DataTypes.BOOLEAN, // Khóa điểm (giảng viên khóa sau khi nhập xong, sinh viên mới thấy)
    defaultValue: false
  },
  reEvalStatus: {
    type: DataTypes.ENUM('none', 'requested', 'completed'), // Trạng thái phúc khảo điểm
    defaultValue: 'none'
  },
  reEvalNote: {
    type: DataTypes.STRING, // Ghi chú phúc khảo (lý do sinh viên muốn phúc khảo hoặc ghi chú chấm lại)
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'courseId', 'classId']
    }
  ]
});

export default Grade;
