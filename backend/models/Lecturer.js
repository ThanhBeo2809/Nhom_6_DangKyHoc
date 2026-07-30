import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Lecturer = sequelize.define('Lecturer', {
  id: {
    type: DataTypes.STRING, // Mã giảng viên (MGV)
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  position: {
    type: DataTypes.STRING, // Chức vụ (VD: Trưởng bộ môn, Giảng viên cơ hữu)
    allowNull: false
  },
  departmentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mainSubject: {
    type: DataTypes.STRING, // Môn học giảng dạy chính
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true
});

export default Lecturer;
