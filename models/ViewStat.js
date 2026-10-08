const mongoose = require("mongoose");

const viewStatSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true
    },

    bucketStart: {
      type: Date,
      required: true
    },

    views: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

viewStatSchema.index(
  {
    article: 1,
    bucketStart: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model("ViewStat", viewStatSchema);