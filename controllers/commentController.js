const Article = require("../models/Article");
const Comment = require("../models/Comment");

async function createComment(req, res) {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      status: "published",
      publishedVersion: { $ne: null }
    });

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    const name = String(req.body.name || "").trim();
    const text = String(req.body.text || "").trim();

    if (!name || !text) {
      return res.status(400).json({
        message: "Name and comment are required"
      });
    }

    if (name.length > 80 || text.length > 2000) {
      return res.status(400).json({
        message: "Comment is too long"
      });
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentCommentCount = await Comment.countDocuments({
      deviceIdentifier: req.deviceIdentifier,
      createdAt: {
        $gte: oneMinuteAgo
      }
    });

    if (recentCommentCount >= 3) {
      return res.status(429).json({
        message: "You can post up to 3 comments per minute"
      });
    }

    const comment = await Comment.create({
      article: article._id,
      name,
      text,
      deviceIdentifier: req.deviceIdentifier
    });

    res.status(201).json({
      comment: {
        id: comment._id,
        name: comment.name,
        text: comment.text,
        createdAt: comment.createdAt
      }
    });
  } catch (error) {
    console.error("Create comment error:", error);

    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}

module.exports = {
  createComment
};