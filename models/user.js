const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  attendance: [
    {
      date: { type: String, required: true },
      timeIn: { type: String, required: true },
      timeOut: { type: String, required: true },
    },
  ],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
