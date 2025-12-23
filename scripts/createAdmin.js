// scripts/createAdmin.js
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    const admin = new Admin({
      username: 'ziad',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'ziad4321',
      role: 'superadmin',
      isActive: true
    });
    
    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: ' + (process.env.ADMIN_INITIAL_PASSWORD || 'admin123'));
    console.log('⚠️  Change this password immediately after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();