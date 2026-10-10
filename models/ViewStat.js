const mongoose = require("mongoose");

const viewStatSchema =
  new mongoose.Schema(
    {
      article: {
        type:
          mongoose.Schema.Types
            .ObjectId,

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
        min: 0,

        validate: {
          validator:
            Number.isInteger,

          message:
            "Views must be an integer"
        }
      }
    },
    {
      timestamps: true
    }
  );

/*
  Prevent duplicate time buckets and
  efficiently support analytics queries
  for one article over a time range.
*/
viewStatSchema.index(
  {
    article: 1,
    bucketStart: 1
  },
  {
    unique: true
  }
);

module.exports =
  mongoose.model(
    "ViewStat",
    viewStatSchema
  );