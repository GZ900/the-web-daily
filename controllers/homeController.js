const Article = require("../models/Article");
const { getWeather } = require("../services/weatherService");
require("../models/User");

// Only approved public fields are needed for homepage previews.
const CARD_FIELDS = [
  "publishedVersion.title", "publishedVersion.summary",
  "publishedVersion.category", "publishedVersion.imageUrl",
  "author", "publishedAt", "totalViews"
].join(" ");
// Small, bounded editorial previews; the All Stories feed keeps its 20-item batch.
const EDITORIAL_LIMITS = {
  Technology: 4, Business: 6, World: 5,
  Culture: 4, Science: 5, Environment: 6
};
const NEWEST = { publishedAt: -1, _id: -1 };

async function getHome(req, res) {
  try {
    // A public article can also have a private draft/pending/returned revision.
    const publicFilter = { publishedVersion: { $ne: null } };
    const [articles, categoryResults, popularArticles, weather] = await Promise.all([
      Article.find(publicFilter).select(CARD_FIELDS)
        .populate("author", "displayName").sort(NEWEST)
        .limit(20).lean().exec(),
      Article.distinct("publishedVersion.category", publicFilter).exec(),
      Article.find(publicFilter).select(CARD_FIELDS)
        .populate("author", "displayName")
        .sort({ totalViews: -1, publishedAt: -1, _id: -1 })
        .limit(4).lean().exec(),
      getWeather()
    ]);

    const categories = categoryResults.filter(Boolean).sort((a, b) => a.localeCompare(b));
    // Ordering preferences never introduce a category absent from public data.
    const preferredTopics = Object.keys(EDITORIAL_LIMITS);
    const topics = [
      ...preferredTopics.filter(category => categories.includes(category)),
      ...categories.filter(category => !preferredTopics.includes(category))
    ];
    const categorySections = await Promise.all(topics.filter(category => preferredTopics.includes(category)).map(async category => ({
      category,
      articles: await Article.find({ ...publicFilter, "publishedVersion.category": category })
        .select(CARD_FIELDS).populate("author", "displayName")
        .sort(NEWEST).limit(EDITORIAL_LIMITS[category]).lean().exec()
    })));

    res.render("home", {
      pageTitle: "The Web Daily",
      articles, categories, topics, weather, popularArticles,
      topStories: articles.slice(0, 4), categorySections
    });
  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = { getHome };
