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
  choices: [String],
  correctChoiceIndex: Number,
  correctChoiceIndices: [Number],
  correctAnswer: Boolean,
  correctAnswers: [String],
}, { collection: "questions" });

export default questionSchema;

