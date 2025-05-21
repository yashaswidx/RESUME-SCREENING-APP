require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Resume = require('../models/resume');
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_MODEL = process.env.GEMINI_API_MODEL; // e.g., gemini-pro
const GEMINI_API_URL = process.env.GEMINI_API_URL;     // e.g., https://generativelanguage.googleapis.com/v1beta

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithGemini(prompt, retries = 5) {
  const url = `${GEMINI_API_URL}/models/${GEMINI_API_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  while (retries > 0) {
    try {
      const response = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' }
      });

      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error('Gemini API returned empty content.');
      return content;

    } catch (error) {
      console.error('💥 Gemini API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 429 && retries > 1) {
        console.warn('⏳ Rate limit hit. Retrying in 3 seconds...');
        await delay(3000);
        retries--;
      } else {
        throw new Error(`Gemini API failed: ${error.message}`);
      }
    }
  }

  throw new Error('Gemini API failed after maximum retries.');
}

async function processResumes(req, res) {
  try {
    const jd = req.body.jd;
    const files = req.files;
    const results = [];

    if (!jd || !files || files.length === 0) {
      return res.status(400).json({ error: 'Missing job description or resumes.' });
    }

    const maxFiles = 100;
    const filesToProcess = files.slice(0, maxFiles);

    for (const file of filesToProcess) {
      const filePath = path.join(__dirname, '../uploads', file.filename);
      const fileBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(fileBuffer);
      const resumeText = pdfData.text;

      const prompt = `
      you are a seasoned technical recuiter, having more than a decade of experience in sourcing, screening, shortlisting candidates based on the job description.
Job Description:
${jd}

Resume:
${resumeText}

Classify the resume into one of the following categories: best, good, average, bad, or not fit.
Also give a matching score between 0 and 100.

Format:
Category: <category>
Score: <score>
      `.trim();

      await delay(3000); // Space out API requests to avoid throttling
      const output = await generateWithGemini(prompt);

      const categoryMatch = output.match(/Category:\s*(.+)/i);
      const scoreMatch = output.match(/Score:\s*(\d+)/i);

      const category = categoryMatch ? categoryMatch[1].toLowerCase().trim() : 'not fit';
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      const resume = new Resume({ filename: file.filename, text: resumeText, category, score });
      await resume.save();

      results.push({ filename: file.filename, category, score });
    }

    const top10 = results.sort((a, b) => b.score - a.score).slice(0, 10);
    res.json({ top10, allResults: results });

  } catch (error) {
    console.error('❌ Resume processing failed:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).send('Error processing resumes');
  }
}

module.exports = { processResumes };
