const express = require('express');
const app = express();
const port = 3000;
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const flash = require('connect-flash');
const MongoDBStore = require('connect-mongodb-session')(session);
const User = require('./models/user');
const isAuthenticated = require('./middlewares/isAuthenticated');
const dbconfig = require('./middlewares/dbconfig');
const url = dbconfig.url;
const dbName = dbconfig.dbName;

const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/excelDb',
  collection: 'sessions',
});

// Catch errors
store.on('error', function (error) {
  console.error(error);
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    // Remove the 'store' option for now
  })
);
app.use(flash());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

app.use((req, res, next) => {
  console.log('Flash messages:', req.flash());
  next();
});
// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/excelDb');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if unable to connect
  }
}

// Call the async function to connect to MongoDB
connectToMongoDB();

app.get('/', async (req, res) => {
  res.redirect('/login'); 
});

// Update the login route to use 'id' instead of 'employeeId'
app.get('/login', (req, res) => {
  console.log('Flash messages on /login GET:', req.flash('error')); // Add this line for debugging
  res.render('login', { messages: req.flash('error') });
});

app.post('/login', async (req, res) => {
  const { id, password } = req.body;

  try {
    const user = await User.findOne({ id });

    if (!user || user.password !== password) {
      const errorMessage = 'Invalid username or password';
      console.log('Flash message set:', errorMessage); // Add this line for debugging
      req.flash('error', errorMessage);
      console.log('Redirecting to /login'); // Add this line for debugging
    } else {
      console.log('Login successful. User:', user); // Add this line for debugging
      req.session.user = user;
      res.redirect('/dashboard');
      return; // Exit the function to avoid executing the code below when successful
    }

    // If unsuccessful login, render the login page with flash message
    res.render('login', { messages: req.flash('error') });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const client = new MongoClient(url);
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection('users');

    // Fetch additional data from the database using the user's ID
    const data = await collection.find({ id: req.session.user.id }).toArray();

    // Retrieve success flash message (if any)
    const successMessage = req.flash('success');
    console.log('Success message after rendering:', successMessage);
    
    res.render('dashboard', {
      id: req.session.user.id,
      name: req.session.user.name,
      department: req.session.user.department,
      attendance: req.session.user.attendance,
      data: data,
      successMessage: successMessage,  // Pass the success message to the template
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/detail', async (req, res) => {
  try {
    const selectedDate = req.query.date;
    const userId = req.session.user.id; // Assuming user ID is stored in the session

    const client = new MongoClient(url);
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection('users');

    // Find the entry corresponding to the selected date for the logged-in user
    const user = await collection.findOne({ id: userId });
    const index = user.dates.indexOf(selectedDate);

    if (index !== -1) {
      const selectedTimeIn = user.timeIn[index];
      const selectedTimeOut = user.timeOut[index];

      // Calculate how late the check-in is (assuming max arrival time is 08:30)
      const maxArrivalTime = '08:30';
      const isLate = selectedTimeIn > maxArrivalTime;

      res.render('detail', {
        selectedDate,
        selectedTimeIn,
        selectedTimeOut,
        isLate,
        maxArrivalTime,
      });
    } else {
      res.status(404).send('Data not found for the selected date');
    }
  } catch (error) {
    console.error('Error fetching data for detail:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/change-password', isAuthenticated, (req, res) => {
  res.render('change-password', { user: req.session.user });
});

app.post('/change-password', isAuthenticated, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;

  try {
    const user = await User.findOne({ id: userId });

    // Check if the old password is correct
    if (user.password !== oldPassword) {
      return res.redirect('/dashboard');
    }

    // Check if the new password and confirm password match
    if (newPassword !== confirmPassword) {
      return res.redirect('/dashboard');
    }

    // Update the password in the database
    user.password = newPassword;
    await user.save();

    // Optionally, you can also update the session with the new user information
    req.session.user.password = newPassword;

    // Redirect to /flash-messages after changing the password successfully
    return res.redirect('/flash-messages');
  } catch (error) {
    console.error('Error changing password:', error);
    // Redirect to /flash-messages for internal server error
    return res.redirect('/flash-messages');
  }
});

app.get('/flash-messages', (req, res) => {
  // Retrieve success flash message (if any)
  const successMessage = req.flash('success');
  console.log('Success flash message on /flash-messages:', successMessage);

  // Render a simple page to display the flash messages
  res.render('flash-messages', { successMessage });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during logout:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/login');
    }
  });
});


const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  console.log('Closing server...');
  await server.close();
  console.log('Server closed.');
  process.exit(0);
});

module.exports = server;
