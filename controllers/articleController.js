const mongoose =
  require("mongoose");

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
      bucket.getUTCMinutes() /
      5
    ) * 5;

  bucket.setUTCMinutes(
    roundedMinutes,
    0,
    0
  );

  return bucket;
}

async function incrementViewStat(
  articleId,
  bucketStart
) {
  try {
    await ViewStat.updateOne(
      {
        article:
          articleId,

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
  } catch (error) {
    /*
      Two readers may try to create
      the same new bucket at exactly
      the same time.

      The unique compound index can
      make one upsert receive E11000.
      Retry it as a normal increment.
    */
    if (
      error &&
      error.code === 11000
    ) {
      await ViewStat.updateOne(
        {
          article:
            articleId,

          bucketStart
        },
        {
          $inc: {
            views: 1
          }
        }
      );

      return;
    }

    throw error;
  }
}

async function getArticle(
  req,
  res
) {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .send(
          "Invalid article ID"
        );
    }

    const article =
      await Article
        .findOneAndUpdate(
          {
            _id:
              req.params.id,

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
      await incrementViewStat(
        article._id,
        bucketStart
      );
    } catch (viewError) {
      /*
        Analytics failure should not
        prevent the reader from seeing
        the published article.
      */
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

    return res.render(
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

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

module.exports = {
  getArticle
};