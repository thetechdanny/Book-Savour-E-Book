import { createBookCard } from "./books.js";
import { getFavorites } from "./storage.js";
import { toggleMenu } from "./ui.js";

const favoriteBooks = document.querySelector("#favorite-books");

function renderFavorites() {
    const books = getFavorites();

    if (!books.length) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No books have been added to favourites yet.";
        favoriteBooks.replaceChildren(emptyMessage);
        return;
    }

    favoriteBooks.replaceChildren(
        ...books.map((book) => createBookCard(book, renderFavorites)),
    );
}

toggleMenu();
renderFavorites();
