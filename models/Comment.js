const mongoose = require("mongoose");

const commentSchema =
  new mongoose.Schema(
    {
      article: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Article",
        required: true
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
      },

      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
      },

      deviceIdentifier: {
        type: String,
        required: true,
        maxlength: 128
      }
    },
    {
      timestamps: true
    }
  );

/*
  Loading comments for one article.
*/
commentSchema.index({
  article: 1,
  createdAt: -1
});

/*
  Rate-limit query:
  comments from one device
  during a recent time window.
*/
commentSchema.index({
  deviceIdentifier: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "Comment",
    commentSchema
  );