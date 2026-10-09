const express = require("express");

const {
  createComment
} = require("../controllers/commentController");

const router = express.Router();

router.post("/articles/:id/comments", createComment);

module.exports = router;