// isAuthenticated.js

const isAuthenticated = (req, res, next) => {
  // Check if the user is stored in the session
  if (req.session && req.session.user) {
    return next(); // User is authenticated, proceed to the next middleware or route handler
  }

  // If not authenticated, redirect to the login page
  req.flash('error', 'Unauthorized. Please log in.');
  res.redirect('/login');
};

module.exports = isAuthenticated;