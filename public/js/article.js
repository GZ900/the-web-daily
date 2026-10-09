"use strict";

const articleElement =
  document.querySelector(
    ".article-page"
  );

const commentForm =
  document.querySelector(
    "#comment-form"
  );

const commentsList =
  document.querySelector(
    "#comments-list"
  );

const commentMessage =
  document.querySelector(
    "#comment-message"
  );

function markArticleAsViewed(
  articleId
) {
  try {
    const key =
      "webDailyViewedArticles";

    const current =
      JSON.parse(
        localStorage.getItem(
          key
        ) || "[]"
      );

    if (
      !current.includes(
        articleId
      )
    ) {
      current.push(
        articleId
      );

      localStorage.setItem(
        key,
        JSON.stringify(
          current
        )
      );
    }
  } catch (error) {
    console.error(
      "Unable to save viewed article:",
      error
    );
  }
}

if (articleElement) {
  const articleId =
    articleElement.dataset.articleId;

  markArticleAsViewed(
    articleId
  );

  if (commentForm) {
    commentForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        const nameInput =
          document.querySelector(
            "#comment-name"
          );

        const textInput =
          document.querySelector(
            "#comment-text"
          );

        const name =
          nameInput.value.trim();

        const text =
          textInput.value.trim();

        commentMessage.textContent =
          "";

        try {
          const response =
            await fetch(
              `/api/articles/${articleId}/comments`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    name,
                    text
                  })
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            commentMessage.textContent =
              data.message ||
              "Unable to add comment";

            return;
          }

          const commentElement =
            document.createElement(
              "article"
            );

          commentElement.className =
            "comment";

          const nameElement =
            document.createElement(
              "strong"
            );

          nameElement.textContent =
            data.comment.name;

          const textElement =
            document.createElement(
              "p"
            );

          textElement.textContent =
            data.comment.text;

          const dateElement =
            document.createElement(
              "small"
            );

          dateElement.textContent =
            new Date(
              data.comment.createdAt
            ).toLocaleString();

          commentElement.append(
            nameElement,
            textElement,
            dateElement
          );

          commentsList.prepend(
            commentElement
          );

          commentForm.reset();

          commentMessage.textContent =
            "Comment added successfully";
        } catch (error) {
          console.error(
            "Comment request error:",
            error
          );

          commentMessage.textContent =
            "Unable to connect to the server";
        }
      }
    );
  }
}