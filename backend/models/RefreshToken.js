import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  replacedByTokenHash: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  createdByIp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  revokedByIp: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['userId', 'revokedAt'] },
    { fields: ['expiresAt'] }
  ]
});

export default RefreshToken;
