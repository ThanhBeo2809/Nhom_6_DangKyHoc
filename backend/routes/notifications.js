import express from 'express';
import { Notification } from '../models/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getPagination, paginatedResponse } from '../utils/paginationHelper.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const where = { userId: req.user.id };
    if (req.query.unread === 'true') where.isRead = false;

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    return res.json(paginatedResponse(rows, count, page, limit));
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải thông báo.' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.user.id, isRead: false }
    });
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể đếm thông báo.' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!notification) return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    return res.json(notification);
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật thông báo.' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId: req.user.id, isRead: false } }
    );
    return res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật thông báo.' });
  }
});

export default router;
