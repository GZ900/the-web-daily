const express =
  require("express");

const {
  createComment
} = require(
  "../controllers/commentController"
);

const {
  autosaveArticle,
  submitArticle
} = require(
  "../controllers/reporterController"
);

const {
  updateArticle,
  approveArticle,
  returnArticle,
  deleteArticle
} = require(
  "../controllers/editorController"
);

const {
  getFeedArticles
} = require(
  "../controllers/feedController"
);

const {
  getArticleAnalytics
} = require(
  "../controllers/analyticsController"
);

const {
  requireReporter,
  requireEditor
} = require(
  "../middleware/auth"
);

const router =
  express.Router();

router.get(
  "/articles",
  getFeedArticles
);

router.post(
  "/articles/:id/comments",
  createComment
);

router.patch(
  "/reporter/articles/:id",
  requireReporter,
  autosaveArticle
);

router.patch(
  "/reporter/articles/:id/status",
  requireReporter,
  submitArticle
);

router.patch(
  "/editor/articles/:id",
  requireEditor,
  updateArticle
);

router.patch(
  "/editor/articles/:id/approve",
  requireEditor,
  approveArticle
);

router.patch(
  "/editor/articles/:id/return",
  requireEditor,
  returnArticle
);

router.delete(
  "/editor/articles/:id",
  requireEditor,
  deleteArticle
);

router.get(
  "/editor/articles/:id/analytics",
  requireEditor,
  getArticleAnalytics
);

module.exports = router;