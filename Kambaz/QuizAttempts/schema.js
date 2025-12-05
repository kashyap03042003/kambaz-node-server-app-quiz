import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema({
  _id: String,
  quizId: { type: String, required: true, ref: "QuizModel" },
  studentId: { type: String, required: true, ref: "UserModel" },
  answers: mongoose.Schema.Types.Mixed, // Record<string, any> - questionId -> answer
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  submittedAt: { type: String, default: () => new Date().toISOString() },
  attemptNumber: { type: Number, default: 1 },
}, { collection: "quizAttempts" });

export default quizAttemptSchema;

