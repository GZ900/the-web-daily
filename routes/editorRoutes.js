const express = require("express");

const {
  requireEditor
} = require("../middleware/auth");

const {
  getDashboard,
  getReviewArticle
} = require("../controllers/editorController");

const router = express.Router();

router.use(requireEditor);

router.get("/", getDashboard);

router.get(
  "/articles/:id",
  getReviewArticle
);

module.exports = router;