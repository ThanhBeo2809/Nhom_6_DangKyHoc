import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DataTypes } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import DB & Models
import sequelize from './config/db.js';
import { seedMockData } from './mockData.js';
import { Student, User } from './models/index.js';
import { verifyAccessToken } from './utils/authSecurityHelper.js';

// Import Routes
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import lecturerRoutes from './routes/lecturer.js';
import pdtRoutes from './routes/pdt.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhook.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

// Khởi tạo Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
    methods: ['GET', 'POST']
  }
});

// Lưu instance io vào app để các route có thể truy cập
app.set('io', io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.id);
    if (!user || user.status !== 'active' || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return next(new Error('Unauthorized'));
    }
    socket.user = payload;
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

// Quản lý kết nối Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Socket kết nối: ${socket.id}`);

  // Sinh viên đăng ký phòng riêng theo studentId để nhận thông báo thanh toán
  socket.on('join_student_room', async (studentId) => {
    const student = await Student.findOne({ where: { id: studentId, userId: socket.user.id } });
    if (student) {
      socket.join(`student_${studentId}`);
      console.log(`👤 Socket ${socket.id} vào phòng student_${studentId}`);
    }
  });

  socket.on('join_user_room', () => {
    socket.join(`user_${socket.user.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket ngắt kết nối: ${socket.id}`);
  });
});

// Middleware
app.set('trust proxy', 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin không được phép bởi CORS.'));
  }
}));
// 8 MB Excel files expand by roughly 33% when transported as Base64.
app.use(express.json({ limit: '12mb' }));
app.use(morgan('dev'));

// Cung cấp các file tĩnh từ thư mục frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/pdt', pdtRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback phục vụ Single Page App frontend
app.get('*', (req, res, next) => {
  // Chỉ chuyển hướng nếu không phải gọi API
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Đồng bộ cơ sở dữ liệu và khởi động Server
async function startServer() {
  try {
    // Đồng bộ CSDL (Tự động cập nhật cột mới nếu thiếu bằng alter: true)
    const forceSync = process.env.DB_SYNC_FORCE === 'true';
    try {
      await sequelize.sync({ force: forceSync });
      const queryInterface = sequelize.getQueryInterface();
      const userColumns = await queryInterface.describeTable('Users');
      if (!userColumns.tokenVersion) {
        await queryInterface.addColumn('Users', 'tokenVersion', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        });
      }
      try { await sequelize.query("ALTER TABLE Payments ADD COLUMN discountReason VARCHAR(255);"); } catch (e) {}
      try { await sequelize.query("ALTER TABLE Payments ADD COLUMN notes VARCHAR(255);"); } catch (e) {}
      const paymentColumns = await queryInterface.describeTable('Payments');
      if (!paymentColumns.paidAmount) {
        await queryInterface.addColumn('Payments', 'paidAmount', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        });
        // Preserve historical settled invoices. Any known mismatch can then be
        // corrected from its audit trail without losing the original payment.
        await sequelize.query(
          "UPDATE Payments SET paidAmount = finalAmount WHERE status = 'paid' AND finalAmount > 0;"
        );
      }
    } catch (syncErr) {
      console.error('Lỗi sync CSDL:', syncErr);
      if (process.env.NODE_ENV === 'production') throw syncErr;
    }
    if (forceSync) {
      console.log('🔄 Đã xóa và đồng bộ lại cấu trúc Cơ sở dữ liệu (Force Reset).');
    } else {
      console.log('🔄 Đã đồng bộ cấu trúc Cơ sở dữ liệu và bảo toàn dữ liệu hiện có.');
    }

    // Nạp dữ liệu mẫu ban đầu
    if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true') {
      await seedMockData();
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(`💻 Mở trình duyệt truy cập: http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO đã sẵn sàng nhận kết nối real-time.`);
    });
  } catch (error) {
    console.error('❌ Không thể khởi động server:', error);
    process.exitCode = 1;
    await sequelize.close().catch(() => {});
  }
}

startServer();

async function shutdown(signal) {
  console.log(`Nhận ${signal}, đang đóng kết nối an toàn...`);
  io.close();
  httpServer.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
