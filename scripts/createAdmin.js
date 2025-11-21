import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const createDefaultAdmin = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bookwise');
    console.log('✅ Connected to MongoDB');

    // التحقق من وجود مسؤول مسبقاً
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      await mongoose.connection.close();
      process.exit(0);
    }

    // إنشاء المسؤول الافتراضي
    const admin = new Admin({
      username: 'loay',
      password: 'loay123',
      role: 'superadmin'
    });

    await admin.save();
    console.log('✅ Default admin user created successfully');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createDefaultAdmin();