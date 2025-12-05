import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  _id: String,
  quizId: { type: String, required: true, ref: "QuizModel" },
  type: {
    type: String,
    enum: ["multiple-choice", "true-false", "fill-blank"],
    required: true,
  },
  title: String,
  points: { type: Number, default: 1 },
  question: String,
  // For multiple-choice
  choices: [String],
  correctChoiceIndex: Number, // For backward compatibility (single answer)
  correctChoiceIndices: [Number], // For multiple correct answers
  // For true-false
  correctAnswer: Boolean,
  // For fill-blank
  correctAnswers: [String],
}, { collection: "questions" });

export default questionSchema;

