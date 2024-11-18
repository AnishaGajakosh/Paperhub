const express = require('express');
const bcrypt = require('bcrypt');  // To hash passwords
const User = require('../models/User');  // User model
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
  const { fullName, email, username, password, address, city, state, pincode } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(400).json({ message: 'Email or Username already exists' });
  }

  // Hash the password before saving it
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = new User({
      fullName,
      email,
      username,
      password: hashedPassword,
      address,
      city,
      state,
      pincode,
    });

    await newUser.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});

module.exports = router;
