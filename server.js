require('dotenv').config(); // Ensure dotenv is at the top to load .env variables

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));

// Set up session for user authentication
app.use(session({
  secret: 'your-secret-key', // Use a strong secret in production
  resave: false,
  saveUninitialized: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('Error connecting to MongoDB:', err));

// Define User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true }
});

// Create unique indexes to prevent duplicate emails and usernames
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

// Define Feedback Schema and Model
const feedbackSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Route for Registration Page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// Route for Login Page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Route for Feedback Page
app.get('/feedback', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'feedback.html'));
});

// Route for Registration Form Submission
app.post('/adduser', async (req, res) => {
  const { username, email, password, address, city, state, pincode } = req.body;

  try {
    // Check if a user already exists with the same email or username
    const existingUser = await User.findOne({
      $or: [
        { email },            // Check if the email already exists
        { username }          // Check if the username already exists
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).send('You have already registered with this email.');
      }
      if (existingUser.username === username) {
        return res.status(400).send('You have already registered with this username.');
      }
    }

    // Check if a user already exists with the same address (address, city, state, pincode)
    const existingAddress = await User.findOne({
      address,
      city,
      state,
      pincode
    });

    if (existingAddress) {
      return res.status(400).send('You have already registered with this address.');
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user object
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      address,
      city,
      state,
      pincode
    });

    // Save the new user to the database
    await newUser.save();

    // Redirect to login page after successful registration
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Error registering user: ' + error);
  }
});

// Route for Login Form Submission
app.post('/addlogin', (req, res) => {
  const { username, password } = req.body;

  User.findOne({ username })
    .then(async (user) => {
      if (user) {
        // Compare entered password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          req.session.user = user; // Store user data in session
          res.redirect('/');  // Redirect to home page
        } else {
          res.send('Invalid credentials');
        }
      } else {
        res.send('User not found');
      }
    })
    .catch(err => res.status(500).send('Error during login: ' + err));
});

// Route for Feedback Form Submission
app.post('/addData', (req, res) => {
  const { feedback_name, feedback_email, feedback_message } = req.body;

  const newFeedback = new Feedback({
    name: feedback_name,
    email: feedback_email,
    message: feedback_message
  });

  newFeedback.save()
    .then(() => res.send('Feedback submitted successfully!'))
    .catch(err => res.status(500).send('Error submitting feedback: ' + err));
});

// Home Route (only accessible after login)
app.get('/', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route to fetch all users
app.get('/get-users', (req, res) => {
  User.find()  // Fetch all users from the MongoDB 'users' collection
    .then(users => {
      res.json(users);  // Send the users data as a JSON response
    })
    .catch(err => res.status(500).send('Error fetching users: ' + err));
});



// Define the schema for contact messages
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

// Create the model
const Contact = mongoose.model('Contact', contactSchema);

// Serve the Contact Us page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/contact.html');
});

// Handle form submissions
app.post('/contact', async (req, res) => {
  try {
    const { contact_name, contact_email, contact_subject, contact_message } = req.body;

    // Save the contact message to the database
    const newContact = new Contact({
      name: contact_name,
      email: contact_email,
      subject: contact_subject,
      message: contact_message,
    });

    await newContact.save();
    res.send('<h2>Thank you for reaching out! We will get back to you shortly.</h2>');
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).send('<h2>There was an error processing your request. Please try again later.</h2>');
  }
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
