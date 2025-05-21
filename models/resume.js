const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  filename: String,
  text: String,
  category: String,
  score: Number
});

module.exports = mongoose.model('Resume', resumeSchema);
