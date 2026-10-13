import { toggleMenu } from "./ui.js";
import { fetchFreeBookTextFile } from "./api.js";
import "./search.js";

const WORDS_PER_PAGE = 500;
const readingRoom = document.querySelector("#reading_room");

// Break downloaded text into readable chunks for page navigation.
function splitIntoPages(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const pages = [];

  for (let index = 0; index < words.length; index += WORDS_PER_PAGE) {
    pages.push(words.slice(index, index + WORDS_PER_PAGE).join(" "));
  }

  return pages;
}

// Escape source text before placing it inside the reader iframe's HTML.
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

// Show the selected book's loading, missing, or error state.
function renderUnavailableBook(book, message) {
  const title = document.createElement("h2");
  title.textContent = book?.title ?? "Reading room";

  const status = document.createElement("p");
  status.textContent = message;

  readingRoom.replaceChildren(title, status);

  const sourceUrl =
    book?.textUrl || book?.webReaderUrl || book?.previewUrl || book?.amazonUrl;
  if (sourceUrl) {
    const sourceLink = document.createElement("a");
    sourceLink.href = sourceUrl;
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
    sourceLink.textContent = "Open available book source";
    readingRoom.append(sourceLink);
  }
}

// Build the iframe reader, paging controls, and text-file download link.
function renderReader(book, pages, textFile) {
  let currentPage = 0;

  const title = document.createElement("h2");
  title.textContent = book.title ?? "Untitled";

  const author = document.createElement("p");
  author.className = "reader-author";
  author.textContent = book.authors?.join(", ") || "Unknown author";

  const content = document.createElement("iframe");
  content.className = "reader-content-frame";
  content.title = `${book.title ?? "Book"} page content`;
  content.setAttribute("sandbox", "");

  const controls = document.createElement("div");
  controls.className = "reader-controls";

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.textContent = "Previous";

  const pageCount = document.createElement("p");
  pageCount.className = "reader-page-count";
  pageCount.setAttribute("aria-live", "polite");

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "Next";

  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(textFile);
  downloadLink.download = textFile.name;
  downloadLink.textContent = "Download text file";

  // Keep iframe content, page count, and button states in sync.
  const updatePage = () => {
    content.srcdoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:1.5rem;font:1rem/1.8 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;color:#222}</style></head><body>${escapeHtml(pages[currentPage])}</body></html>`;
    pageCount.textContent = `Page ${currentPage + 1} of ${pages.length}`;
    previousButton.disabled = currentPage === 0;
    nextButton.disabled = currentPage === pages.length - 1;
  };

  previousButton.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage -= 1;
      updatePage();
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentPage < pages.length - 1) {
      currentPage += 1;
      updatePage();
    }
  });

  controls.append(previousButton, pageCount, nextButton);
  readingRoom.replaceChildren(title, author, content, controls, downloadLink);
  updatePage();
}

// Load the selected book, fetch its text file, and initialize the reader.
async function loadReadingRoom() {
  const storedBook = sessionStorage.getItem("selectedBook");

  if (!storedBook) {
    renderUnavailableBook(
      null,
      "Choose a book from the homepage to start reading.",
    );
    return;
  }

  let book;
  try {
    book = JSON.parse(storedBook);
  } catch {
    sessionStorage.removeItem("selectedBook");
    renderUnavailableBook(
      null,
      "The selected book could not be loaded. Return to the homepage and choose it again.",
    );
    return;
  }

  renderUnavailableBook(book, "Loading book content...");

  try {
    const textFile = await fetchFreeBookTextFile(book);
    const text = await textFile.text();
    const pages = splitIntoPages(text);

    if (!pages.length) {
      throw new Error("The book source did not contain readable text.");
    }

    renderReader(book, pages, textFile);
  } catch (error) {
    console.error("Could not load book content:", error);
    renderUnavailableBook(
      book,
      "The book text could not be loaded. The source may block access from this website.",
    );
  }
}

toggleMenu();
loadReadingRoom();
