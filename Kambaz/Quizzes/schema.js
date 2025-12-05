import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  _id: String,
  courseId: { type: String, required: true, ref: "CourseModel" },
  title: { type: String, required: true },
  description: String,
  quizType: {
    type: String,
    enum: ["graded-quiz", "practice-quiz", "graded-survey", "ungraded-survey"],
    default: "graded-quiz",
  },
  points: { type: Number, default: 0 },
  assignmentGroup: {
    type: String,
    enum: ["quizzes", "exams", "assignments", "project"],
    default: "quizzes",
  },
  shuffleAnswers: { type: Boolean, default: true },
  timeLimit: { type: Number, default: 20 }, // in minutes
  multipleAttempts: { type: Boolean, default: false },
  attemptsAllowed: { type: Number, default: 1 },
  showCorrectAnswers: {
    type: String,
    enum: ["always", "after-submission", "after-due-date", "never"],
    default: "after-submission",
  },
  accessCode: String,
  oneQuestionAtATime: { type: Boolean, default: true },
  webcamRequired: { type: Boolean, default: false },
  lockQuestionsAfterAnswering: { type: Boolean, default: false },
  dueDate: String,
  availableDate: String,
  availableUntilDate: String,
  published: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { collection: "quizzes" });

export default quizSchema;

