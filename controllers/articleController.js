const Article = require("../models/Article");
const Comment = require("../models/Comment");
const ViewStat = require("../models/ViewStat");

require("../models/User");

function getHourBucket(date) {
  const bucket = new Date(date);

  bucket.setMinutes(0, 0, 0);

  return bucket;
}

async function getArticle(req, res) {
  try {
    const article = await Article.findOneAndUpdate(
      {
        _id: req.params.id,
        publishedVersion: { $ne: null }
      },
      {
        $inc: {
          totalViews: 1
        }
      },
      {
        new: true
      }
    ).populate("author", "displayName");

    if (!article) {
      return res.status(404).send("Article not found");
    }

    const bucketStart = getHourBucket(new Date());

    await ViewStat.findOneAndUpdate(
      {
        article: article._id,
        bucketStart
      },
      {
        $inc: {
          views: 1
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    const comments = await Comment.find({
      article: article._id
    }).sort({
      createdAt: -1
    });

    res.render("article", {
      pageTitle: article.publishedVersion.title,
      article,
      comments
    });
  } catch (error) {
    console.error("Article page error:", error);

    res.status(500).send("Internal Server Error");
  }
}

module.exports = {
  getArticle
};