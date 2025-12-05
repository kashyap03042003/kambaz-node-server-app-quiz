import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export function findQuizzesForCourse(courseId) {
  return model.find({ courseId: courseId });
}

export function findQuizById(quizId) {
  return model.findById(quizId);
}

export function createQuiz(quiz) {
  delete quiz._id; // MongoDB will generate _id
  const newQuiz = { ...quiz, _id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  return model.create(newQuiz);
}

export function updateQuiz(quizId, quizUpdates) {
  return model.findOneAndUpdate(
    { _id: quizId },
    { $set: { ...quizUpdates, updatedAt: new Date().toISOString() } },
    { new: true }
  );
}

export function deleteQuiz(quizId) {
  return model.deleteOne({ _id: quizId });
}

