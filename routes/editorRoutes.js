const express =
  require("express");

const {
  getDashboard,
  getReviewArticle
} = require(
  "../controllers/editorController"
);

const {
  getAnalyticsPage
} = require(
  "../controllers/analyticsController"
);

const {
  getUsersPage,
  getCommentsPage
} = require(
  "../controllers/adminController"
);

const {
  requireEditor
} = require(
  "../middleware/auth"
);

const router =
  express.Router();

router.use(
  requireEditor
);

router.get(
  "/",
  getDashboard
);

router.get(
  "/analytics",
  getAnalyticsPage
);

router.get(
  "/users",
  getUsersPage
);

router.get(
  "/comments",
  getCommentsPage
);

router.get(
  "/articles/:id",
  getReviewArticle
);

module.exports = router;