const mongoose = require("mongoose");

const articleVersionSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
      },

      summary: {
        type: String,
        trim: true,
        maxlength: 600,
        default: ""
      },

      content: {
        type: String,
        maxlength: 50000,
        default: ""
      },

      category: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ""
      },

      imageUrl: {
        type: String,
        trim: true,
        maxlength: 2048,
        default: ""
      }
    },
    {
      _id: false
    }
  );

const publicationHistorySchema =
  new mongoose.Schema(
    {
      publishedAt: {
        type: Date,
        required: true
      },

      editor: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        required: true
      }
    },
    {
      _id: false
    }
  );

const articleSchema =
  new mongoose.Schema(
    {
      author: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",
        required: true
      },

      status: {
        type: String,

        enum: [
          "draft",
          "pending",
          "published",
          "returned"
        ],

        required: true,
        default: "draft"
      },

      // Order autosaves from one editor page, including its final exit save.
      autosaveClient: { type: String, default: "" },
      autosaveSequence: { type: Number, default: 0 },

      workingVersion: {
        type:
          articleVersionSchema,

        default:
          () => ({})
      },

      publishedVersion: {
        type:
          articleVersionSchema,

        default: null
      },

      editorNote: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ""
      },

      publishedAt: {
        type: Date,
        default: null
      },

      publicationHistory: {
        type: [
          publicationHistorySchema
        ],

        default: []
      },

      totalViews: {
        type: Number,
        default: 0,
        min: 0,

        validate: {
          validator:
            Number.isInteger,

          message:
            "Total views must be an integer"
        }
      }
    },
    {
      timestamps: true
    }
  );

/*
  Reporter dashboard:
  own articles ordered by update time.
*/
articleSchema.index({
  author: 1,
  updatedAt: -1
});

/*
  Reporter/editor status filtering.
*/
articleSchema.index({
  author: 1,
  status: 1,
  updatedAt: -1
});

articleSchema.index({
  status: 1,
  updatedAt: -1
});

/*
  Public feed sorting.
*/
articleSchema.index({
  publishedAt: -1,
  _id: -1
});

articleSchema.index({
  totalViews: -1,
  publishedAt: -1,
  _id: -1
});

module.exports =
  mongoose.model(
    "Article",
    articleSchema
  );