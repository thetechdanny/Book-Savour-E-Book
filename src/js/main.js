import { toggleMenu } from "./ui.js";
import { loadHomepageBooks } from "./books.js";

document.addEventListener("DOMContentLoaded", () => {
  loadHomepageBooks();
});

toggleMenu();
