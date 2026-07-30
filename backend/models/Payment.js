import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semester: {
    type: DataTypes.STRING, // Học kỳ đóng học phí (vd: "HK1-2026")
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER, // Số tiền gốc (số tín chỉ * 500.000 VNĐ)
    allowNull: false
  },
  discountRate: {
    type: DataTypes.FLOAT, // Tỷ lệ giảm (0.0: không giảm, 0.5: giảm 50%, 1.0: miễn phí 100%)
    defaultValue: 0.0
  },
  finalAmount: {
    type: DataTypes.INTEGER, // Số tiền thực tế phải nộp sau giảm trừ
    allowNull: false
  },
  paidAmount: {
    type: DataTypes.INTEGER, // Tổng số tiền ngân hàng/PDT đã xác nhận thực nhận
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('paid', 'unpaid'), // Trạng thái thanh toán (đã đóng, chưa đóng)
    defaultValue: 'unpaid'
  },
  deadline: {
    type: DataTypes.DATEONLY, // Hạn đóng học phí
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING, // Phương thức: Online, Bank, QR
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING, // Mã giao dịch ngân hàng đối soát
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE, // Ngày nộp thực tế
    allowNull: true
  },
  discountReason: {
    type: DataTypes.STRING, // Lý do miễn giảm / Tên học bổng
    allowNull: true
  },
  notes: {
    type: DataTypes.STRING, // Ghi chú gạch nợ thủ công / bổ sung
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'semester']
    }
  ]
});

export default Payment;
