// createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const username = process.env.ADMIN_USERNAME || 'admin';
const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('⚠️ Admin user already exists.');
      console.log(`🧑 Username: ${existingUser.username}`);
      console.log(`🔐 Role: ${existingUser.role}`);
      return process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const admin = new User({
      username,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user created successfully:');
    console.log(`🧑 Username: ${username}`);
    console.log(`🔑 Password: ${plainPassword}`);
    console.log('🛡️ Role: admin');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    process.exit(1);
  }
}

createAdmin();
