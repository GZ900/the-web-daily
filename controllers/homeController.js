const Article =
  require("../models/Article");

const {
  getWeather
} = require(
  "../services/weatherService"
);

require("../models/User");

async function getHome(req, res) {
  try {
    const [
      articles,
      categoryResults,
      weather
    ] = await Promise.all([
      Article.find({
        publishedVersion: {
          $ne: null
        }
      })
        .populate(
          "author",
          "displayName"
        )
        .sort({
          publishedAt: -1
        })
        .limit(20)
        .lean()
        .exec(),

      Article.distinct(
        "publishedVersion.category",
        {
          publishedVersion: {
            $ne: null
          }
        }
      ).exec(),

      getWeather()
    ]);

    const categories =
      categoryResults
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b)
        );

    res.render("home", {
      pageTitle:
        "The Web Daily",

      articles,
      categories,
      weather
    });
  } catch (error) {
    console.error(
      "Home page error:",
      error
    );

    res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

module.exports = {
  getHome
};