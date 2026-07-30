import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.STRING, // Mã lớp học phần (vd: INT101_L01)
    primaryKey: true
  },
  courseId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lecturerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roomName: {
    type: DataTypes.STRING, // Phòng học (vd: A101)
    allowNull: false
  },
  roomType: {
    type: DataTypes.ENUM('theory', 'lab'), // Loại phòng: Lý thuyết hoặc Thực hành
    allowNull: false,
    defaultValue: 'theory'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 40
  },
  semester: {
    type: DataTypes.STRING, // Học kỳ (vd: "HK1-2026")
    allowNull: false
  },
  dayOfWeek: {
    type: DataTypes.INTEGER, // Ngày trong tuần (2: Thứ 2, 3: Thứ 3, ..., 7: Thứ 7)
    allowNull: false
  },
  shift: {
    type: DataTypes.ENUM('morning', 'afternoon'), // Ca học: sáng hoặc chiều
    allowNull: false
  },
  startSlot: {
    type: DataTypes.INTEGER, // Tiết bắt đầu (1 đến 6)
    allowNull: false
  },
  numSlots: {
    type: DataTypes.INTEGER, // Số tiết học (thường là 3 tiết)
    allowNull: false,
    defaultValue: 3
  },
  status: {
    type: DataTypes.ENUM('active', 'canceled'), // Trạng thái lớp (bình thường hoặc bị hủy do thiếu sĩ số)
    defaultValue: 'active'
  }
}, {
  timestamps: true
});

export default Class;
