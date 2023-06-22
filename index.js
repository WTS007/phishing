// index.js
//test the code
// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

// Create the Express app
const app = express();

// Set up middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Connect to the database
mongoose
  .connect('mongodb://localhost:27017/society_dashboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Database connection error:', error);
  });

// Define a society registration schema and model
const societySchema = new mongoose.Schema({
  name: String,
  registrationNumber: String,
  // Add other required fields
});
const Society = mongoose.model('Society', societySchema);

// Define a user schema and model for authentication
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model('User', userSchema);

// Passport configuration
passport.use(
  new LocalStrategy((username, password, done) => {
    User.findOne({ username: username })
      .then((user) => {
        if (!user) {
          return done(null, false, { message: 'Incorrect username' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) {
            return done(err);
          }
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Incorrect password' });
          }
        });
      })
      .catch((error) => {
        return done(error);
      });
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error);
    });
});

// Handle user registration
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to register user' });
    }
    const newUser = new User({
      username,
      password: hash,
    });
    newUser
      .save()
      .then(() => {
        res.status(201).json({ message: 'User registered successfully' });
      })
      .catch((error) => {
        res.status(500).json({ error: 'Failed to register user' });
      });
  });
});

// Handle user login
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.status(200).json({ message: 'Login successful' });
});

// Handle user logout
app.get('/api/logout', (req, res) => {
  req.logout();
  res.status(200).json({ message: 'Logout successful' });
});

// Protected route for societies data
app.get('/api/societies', isAuthenticated, (req, res) => {
  Society.find()
    .then((societies) => {
      res.status(200).json(societies);
    })
    .catch((error) => {
      res.status(500).json({ error: 'Failed to fetch societies data' });
    });
});

// Helper function to check authentication
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// ...
app.use(express.static('public'));
// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
