import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.STRING, // Mã môn học (vd: INT101)
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3
  },
  prerequisiteId: {
    type: DataTypes.STRING, // Mã môn học tiên quyết (nếu có)
    allowNull: true
  },
  majorId: {
    type: DataTypes.STRING, // Thuộc ngành nào (nếu null là môn đại cương/chung)
    allowNull: true
  },
  term: {
    type: DataTypes.INTEGER, // Học kỳ đề xuất trong lộ trình (1 -> 8)
    allowNull: true,
    defaultValue: 1
  }
}, {
  timestamps: false
});

export default Course;
