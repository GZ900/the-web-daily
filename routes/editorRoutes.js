const express = require("express");

const {
  requireEditor
} = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireEditor,
  (req, res) => {
    res.render("editor/dashboard", {
      pageTitle: "Editor Dashboard"
    });
  }
);

module.exports = router;