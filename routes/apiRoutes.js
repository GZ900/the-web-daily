const express = require("express");

const {
  createComment
} = require("../controllers/commentController");

const {
  autosaveArticle,
  submitArticle
} = require("../controllers/reporterController");

const {
  requireReporter
} = require("../middleware/auth");

const router = express.Router();

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

module.exports = router;