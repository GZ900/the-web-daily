const express = require("express");

const {
  requireReporter
} = require("../middleware/auth");

const {
  getDashboard,
  createArticle,
  getEditArticle
} = require("../controllers/reporterController");

const router = express.Router();

router.use(requireReporter);

router.get("/", getDashboard);

router.post("/articles", createArticle);

router.get(
  "/articles/:id/edit",
  getEditArticle
);

module.exports = router;