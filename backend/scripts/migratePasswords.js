import bcrypt from 'bcryptjs';
import { sequelize, User } from '../models/index.js';

async function migratePasswords() {
  const users = await User.findAll();
  let migrated = 0;
  for (const user of users) {
    if (/^\$2[aby]\$\d{2}\$/.test(user.password || '')) continue;
    user.password = await bcrypt.hash(user.password, 10);
    await user.save({ hooks: false });
    migrated++;
  }
  console.log(`Đã băm ${migrated} mật khẩu cũ.`);
}

try {
  await migratePasswords();
} finally {
  await sequelize.close();
}
