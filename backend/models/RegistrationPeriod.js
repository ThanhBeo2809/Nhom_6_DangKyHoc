import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const RegistrationPeriod = sequelize.define('RegistrationPeriod', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  termId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['termId', 'startAt', 'endAt'] },
    { fields: ['isEnabled'] }
  ]
});

export default RegistrationPeriod;
