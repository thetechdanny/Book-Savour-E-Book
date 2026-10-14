import { getBooks, getGoogleBooks } from "./api.js";
import { createBookCard } from "./books.js";
import { toggleMenu } from "./ui.js";

let latestSearch = 0;

// Search Google Books first, then fall back to Open Library.
async function findBooks(query) {
  try {
    const googleBooks = await getGoogleBooks(query);
    if (googleBooks.length) return googleBooks;
  } catch (error) {
    console.warn("Google Books search failed; trying Open Library.", error);
  }

  return getBooks(query);
}

// Connect search forms and render results when a search is submitted.
export function initBookSearch() {
  const inputs = [
    ...document.querySelectorAll('.search-field input[type="search"]'),
  ];
  if (!inputs.length) return;

  const results = document.querySelector("#search-books");
  const heading = document.querySelector("#search-heading");
  const searchPage = Boolean(results && heading);

  if (searchPage) {
    toggleMenu();
  }

  // Fetch and render results only for the latest search request.
  async function displayResults(query) {
    if (!searchPage || !query) return;

    const searchId = ++latestSearch;
    heading.textContent = `Search results for "${query}"`;
    results.textContent = "Searching books...";

    try {
      const books = await findBooks(query);
      if (searchId !== latestSearch) return;

      if (!books.length) {
        results.textContent =
          "No books found. Try another title or author name.";
        return;
      }

      results.replaceChildren(...books.map((book) => createBookCard(book)));
    } catch (error) {
      console.error("Book search failed:", error);
      if (searchId === latestSearch) {
        results.textContent =
          "Search is unavailable right now. Please try again.";
      }
    }
  }

  for (const input of inputs) {
    const form = input.closest("form");
    if (!form) continue;

    const searchField = input.closest(".search-field");
    if (searchField && !searchField.querySelector(".search-submit")) {
      const submitButton = document.createElement("button");
      submitButton.className = "search-submit";
      submitButton.type = "submit";
      submitButton.setAttribute("aria-label", "Search books");
      submitButton.title = "Search books";
      submitButton.textContent = "Search";
      searchField.append(submitButton);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();

      for (const searchInput of inputs) {
        searchInput.value = query;
      }

      if (!query) {
        return;
      }

      if (!searchPage) {
        window.location.href = `/search/search.html?q=${encodeURIComponent(query)}`;
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set("q", query);
      window.history.pushState({}, "", url);
      displayResults(query);
    });
  }

  if (searchPage) {
    const initialQuery = new URLSearchParams(window.location.search)
      .get("q")
      ?.trim();
    if (initialQuery) {
      for (const input of inputs) input.value = initialQuery;
      displayResults(initialQuery);
    } else {
      results.textContent =
        "Search for a book title or author's name to see results.";
    }
  }
}

initBookSearch();
