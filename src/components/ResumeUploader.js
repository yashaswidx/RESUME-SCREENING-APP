import React, { useState } from 'react';
import axios from 'axios';
import './ResumeUploader.css';

const ResumeUploader = () => {
  const [files, setFiles] = useState([]);
  const [jd, setJd] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!jd || files.length === 0) {
      setError('Please upload at least one PDF and enter a job description.');
      return;
    }

    const formData = new FormData();
    for (let file of files) {
      formData.append('resumes', file);
    }
    formData.append('jd', jd);

    try {
      setLoading(true);
      const res = await axios.post('http://localhost:5000/api/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data);
    } catch (err) {
      setError('❌ Failed to process resumes. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setJd('');
    setResults(null);
    setError('');
  };

  const handleExport = () => {
    if (!results) return;

    const csvRows = [
      ['Filename', 'Category', 'Score'],
      ...results.allResults.map((res) => [res.filename, res.category, res.score])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume_results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="resume-app">
      <h1>Resume Screener </h1>

      <form className="resume-form" onSubmit={handleSubmit}>
        <label>Job Description:</label>
        <textarea
          rows="6"
          placeholder="Paste the job description here..."
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />

        <label>Upload Resumes (PDF):</label>
        <input type="file" multiple accept=".pdf" onChange={handleFileChange} />

        <div className="form-buttons">
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Submit'}
          </button>
          <button type="button" onClick={handleReset}>Reset</button>
        </div>

        {error && <div className="error">{error}</div>}
      </form>

      {results && (
        <div className="results">
          <div className="export-section">
            <h2>Top 10 Matching Resumes</h2>
            <button className="export-button" onClick={handleExport}>Export to CSV</button>
          </div>

          <ul>
            {results.top10.map((res, index) => (
              <li key={index}>
                <strong>{res.filename}</strong> — 
                <span className={`tag ${res.category}`}>{res.category}</span>
                <div className="bar-container">
                  <div className="score-bar" style={{ width: `${res.score}%` }}>
                    {res.score}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <h3>All Categorized Resumes ({results.allResults.length})</h3>
          <ul>
            {results.allResults.map((res, index) => (
               <li key={index}>
                  {res.filename} —
                  <span className={`tag ${res.category.replace(/\s/g, '-')}`}>{res.category}</span>
                  <div className="bar-container">
                    <div className="score-bar" style={{ width: `${res.score}%` }}>
                      {res.score}
                    </div>
                  </div>
                </li>
  ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResumeUploader;
