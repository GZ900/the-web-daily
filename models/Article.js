const mongoose = require("mongoose");

const articleVersionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: ""
    },

    summary: {
      type: String,
      trim: true,
      default: ""
    },

    content: {
      type: String,
      default: ""
    },

    category: {
      type: String,
      trim: true,
      default: ""
    },

    imageUrl: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    _id: false
  }
);

const publicationHistorySchema = new mongoose.Schema(
  {
    publishedAt: {
      type: Date,
      required: true
    },

    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    _id: false
  }
);

const articleSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["draft", "pending", "published", "returned"],
      default: "draft"
    },

    workingVersion: {
      type: articleVersionSchema,
      default: () => ({})
    },

    publishedVersion: {
      type: articleVersionSchema,
      default: null
    },

    editorNote: {
      type: String,
      trim: true,
      default: ""
    },

    publishedAt: {
      type: Date,
      default: null
    },

    publicationHistory: {
      type: [publicationHistorySchema],
      default: []
    },

    totalViews: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Article", articleSchema);