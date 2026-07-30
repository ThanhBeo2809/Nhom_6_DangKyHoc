import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false
});

export default Department;
