import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true // Nullable nếu là thao tác tự động của hệ thống
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING, // Hành động: NHAP_DIEM, HUY_LOP, DONG_HOC_PHI...
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT, // Chi tiết thay đổi (lưu JSON dạng chuỗi hoặc mô tả trước/sau)
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  updatedAt: false // Chỉ ghi nhận thời điểm tạo log, không có update log
});

export default AuditLog;
