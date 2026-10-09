const Article = require("../models/Article");

async function getDashboard(req, res) {
  try {
    const articles = await Article.find({
      author: req.user._id
    }).sort({
      updatedAt: -1
    });

    res.render("reporter/dashboard", {
      pageTitle: "Reporter Dashboard",
      articles
    });
  } catch (error) {
    console.error(
      "Reporter dashboard error:",
      error
    );

    res
      .status(500)
      .send("Internal Server Error");
  }
}

async function createArticle(req, res) {
  try {
    const article = await Article.create({
      author: req.user._id,
      status: "draft"
    });

    res.redirect(
      `/reporter/articles/${article._id}/edit`
    );
  } catch (error) {
    console.error(
      "Create article error:",
      error
    );

    res
      .status(500)
      .send("Internal Server Error");
  }
}

async function getEditArticle(req, res) {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!article) {
      return res
        .status(404)
        .send("Article not found");
    }

    if (article.status === "pending") {
      return res
        .status(403)
        .send(
          "Article is currently waiting for editor approval"
        );
    }

    res.render("reporter/edit", {
      pageTitle: "Edit Article",
      article
    });
  } catch (error) {
    console.error(
      "Edit article error:",
      error
    );

    res
      .status(500)
      .send("Internal Server Error");
  }
}

async function autosaveArticle(req, res) {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    if (article.status === "pending") {
      return res.status(409).json({
        message:
          "Article cannot be edited while waiting for approval"
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

    /*
      A published article becomes a new draft
      as soon as the reporter changes it.

      The existing publishedVersion is NOT changed,
      so readers continue seeing the last approved version.
    */
    if (article.status === "published") {
      article.status = "draft";
    }

    await article.save();

    res.json({
      message: "Saved",
      savedAt: new Date()
    });
  } catch (error) {
    console.error(
      "Autosave error:",
      error
    );

    res.status(500).json({
      message: "Unable to save article"
    });
  }
}

async function submitArticle(req, res) {
  try {
    const article = await Article.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!article) {
      return res.status(404).json({
        message: "Article not found"
      });
    }

    /*
      Only a draft or an article returned
      by the editor may be submitted.

      A published article first becomes draft
      when the reporter edits it.
    */
    if (
      !["draft", "returned"].includes(
        article.status
      )
    ) {
      return res.status(409).json({
        message:
          "Article cannot be submitted in its current state"
      });
    }

    const version =
      article.workingVersion;

    if (
      !version.title ||
      !version.summary ||
      !version.content ||
      !version.category
    ) {
      return res.status(400).json({
        message:
          "Title, summary, content and category are required"
      });
    }

    article.status = "pending";
    article.editorNote = "";

    await article.save();

    res.json({
      message:
        "Article submitted for editor approval"
    });
  } catch (error) {
    console.error(
      "Submit article error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to submit article"
    });
  }
}

module.exports = {
  getDashboard,
  createArticle,
  getEditArticle,
  autosaveArticle,
  submitArticle
};