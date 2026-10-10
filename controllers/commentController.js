const mongoose =
  require("mongoose");

const Article =
  require("../models/Article");

const Comment =
  require("../models/Comment");

const MAX_NAME_LENGTH =
  80;

const MAX_COMMENT_LENGTH =
  2000;

const RATE_LIMIT_COUNT =
  3;

const RATE_LIMIT_WINDOW_MS =
  60 * 1000;

/*
  Serialize simultaneous comment
  requests from the same device.

  This prevents several concurrent
  requests on this Node process from
  all passing the count check before
  any of them is written to MongoDB.
*/
const deviceQueues =
  new Map();

function runForDevice(
  deviceIdentifier,
  operation
) {
  const previous =
    deviceQueues.get(
      deviceIdentifier
    ) ||
    Promise.resolve();

  const current =
    previous
      .catch(() => {})
      .then(operation);

  deviceQueues.set(
    deviceIdentifier,
    current
  );

  const cleanup =
    () => {
      if (
        deviceQueues.get(
          deviceIdentifier
        ) === current
      ) {
        deviceQueues.delete(
          deviceIdentifier
        );
      }
    };

  current.then(
    cleanup,
    cleanup
  );

  return current;
}

async function createComment(
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
        .json({
          message:
            "Invalid article ID"
        });
    }

    const article =
      await Article.findOne({
        _id:
          req.params.id,

        /*
          Public visibility is based
          on the existence of an
          approved published version.

          The article may currently be
          draft, pending or returned
          while a new revision is being
          worked on.
        */
        publishedVersion: {
          $ne: null
        }
      })
        .select("_id")
        .lean();

    if (!article) {
      return res
        .status(404)
        .json({
          message:
            "Article not found"
        });
    }

    const name =
      String(
        req.body.name ||
        ""
      ).trim();

    const text =
      String(
        req.body.text ||
        ""
      ).trim();

    if (
      !name ||
      !text
    ) {
      return res
        .status(400)
        .json({
          message:
            "Name and comment are required"
        });
    }

    if (
      name.length >
        MAX_NAME_LENGTH ||
      text.length >
        MAX_COMMENT_LENGTH
    ) {
      return res
        .status(400)
        .json({
          message:
            "Comment is too long"
        });
    }

    if (
      !req.deviceIdentifier
    ) {
      return res
        .status(500)
        .json({
          message:
            "Unable to identify commenting device"
        });
    }

    const result =
      await runForDevice(
        req.deviceIdentifier,

        async () => {
          const oneMinuteAgo =
            new Date(
              Date.now() -
              RATE_LIMIT_WINDOW_MS
            );

          const recentCommentCount =
            await Comment.countDocuments(
              {
                deviceIdentifier:
                  req.deviceIdentifier,

                createdAt: {
                  $gte:
                    oneMinuteAgo
                }
              }
            );

          if (
            recentCommentCount >=
            RATE_LIMIT_COUNT
          ) {
            return {
              rateLimited:
                true
            };
          }

          const comment =
            await Comment.create({
              article:
                article._id,

              name,
              text,

              deviceIdentifier:
                req.deviceIdentifier
            });

          return {
            rateLimited:
              false,

            comment
          };
        }
      );

    if (
      result.rateLimited
    ) {
      res.set(
        "Retry-After",
        "60"
      );

      return res
        .status(429)
        .json({
          message:
            "You can post up to 3 comments per minute"
        });
    }

    return res
      .status(201)
      .json({
        comment: {
          id:
            result.comment._id,

          name:
            result.comment.name,

          text:
            result.comment.text,

          createdAt:
            result.comment.createdAt
        }
      });
  } catch (error) {
    if (
      error &&
      error.name ===
      "ValidationError"
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message
        });
    }

    console.error(
      "Create comment error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Internal Server Error"
      });
  }
}

module.exports = {
  createComment
};