import * as dao from "./dao.js";
import * as questionDao from "../Questions/dao.js";
import * as attemptDao from "../QuizAttempts/dao.js";
import * as courseDao from "../Courses/dao.js";
import * as enrollmentDao from "../Enrollments/dao.js";

export default function QuizRoutes(app) {
  // Get quizzes for a course
  const findQuizzesForCourse = async (req, res) => {
    try {
      const { courseId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }

      const quizzes = await dao.findQuizzesForCourse(courseId);
      // Get all questions and attempts (we'll filter by quizId in memory)
      // Note: This is inefficient but matches the original pattern

      // For students, only show published quizzes
      let courseQuizzes = quizzes;
      if (currentUser.role === "STUDENT") {
        courseQuizzes = quizzes.filter(q => q.published);
      }

      // Add question count and score for students
      const quizzesWithDetails = await Promise.all(courseQuizzes.map(async (quiz) => {
        const quizQuestions = await questionDao.findQuestionsForQuiz(quiz._id);
        const quizData = {
          ...quiz.toObject(),
          questionCount: quizQuestions.length,
        };

        if (currentUser.role === "STUDENT") {
          const studentAttempts = await attemptDao.findAttemptsForStudent(quiz._id, currentUser._id);
          
          if (studentAttempts && studentAttempts.length > 0) {
            const lastAttempt = studentAttempts[0];
            quizData.score = lastAttempt.score;
            quizData.totalPoints = lastAttempt.totalPoints;
          }
        }

        return quizData;
      }));

      res.json(quizzesWithDetails);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Get quiz by ID
  const findQuizById = async (req, res) => {
    try {
      const { quizId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user has access to the course (via enrollment)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);

      if (!isEnrolled) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      if (currentUser.role === "STUDENT" && !quiz.published) {
        res.status(403).json({ message: "Quiz not available" });
        return;
      }

      res.json(quiz);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Create quiz (faculty only)
  const createQuiz = async (req, res) => {
    try {
      const { courseId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "FACULTY") {
        res.sendStatus(401);
        return;
      }

      // Check if user is enrolled in the course (faculty who created it will be enrolled)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);
      
      if (!isEnrolled || currentUser.role !== "FACULTY") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const newQuiz = await dao.createQuiz({
        courseId,
        title: "New Quiz",
        description: "",
        quizType: "graded-quiz",
        points: 0,
        assignmentGroup: "quizzes",
        shuffleAnswers: true,
        timeLimit: 20,
        multipleAttempts: false,
        attemptsAllowed: 1,
        showCorrectAnswers: "after-submission",
        accessCode: "",
        oneQuestionAtATime: true,
        webcamRequired: false,
        lockQuestionsAfterAnswering: false,
        dueDate: null,
        availableDate: null,
        availableUntilDate: null,
        published: false,
      });

      res.status(201).json(newQuiz);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Update quiz (faculty only)
  const updateQuiz = async (req, res) => {
    try {
      const { quizId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "FACULTY") {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user is enrolled in the course (faculty who created it will be enrolled)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);
      
      if (!isEnrolled || currentUser.role !== "FACULTY") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const updatedQuiz = await dao.updateQuiz(quizId, req.body);
      res.json(updatedQuiz);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Delete quiz (faculty only)
  const deleteQuiz = async (req, res) => {
    try {
      const { quizId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "FACULTY") {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user is enrolled in the course (faculty who created it will be enrolled)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);
      
      if (!isEnrolled || currentUser.role !== "FACULTY") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      await dao.deleteQuiz(quizId);
      // Delete all questions for this quiz
      await questionDao.deleteQuestionsForQuiz(quizId);

      res.json({ message: "Quiz deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Publish/Unpublish quiz (faculty only)
  const publishQuiz = async (req, res) => {
    try {
      const { quizId } = req.params;
      const { published } = req.body;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "FACULTY") {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user is enrolled in the course (faculty who created it will be enrolled)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);
      
      if (!isEnrolled || currentUser.role !== "FACULTY") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const updatedQuiz = await dao.updateQuiz(quizId, { published });
      res.json(updatedQuiz);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Get questions for a quiz
  const findQuestionsForQuiz = async (req, res) => {
    try {
      const { quizId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user has access to the course (via enrollment)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);

      if (!isEnrolled) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const questions = await questionDao.findQuestionsForQuiz(quizId);
      res.json(questions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Add/Update question (faculty only)
  const createOrUpdateQuestion = async (req, res) => {
    try {
      const { quizId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "FACULTY") {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user is enrolled in the course (faculty who created it will be enrolled)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);
      
      if (!isEnrolled || currentUser.role !== "FACULTY") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const questionData = req.body;
      let newQuestion;

      if (questionData._id && questionData._id.trim() !== "") {
        // Update existing question
        newQuestion = await questionDao.updateQuestion(questionData._id, questionData);
      } else {
        // Create new question
        if (questionData.type === "multiple-choice") {
          const mcqData = {
            quizId,
            type: "multiple-choice",
            title: questionData.title || "",
            points: questionData.points || 1,
            question: questionData.question || "",
            choices: questionData.choices || ["", ""],
          };
          // Support both single and multiple correct answers
          if (questionData.correctChoiceIndices && questionData.correctChoiceIndices.length > 0) {
            mcqData.correctChoiceIndices = questionData.correctChoiceIndices;
          } else if (questionData.correctChoiceIndex !== undefined) {
            // Backward compatibility: convert single to array
            mcqData.correctChoiceIndices = [questionData.correctChoiceIndex];
          } else {
            mcqData.correctChoiceIndices = [0];
          }
          newQuestion = await questionDao.createQuestion(mcqData);
        } else if (questionData.type === "true-false") {
          newQuestion = await questionDao.createQuestion({
            quizId,
            type: "true-false",
            title: questionData.title || "",
            points: questionData.points || 1,
            question: questionData.question || "",
            correctAnswer: questionData.correctAnswer ?? true,
          });
        } else if (questionData.type === "fill-blank") {
          newQuestion = await questionDao.createQuestion({
            quizId,
            type: "fill-blank",
            title: questionData.title || "",
            points: questionData.points || 1,
            question: questionData.question || "",
            correctAnswers: questionData.correctAnswers || [""],
          });
        } else {
          res.status(400).json({ message: "Invalid question type" });
          return;
        }
      }

      // Update quiz points
      const questions = await questionDao.findQuestionsForQuiz(quizId);
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      await dao.updateQuiz(quizId, { points: totalPoints });

      res.json(newQuestion);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Delete question (faculty only)
  const deleteQuestion = async (req, res) => {
    try {
      const { quizId, questionId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "FACULTY") {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      // Check if user is enrolled in the course (faculty who created it will be enrolled)
      const enrolledUsers = await enrollmentDao.findUsersForCourse(quiz.courseId);
      const isEnrolled = enrolledUsers.some(u => u._id === currentUser._id);
      
      if (!isEnrolled || currentUser.role !== "FACULTY") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      await questionDao.deleteQuestion(questionId);

      // Update quiz points
      const questions = await questionDao.findQuestionsForQuiz(quizId);
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      await dao.updateQuiz(quizId, { points: totalPoints });

      res.json({ message: "Question deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Submit quiz attempt (student only)
  const submitQuizAttempt = async (req, res) => {
    try {
      const { quizId } = req.params;
      const { answers, accessCode } = req.body;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser || currentUser.role !== "STUDENT") {
        res.sendStatus(401);
        return;
      }

      const quiz = await dao.findQuizById(quizId);
      if (!quiz) {
        res.status(404).json({ message: "Quiz not found" });
        return;
      }

      if (!quiz.published) {
        res.status(403).json({ message: "Quiz not available" });
        return;
      }

      // Check access code
      if (quiz.accessCode && quiz.accessCode !== accessCode) {
        res.status(403).json({ message: "Invalid access code" });
        return;
      }

      // Check attempts
      const studentAttempts = await attemptDao.findAttemptsForStudent(quizId, currentUser._id);
      
      if (quiz.multipleAttempts) {
        if (studentAttempts.length >= quiz.attemptsAllowed) {
          res.status(403).json({ message: "Maximum attempts reached" });
          return;
        }
      } else {
        if (studentAttempts.length > 0) {
          res.status(403).json({ message: "Quiz already attempted" });
          return;
        }
      }

      // Grade the quiz
      const questions = await questionDao.findQuestionsForQuiz(quizId);
      let score = 0;
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      // Create gradedAnswers object for detailed feedback
      const gradedAnswers = {};

      questions.forEach((question) => {
        const studentAnswer = answers[question._id];
        let correct = false;
        let correctAnswer = null;

        if (question.type === "multiple-choice") {
          // Support both single and multiple correct answers
          const correctIndices = question.correctChoiceIndices && question.correctChoiceIndices.length > 0
            ? question.correctChoiceIndices
            : (question.correctChoiceIndex !== undefined ? [question.correctChoiceIndex] : []);
          
          // Handle both single answer (number) and multiple answers (array)
          let studentAnswers = [];
          if (Array.isArray(studentAnswer)) {
            studentAnswers = studentAnswer.map(a => typeof a === "string" ? parseInt(a, 10) : Number(a)).filter(a => !isNaN(a));
          } else {
            const answerNum = typeof studentAnswer === "string" ? parseInt(studentAnswer, 10) : Number(studentAnswer);
            if (!isNaN(answerNum)) {
              studentAnswers = [answerNum];
            }
          }
          
          // Check if all selected answers are correct and all correct answers are selected
          const correctSet = new Set(correctIndices);
          const studentSet = new Set(studentAnswers);
          correct = studentAnswers.length === correctIndices.length &&
            studentAnswers.every(idx => correctSet.has(idx)) &&
            correctIndices.every(idx => studentSet.has(idx));
          
          correctAnswer = correctIndices;
          if (correct) {
            score += question.points;
          }
        } else if (question.type === "true-false") {
          correctAnswer = question.correctAnswer;
          const studentAnswerBool = typeof studentAnswer === "string" 
            ? studentAnswer.toLowerCase() === "true" 
            : Boolean(studentAnswer);
          correct = studentAnswerBool === question.correctAnswer;
          if (correct) {
            score += question.points;
          }
        } else if (question.type === "fill-blank") {
          // Handle fill-in-the-blank questions
          const correctAnswers = question.correctAnswers || [];
          if (correctAnswers.length === 0) {
            correct = false;
            correctAnswer = "No correct answers defined";
          } else {
            const studentAnswerStr = String(studentAnswer || "").toLowerCase().trim();
            // Check if student answer matches any of the correct answers (case-insensitive, trimmed)
            correct = correctAnswers.some(ca => {
              const correctAnswerStr = String(ca || "").toLowerCase().trim();
              return correctAnswerStr === studentAnswerStr;
            });
            correctAnswer = correctAnswers; // Return all correct answers for display
            if (correct) {
              score += question.points;
            }
          }
        }

        gradedAnswers[question._id] = {
          answer: studentAnswer,
          correct,
          correctAnswer,
        };
      });

      const newAttempt = await attemptDao.createAttempt({
        quizId,
        studentId: currentUser._id,
        answers,
        score,
        totalPoints,
        attemptNumber: studentAttempts.length + 1,
      });

      // Return attempt with gradedAnswers for immediate feedback
      res.json({
        ...newAttempt.toObject(),
        gradedAnswers,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Get quiz attempts
  const findQuizAttempts = async (req, res) => {
    try {
      const { quizId } = req.params;
      const currentUser = req.session["currentUser"];
      
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }

      let attempts;
      if (currentUser.role === "STUDENT") {
        attempts = await attemptDao.findAttemptsForStudent(quizId, currentUser._id);
      } else {
        attempts = await attemptDao.findAttemptsForQuiz(quizId);
      }

      // Add question details for grading
      const questions = await questionDao.findQuestionsForQuiz(quizId);
      const attemptsWithDetails = attempts.map((attempt) => {
        const gradedAnswers = {};
        
        questions.forEach((question) => {
          const studentAnswer = attempt.answers[question._id];
          let correct = false;
          let correctAnswer = null;

          if (question.type === "multiple-choice") {
            // Support both single and multiple correct answers
            const correctIndices = question.correctChoiceIndices && question.correctChoiceIndices.length > 0
              ? question.correctChoiceIndices
              : (question.correctChoiceIndex !== undefined ? [question.correctChoiceIndex] : []);
            
            // Handle both single answer (number) and multiple answers (array)
            let studentAnswers = [];
            if (Array.isArray(studentAnswer)) {
              studentAnswers = studentAnswer.map(a => typeof a === "string" ? parseInt(a, 10) : Number(a)).filter(a => !isNaN(a));
            } else {
              const answerNum = typeof studentAnswer === "string" ? parseInt(studentAnswer, 10) : Number(studentAnswer);
              if (!isNaN(answerNum)) {
                studentAnswers = [answerNum];
              }
            }
            
            // Check if all selected answers are correct and all correct answers are selected
            const correctSet = new Set(correctIndices);
            const studentSet = new Set(studentAnswers);
            correct = studentAnswers.length === correctIndices.length &&
              studentAnswers.every(idx => correctSet.has(idx)) &&
              correctIndices.every(idx => studentSet.has(idx));
            
            correctAnswer = correctIndices;
          } else if (question.type === "true-false") {
            correctAnswer = question.correctAnswer;
            const studentAnswerBool = typeof studentAnswer === "string" 
              ? studentAnswer.toLowerCase() === "true" 
              : Boolean(studentAnswer);
            correct = studentAnswerBool === question.correctAnswer;
          } else if (question.type === "fill-blank") {
            // Handle fill-in-the-blank questions
            const correctAnswers = question.correctAnswers || [];
            if (correctAnswers.length === 0) {
              correct = false;
              correctAnswer = "No correct answers defined";
            } else {
              const studentAnswerStr = String(studentAnswer || "").toLowerCase().trim();
              // Check if student answer matches any of the correct answers (case-insensitive, trimmed)
              correct = correctAnswers.some(ca => {
                const correctAnswerStr = String(ca || "").toLowerCase().trim();
                return correctAnswerStr === studentAnswerStr;
              });
              correctAnswer = correctAnswers; // Return all correct answers for display
            }
          }

          gradedAnswers[question._id] = {
            answer: studentAnswer,
            correct,
            correctAnswer,
          };
        });

        return {
          ...attempt.toObject(),
          gradedAnswers,
        };
      });

      res.json(attemptsWithDetails);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Routes
  app.get("/api/quizzes/course/:courseId", findQuizzesForCourse);
  app.get("/api/quizzes/:quizId", findQuizById);
  app.post("/api/quizzes/course/:courseId", createQuiz);
  app.put("/api/quizzes/:quizId", updateQuiz);
  app.delete("/api/quizzes/:quizId", deleteQuiz);
  app.patch("/api/quizzes/:quizId/publish", publishQuiz);
  app.get("/api/quizzes/:quizId/questions", findQuestionsForQuiz);
  app.post("/api/quizzes/:quizId/questions", createOrUpdateQuestion);
  app.delete("/api/quizzes/:quizId/questions/:questionId", deleteQuestion);
  app.post("/api/quizzes/:quizId/attempts", submitQuizAttempt);
  app.get("/api/quizzes/:quizId/attempts", findQuizAttempts);
}

