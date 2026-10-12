import { toggleMenu } from "./ui.js";
import { loadHomepageBooks } from "./books.js";
import "./search.js";

document.addEventListener("DOMContentLoaded", () => {
    loadHomepageBooks();
});

toggleMenu();
