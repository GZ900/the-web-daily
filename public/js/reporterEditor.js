"use strict";

const editor = document.querySelector(
  "#article-editor"
);

if (editor) {
  const articleId =
    editor.dataset.articleId;

  const titleInput =
    document.querySelector("#article-title");

  const summaryInput =
    document.querySelector("#article-summary");

  const categoryInput =
    document.querySelector("#article-category");

  const imageInput =
    document.querySelector("#article-image");

  const contentInput =
    document.querySelector("#article-content");

  const saveStatus =
    document.querySelector("#save-status");

  const submitButton =
    document.querySelector("#submit-review");

  const submitMessage =
    document.querySelector("#submit-message");

  let saveTimer = null;

  function getArticleData() {
    return {
      title: titleInput.value,
      summary: summaryInput.value,
      category: categoryInput.value,
      imageUrl: imageInput.value,
      content: contentInput.value
    };
  }

  async function saveArticle() {
    saveStatus.textContent = "Saving...";

    try {
      const response = await fetch(
        `/api/reporter/articles/${articleId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(
            getArticleData()
          )
        }
      );

      const data = await response.json();

      if (!response.ok) {
        saveStatus.textContent =
          data.message || "Save failed";

        return false;
      }

      const savedTime =
        new Date(data.savedAt);

      saveStatus.textContent =
        `Saved at ${savedTime.toLocaleTimeString()}`;

      return true;
    } catch (error) {
      console.error(
        "Autosave request error:",
        error
      );

      saveStatus.textContent =
        "Unable to save";

      return false;
    }
  }

  function scheduleSave() {
    saveStatus.textContent =
      "Unsaved changes...";

    clearTimeout(saveTimer);

    saveTimer = setTimeout(
      saveArticle,
      1000
    );
  }

  const editableFields = [
    titleInput,
    summaryInput,
    categoryInput,
    imageInput,
    contentInput
  ];

  editableFields.forEach(field => {
    field.addEventListener(
      "input",
      scheduleSave
    );
  });

  submitButton.addEventListener(
    "click",
    async function () {
      clearTimeout(saveTimer);

      submitMessage.textContent = "";

      const saved =
        await saveArticle();

      if (!saved) {
        submitMessage.textContent =
          "Please save the article before submitting";

        return;
      }

      try {
        const response = await fetch(
          `/api/reporter/articles/${articleId}/status`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              status: "pending"
            })
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          submitMessage.textContent =
            data.message ||
            "Unable to submit article";

          return;
        }

        window.location.href =
          "/reporter";
      } catch (error) {
        console.error(
          "Submit request error:",
          error
        );

        submitMessage.textContent =
          "Unable to connect to the server";
      }
    }
  );
}