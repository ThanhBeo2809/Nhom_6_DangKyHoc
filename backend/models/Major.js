import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Major = sequelize.define('Major', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  departmentId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false
});

export default Major;
