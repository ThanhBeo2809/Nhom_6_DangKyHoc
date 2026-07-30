import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.STRING, // Mã sinh viên (MSV)
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  enrollmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  graduationDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  majorId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  class: {
    type: DataTypes.STRING, // Lớp sinh hoạt danh nghĩa (vd: D22CNTT1)
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'warning_1', 'warning_2', 'dismissed'),
    defaultValue: 'active'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: true
});

export default Student;
