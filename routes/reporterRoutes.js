const express = require("express");

const {
  requireReporter
} = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireReporter,
  (req, res) => {
    res.render("reporter/dashboard", {
      pageTitle: "Reporter Dashboard"
    });
  }
);

module.exports = router;