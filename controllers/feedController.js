const mongoose = require("mongoose");
const Article = require("../models/Article");

require("../models/User");

const PAGE_SIZE = 20;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getFeedArticles(req, res) {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const category = String(
      req.query.category || ""
    ).trim();

    const sort = String(
      req.query.sort || "newest"
    );

    const viewed = String(
      req.query.viewed || "all"
    );

    const viewedIds = String(
      req.query.viewedIds || ""
    )
      .split(",")
      .filter(id =>
        mongoose.isValidObjectId(id)
      );

    const filter = {
      publishedVersion: {
        $ne: null
      }
    };

    if (search) {
      filter["publishedVersion.title"] = {
        $regex: escapeRegex(search),
        $options: "i"
      };
    }

    if (category) {
      filter["publishedVersion.category"] =
        category;
    }

    if (viewed === "viewed") {
      if (viewedIds.length === 0) {
        return res.json({
          articles: [],
          hasMore: false
        });
      }

      filter._id = {
        $in: viewedIds
      };
    }

    if (
      viewed === "unviewed" &&
      viewedIds.length > 0
    ) {
      filter._id = {
        $nin: viewedIds
      };
    }

    const sortOption =
      sort === "popular"
        ? {
            totalViews: -1,
            publishedAt: -1
          }
        : {
            publishedAt: -1
          };

    const articles = await Article.find(
      filter
    )
      .populate(
        "author",
        "displayName"
      )
      .sort(sortOption)
      .skip(
        (page - 1) * PAGE_SIZE
      )
      .limit(PAGE_SIZE + 1)
      .lean();

    const hasMore =
      articles.length > PAGE_SIZE;

    const pageArticles =
      articles.slice(
        0,
        PAGE_SIZE
      );

    res.json({
      articles: pageArticles.map(
        article => ({
          id: article._id,
          title:
            article.publishedVersion.title,
          summary:
            article.publishedVersion.summary,
          category:
            article.publishedVersion.category,
          imageUrl:
            article.publishedVersion.imageUrl,
          author:
            article.author.displayName,
          publishedAt:
            article.publishedAt,
          totalViews:
            article.totalViews
        })
      ),

      hasMore
    });
  } catch (error) {
    console.error(
      "Feed API error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load articles"
    });
  }
}

module.exports = {
  getFeedArticles
};