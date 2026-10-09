const express = require("express");

const {
  getLogin,
  login,
  logout
} = require("../controllers/authController");

const router = express.Router();

router.get("/login", getLogin);

router.post("/login", login);

router.post("/logout", logout);

module.exports = router;