import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AcademicTerm = sequelize.define('AcademicTerm', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('planned', 'active', 'closed'),
    allowNull: false,
    defaultValue: 'planned'
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['isCurrent'] },
    { fields: ['status'] }
  ]
});

export default AcademicTerm;
