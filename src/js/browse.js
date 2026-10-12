import { getGutendexBooksPage } from "./api.js";
import { createBookCard } from "./books.js";
import { toggleMenu } from "./ui.js";

const bookList = document.querySelector("#free-books");
const loadMoreButton = document.querySelector("#load-more-books");
let nextPage = "fiction";

function hasFreeBookContent(book) {
    return Object.entries(book.formats ?? {}).some(
        ([format, url]) =>
            !format.toLowerCase().startsWith("image/") &&
            format.toLowerCase() !== "application/rdf+xml" &&
            !format.toLowerCase().includes("zip") &&
            typeof url === "string" &&
            !/\.zip(?:$|[?#])/i.test(url),
    );
}

async function loadNextPage() {
    if (!nextPage) return;

    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Loading books...";

    try {
        const result = await getGutendexBooksPage(nextPage);
        const freeBooks = result.books.filter(hasFreeBookContent);
        const cards = freeBooks.map((book) => createBookCard(book));

        if (!cards.length && bookList.childElementCount === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No free books found.";
            bookList.replaceChildren(emptyMessage);
        } else {
            bookList.append(...cards);
        }

        nextPage = result.next;
        loadMoreButton.hidden = !nextPage;
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = "Load more books";
    } catch (error) {
        console.error("Could not load free books:", error);
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = "Try loading books again";
    }
}

loadMoreButton.addEventListener("click", loadNextPage);
toggleMenu();
loadNextPage();
