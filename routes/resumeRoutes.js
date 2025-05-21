const express = require('express');
const multer = require('multer');
const path = require('path');
const { processResumes } = require('../controllers/resumeController');

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

router.post('/upload', upload.array('resumes'), processResumes);

module.exports = router;
