const Article = require("../models/Article");
require("../models/User");

async function getHome(req, res) {
  try {
    const articles = await Article.find({
      status: "published",
      publishedVersion: { $ne: null }
    })
      .populate("author", "displayName")
      .sort({ publishedAt: -1 })
      .limit(20);

    res.render("home", {
      pageTitle: "The Web Daily",
      articles
    });
  } catch (error) {
    console.error("Home page error:", error);

    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  getHome
};