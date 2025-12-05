import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

export function findQuestionsForQuiz(quizId) {
  return model.find({ quizId: quizId });
}

export function findQuestionById(questionId) {
  return model.findById(questionId);
}

export function createQuestion(question) {
  delete question._id; // MongoDB will generate _id
  const newQuestion = { ...question, _id: uuidv4() };
  return model.create(newQuestion);
}

export function updateQuestion(questionId, questionUpdates) {
  return model.findOneAndUpdate(
    { _id: questionId },
    { $set: questionUpdates },
    { new: true }
  );
}

export function deleteQuestion(questionId) {
  return model.deleteOne({ _id: questionId });
}

export function deleteQuestionsForQuiz(quizId) {
  return model.deleteMany({ quizId: quizId });
}

