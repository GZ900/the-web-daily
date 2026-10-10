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
  createUser,
  updateUser,
  deleteUser,

  updateComment,
  deleteComment,

  listViewStats,
  createViewStat,
  updateViewStat,
  deleteViewStat
} = require(
  "../controllers/adminController"
);

const {
  requireReporter,
  requireEditor
} = require(
  "../middleware/auth"
);

const router =
  express.Router();

/*
  PUBLIC
*/

router.get(
  "/articles",
  getFeedArticles
);

router.post(
  "/articles/:id/comments",
  createComment
);

/*
  REPORTER
*/

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

/*
  EDITOR ARTICLES
*/

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

/*
  USER CRUD
*/

router.post(
  "/editor/users",
  requireEditor,
  createUser
);

router.patch(
  "/editor/users/:id",
  requireEditor,
  updateUser
);

router.delete(
  "/editor/users/:id",
  requireEditor,
  deleteUser
);

/*
  COMMENT CRUD
*/

router.patch(
  "/editor/comments/:id",
  requireEditor,
  updateComment
);

router.delete(
  "/editor/comments/:id",
  requireEditor,
  deleteComment
);

/*
  VIEWSTAT CRUD
*/

router.get(
  "/editor/view-stats",
  requireEditor,
  listViewStats
);

router.post(
  "/editor/view-stats",
  requireEditor,
  createViewStat
);

router.patch(
  "/editor/view-stats/:id",
  requireEditor,
  updateViewStat
);

router.delete(
  "/editor/view-stats/:id",
  requireEditor,
  deleteViewStat
);

module.exports = router;