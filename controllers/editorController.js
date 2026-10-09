const Article = require("../models/Article");
const Comment = require("../models/Comment");
const ViewStat = require("../models/ViewStat");

require("../models/User");

async function getDashboard(req, res) {
  try {
    const allowedStatuses = [
      "draft",
      "pending",
      "published",
      "returned"
    ];

    const filter = {};

    if (
      req.query.status &&
      allowedStatuses.includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    const articles = await Article.find(filter)
      .populate("author", "displayName username")
      .sort({ updatedAt: -1 });

    res.render("editor/dashboard", {
      pageTitle: "Editor Dashboard",
      articles,
      selectedStatus: req.query.status || ""
    });
  } catch (error) {
    console.error("Editor dashboard error:", error);

    res.status(500).send("Internal Server Error");
  }
}

async function getReviewArticle(req, res) {
  try {
    const article = await Article.findById(
      req.params.id
    ).populate(
      "author",
      "displayName username"
    );

    if (!article) {
      return res
        .status(404)
        .send("Article not found");
    }

    res.render("editor/review", {
      pageTitle: "Review Article",
      article
    });
  } catch (error) {
    console.error(
      "Editor review error:",
      error
    );

    res.status(500).send(
      "Internal Server Error"
    );
  }
}

async function updateArticle(req, res) {
  try {
    const article = await Article.findById(
      req.params.id
    );

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    if (article.status !== "pending") {
      return res.status(409).json({
        message:
          "Only pending articles can be edited during review"
      });
    }

    const {
      title,
      summary,
      content,
      category,
      imageUrl
    } = req.body;

    article.workingVersion.title =
      String(title || "").trim();

    article.workingVersion.summary =
      String(summary || "").trim();

    article.workingVersion.content =
      String(content || "");

    article.workingVersion.category =
      String(category || "").trim();

    article.workingVersion.imageUrl =
      String(imageUrl || "").trim();

    await article.save();

    res.json({
      message: "Article changes saved"
    });
  } catch (error) {
    console.error(
      "Editor update error:",
      error
    );

    res.status(500).json({
      message: "Unable to save changes"
    });
  }
}

async function approveArticle(req, res) {
  try {
    const article = await Article.findById(
      req.params.id
    );

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    if (article.status !== "pending") {
      return res.status(409).json({
        message:
          "Only pending articles can be approved"
      });
    }

    const version = article.workingVersion;

    if (
      !version.title ||
      !version.summary ||
      !version.content ||
      !version.category
    ) {
      return res.status(400).json({
        message:
          "Article is missing required fields"
      });
    }

    const publishTime = new Date();

    article.publishedVersion = {
      title: version.title,
      summary: version.summary,
      content: version.content,
      category: version.category,
      imageUrl: version.imageUrl
    };

    article.status = "published";
    article.editorNote = "";

    if (!article.publishedAt) {
      article.publishedAt = publishTime;
    }

    article.publicationHistory.push({
      publishedAt: publishTime,
      editor: req.user._id
    });

    await article.save();

    res.json({
      message: "Article published successfully"
    });
  } catch (error) {
    console.error(
      "Approve article error:",
      error
    );

    res.status(500).json({
      message: "Unable to publish article"
    });
  }
}

async function returnArticle(req, res) {
  try {
    const article = await Article.findById(
      req.params.id
    );

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    if (article.status !== "pending") {
      return res.status(409).json({
        message:
          "Only pending articles can be returned"
      });
    }

    const note = String(
      req.body.note || ""
    ).trim();

    if (!note) {
      return res.status(400).json({
        message:
          "An editor note is required"
      });
    }

    article.status = "returned";
    article.editorNote = note;

    await article.save();

    res.json({
      message:
        "Article returned to reporter"
    });
  } catch (error) {
    console.error(
      "Return article error:",
      error
    );

    res.status(500).json({
      message: "Unable to return article"
    });
  }
}

async function deleteArticle(req, res) {
  try {
    const article = await Article.findById(
      req.params.id
    );

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    await Comment.deleteMany({
      article: article._id
    });

    await ViewStat.deleteMany({
      article: article._id
    });

    await article.deleteOne();

    res.json({
      message: "Article deleted"
    });
  } catch (error) {
    console.error(
      "Delete article error:",
      error
    );

    res.status(500).json({
      message: "Unable to delete article"
    });
  }
}

module.exports = {
  getDashboard,
  getReviewArticle,
  updateArticle,
  approveArticle,
  returnArticle,
  deleteArticle
};