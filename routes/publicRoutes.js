const express = require("express");

const { getHome } = require("../controllers/homeController");
const { getArticle } = require("../controllers/articleController");

const router = express.Router();

router.get("/", getHome);

router.get("/articles/:id", getArticle);

module.exports = router;