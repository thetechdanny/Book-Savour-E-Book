import { createBookCard, loadBestsellerBooks } from "./books.js";
import { toggleMenu } from "./ui.js";

const bookList = document.querySelector("#best-sellers");

// Load bestseller data and render cards or a useful status message.
async function loadBestSellers() {
  bookList.textContent = "Loading bestsellers...";

  try {
    const books = await loadBestsellerBooks();

    if (!books.length) {
      bookList.textContent =
        "No bestseller books were returned by the available sources.";
      return;
    }

    bookList.replaceChildren(...books.map((book) => createBookCard(book)));
  } catch (error) {
    console.error("Could not load bestsellers:", error);
    bookList.textContent =
      "Bestsellers could not be loaded. Add a valid VITE_NYT_API_KEY for the verified NYT chart, or try again later.";
  }
}

toggleMenu();
loadBestSellers();
