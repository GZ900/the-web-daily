"use strict";

const reviewPage = document.querySelector(
  "#editor-review"
);

if (reviewPage) {
  const articleId =
    reviewPage.dataset.articleId;

  const titleInput =
    document.querySelector("#editor-title");

  const summaryInput =
    document.querySelector("#editor-summary");

  const categoryInput =
    document.querySelector("#editor-category");

  const imageInput =
    document.querySelector("#editor-image");

  const contentInput =
    document.querySelector("#editor-content");

  const saveButton =
    document.querySelector("#editor-save");

  const approveButton =
    document.querySelector("#editor-approve");

  const returnButton =
    document.querySelector("#editor-return");

  const deleteButton =
    document.querySelector("#editor-delete");

  const noteInput =
    document.querySelector("#editor-note");

  const message =
    document.querySelector("#editor-message");

  function getArticleData() {
    return {
      title: titleInput.value,
      summary: summaryInput.value,
      category: categoryInput.value,
      imageUrl: imageInput.value,
      content: contentInput.value
    };
  }

  async function saveChanges() {
    if (!saveButton) {
      return true;
    }

    const response = await fetch(
      `/api/editor/articles/${articleId}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(
          getArticleData()
        )
      }
    );

    const data = await response.json();

    if (!response.ok) {
      message.textContent =
        data.message || "Save failed";

      return false;
    }

    message.textContent =
      "Changes saved";

    return true;
  }

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      async function () {
        try {
          await saveChanges();
        } catch (error) {
          console.error(error);

          message.textContent =
            "Unable to save changes";
        }
      }
    );
  }

  if (approveButton) {
    approveButton.addEventListener(
      "click",
      async function () {
        try {
          const saved =
            await saveChanges();

          if (!saved) {
            return;
          }

          const response = await fetch(
            `/api/editor/articles/${articleId}/approve`,
            {
              method: "PATCH"
            }
          );

          const data =
            await response.json();

          if (!response.ok) {
            message.textContent =
              data.message ||
              "Unable to approve article";

            return;
          }

          window.location.href =
            "/editor";
        } catch (error) {
          console.error(error);

          message.textContent =
            "Unable to approve article";
        }
      }
    );
  }

  if (returnButton) {
    returnButton.addEventListener(
      "click",
      async function () {
        const note =
          noteInput.value.trim();

        try {
          const response = await fetch(
            `/api/editor/articles/${articleId}/return`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                note
              })
            }
          );

          const data =
            await response.json();

          if (!response.ok) {
            message.textContent =
              data.message ||
              "Unable to return article";

            return;
          }

          window.location.href =
            "/editor";
        } catch (error) {
          console.error(error);

          message.textContent =
            "Unable to return article";
        }
      }
    );
  }

  if (deleteButton) {
    deleteButton.addEventListener(
      "click",
      async function () {
        const confirmed =
          window.confirm(
            "Delete this article permanently?"
          );

        if (!confirmed) {
          return;
        }

        try {
          const response = await fetch(
            `/api/editor/articles/${articleId}`,
            {
              method: "DELETE"
            }
          );

          const data =
            await response.json();

          if (!response.ok) {
            message.textContent =
              data.message ||
              "Unable to delete article";

            return;
          }

          window.location.href =
            "/editor";
        } catch (error) {
          console.error(error);

          message.textContent =
            "Unable to delete article";
        }
      }
    );
  }
}