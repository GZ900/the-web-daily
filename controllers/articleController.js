const Article =
  require("../models/Article");

const Comment =
  require("../models/Comment");

const ViewStat =
  require("../models/ViewStat");

require("../models/User");

function getFiveMinuteBucket() {
  const bucket =
    new Date();

  const roundedMinutes =
    Math.floor(
      bucket.getUTCMinutes() / 5
    ) * 5;

  bucket.setUTCMinutes(
    roundedMinutes,
    0,
    0
  );

  return bucket;
}

async function getArticle(req, res) {
  try {
    const article =
      await Article.findOneAndUpdate(
        {
          _id: req.params.id,

          publishedVersion: {
            $ne: null
          }
        },
        {
          $inc: {
            totalViews: 1
          }
        },
        {
          new: true
        }
      )
        .populate(
          "author",
          "displayName"
        )
        .lean();

    if (!article) {
      return res
        .status(404)
        .send(
          "Article not found"
        );
    }

    const bucketStart =
      getFiveMinuteBucket();

    try {
      await ViewStat.updateOne(
        {
          article:
            article._id,

          bucketStart
        },
        {
          $inc: {
            views: 1
          }
        },
        {
          upsert: true
        }
      );
    } catch (viewError) {
      console.error(
        "View statistics error:",
        viewError
      );
    }

    const comments =
      await Comment.find({
        article:
          article._id
      })
        .sort({
          createdAt: -1
        })
        .lean();

    res.render(
      "article",
      {
        pageTitle:
          article
            .publishedVersion
            .title,

        article,
        comments
      }
    );
  } catch (error) {
    console.error(
      "Article page error:",
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
  getArticle
};