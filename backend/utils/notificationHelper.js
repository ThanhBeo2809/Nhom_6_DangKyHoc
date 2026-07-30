import { Notification } from '../models/index.js';

export async function createNotification({
  userId,
  type = 'info',
  title,
  message,
  data = null,
  io = null,
  transaction
}) {
  if (!userId || !title || !message) return null;

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    data: data ? JSON.stringify(data) : null
  }, { transaction });

  if (io) {
    io.to(`user_${userId}`).emit('notification_created', notification.toJSON());
  }

  return notification;
}
