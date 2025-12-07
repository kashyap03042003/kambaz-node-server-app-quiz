import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export function findAttemptsForQuiz(quizId) {
  return model.find({ quizId: quizId }).sort({ submittedAt: -1 });
}

export function findAttemptsForStudent(quizId, studentId) {
  return model.find({ quizId: quizId, studentId: studentId }).sort({ submittedAt: -1 });
}

export function createAttempt(attempt) {
  delete attempt._id;
  const newAttempt = { ...attempt, _id: uuidv4(), submittedAt: new Date().toISOString() };
  return model.create(newAttempt);
}

export function findAttemptById(attemptId) {
  return model.findById(attemptId);
}

