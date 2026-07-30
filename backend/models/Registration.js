import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Registration = sequelize.define('Registration', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  classId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('enrolled', 'waitlist'), // Đã vào lớp chính thức hoặc đang nằm trong hàng chờ
    allowNull: false,
    defaultValue: 'enrolled'
  },
  type: {
    type: DataTypes.ENUM('regular', 'retake', 'improve'), // Học mới, Học lại (nếu F trước đó), Học nâng điểm
    allowNull: false,
    defaultValue: 'regular'
  },
  queueOrder: {
    type: DataTypes.INTEGER, // Thứ tự trong hàng chờ (Waitlist FIFO)
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'classId']
    }
  ]
});

export default Registration;
