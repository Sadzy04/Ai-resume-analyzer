import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  matchedKeywords: {
    type: [String],
    default: [],
  },
  missingKeywords: {
    type: [String],
    default: [],
  },
  suggestions: {
    type: [String],
    default: [],
  },
  categoryBreakdown: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;