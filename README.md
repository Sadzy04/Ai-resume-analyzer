# AI Resume Analyzer

An intelligent web application that analyzes resumes against a given job description and provides a compatibility score, matched skills, missing keywords, category-wise breakdown, and actionable improvement suggestions.

This project is designed to help users understand how well their resume aligns with a target role and identify areas for optimization before applying.

---

## Features

- User authentication with secure login and registration
- JWT-based authorization for protected routes
- Resume upload support for PDF and DOCX files
- Rule-based AI resume analysis
- Job description vs resume skill matching
- Compatibility scoring system
- Missing keyword detection
- Category-wise technical skill breakdown
- Resume improvement suggestions
- Analysis history with search, sort, filter, and pagination
- Delete saved analyses

---

## Tech Stack

### Frontend
- React.js
- Axios
- React Router
- CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Multer
- pdf-parse
- mammoth

---

## Project Structure

```text
AI-Resume-Analyzer/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── user.js
│   │   │   └── resume.js
│   │   ├── analyzer.js
│   │   └── server.js
│   ├── uploads/
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
└── README.md
