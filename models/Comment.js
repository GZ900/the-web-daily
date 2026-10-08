const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
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
      index: true
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({
  article: 1,
  createdAt: -1
});

module.exports = mongoose.model("Comment", commentSchema);