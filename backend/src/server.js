import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import mammoth from "mammoth";
import multer from "multer";
import path from "path";
import pdf from "pdf-parse";

import analyze from "./analyzer.js";
import connectDB from "./config/db.js";
import authMiddleware from "./middleware/auth.js";
import Resume from "./models/resume.js";
import User from "./models/user.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ---------- extract resume text ---------- */
async function extractText(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === ".pdf") {
    const data = await pdf(buffer);
    return data.text || "";
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  return buffer.toString();
}

/* ---------- health ---------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ---------- auth: register ---------- */
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Registration failed",
      detail: String(error),
    });
  }
});

/* ---------- auth: login ---------- */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Login failed",
      detail: String(error),
    });
  }
});

/* ---------- auth: me ---------- */
app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user",
      detail: String(error),
    });
  }
});

/* ---------- analyze ---------- */
app.post("/analyze", authMiddleware, upload.single("resume"), async (req, res) => {
  try {
    const jd = req.body.jobDescription;

    if (!jd) {
      return res.status(400).json({ error: "Job description required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Resume file required" });
    }

    const resumeText = await extractText(req.file.path, req.file.originalname);
    fs.unlink(req.file.path, () => {});

    const result = analyze(resumeText, jd);

    const matched = result.matchedKeywords;
    const missing = result.missingKeywords;
    const score = result.score;
    const suggestions = result.suggestions;
    const categoryBreakdown = result.categoryBreakdown;

    await Resume.create({
      userId: req.user.userId,
      fileName: req.file.originalname,
      jobDescription: jd,
      score,
      matchedKeywords: matched.slice(0, 15),
      missingKeywords: missing.slice(0, 15),
      suggestions,
      categoryBreakdown,
    });

    res.json({
      score,
      matchedKeywords: matched.slice(0, 15),
      missingKeywords: missing.slice(0, 15),
      suggestions,
      categoryBreakdown,
    });
  } catch (error) {
    res.status(500).json({
      error: "Server error",
      detail: String(error),
    });
  }
});

/* ---------- analyses with search/filter/sort/pagination ---------- */
app.get("/analyses", authMiddleware, async (req, res) => {
  try {
    const {
      search = "",
      minScore = "",
      sortBy = "latest",
      page = 1,
      limit = 5,
    } = req.query;

    const query = {
      userId: req.user.userId,
    };

    if (search.trim()) {
      query.fileName = { $regex: search, $options: "i" };
    }

    if (minScore !== "") {
      query.score = { $gte: Number(minScore) };
    }

    let sortOption = { createdAt: -1 };

    if (sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sortBy === "highest") {
      sortOption = { score: -1 };
    } else if (sortBy === "lowest") {
      sortOption = { score: 1 };
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 5, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Resume.countDocuments(query);

    const analyses = await Resume.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    res.json({
      analyses,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch analyses",
      detail: String(error),
    });
  }
});

/* ---------- delete analysis ---------- */
app.delete("/analyses/:id", authMiddleware, async (req, res) => {
  try {
    const deletedAnalysis = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!deletedAnalysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    res.json({
      message: "Analysis deleted successfully",
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete analysis",
      detail: String(error),
    });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});