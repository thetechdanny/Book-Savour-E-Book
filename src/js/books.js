import {
  getBestsellers,
  getBooks,
  getGoogleBooks,
  getGutendexBooks,
} from "./api.js";

const ROTATION_DELAY = 10000;

function getBooksPerPage() {
  return window.matchMedia("(min-width: 690px)").matches ? 2 : 1;
}

const categories = [
  {
    id: "popularbooks",
    title: "Popular Novels",
    load: async () => {
      const popular = await getGutendexBooks("fiction");

      return popular.sort((a, b) => b.downloadCount - a.downloadCount);
    },
  },

  {
    id: "bestsellers",
    title: "Bestsellers",
    load: async () => {
      try {
        return await getBestsellers();
      } catch (error) {
        console.warn(
          "NYT Bestsellers unavailable. Using Google Books instead.",
          error,
        );

        try {
          const books = await getGoogleBooks("bestselling fiction novels");

          if (books.length) return books;
        } catch (googleBooksError) {
          console.warn(
            "Google Books unavailable. Using Open Library instead.",
            googleBooksError,
          );
        }

        return getBooks("bestseller fiction novels");
      }
    },
  },

  {
    id: "freebooks",
    title: "Free Books",
    load: () => getGutendexBooks("fiction"),
  },
];

// Shuffle books randomly
function shuffle(books) {
  const shuffled = [...books];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

// Create a single book card
function createBookCard(book) {
  const card = document.createElement("article");
  card.className = "book-card";

  if (book.cover) {
    const cover = document.createElement("img");

    cover.className = "book-cover";
    cover.src = book.cover;
    cover.alt = `Cover of ${book.title}`;
    cover.loading = "lazy";

    card.append(cover);
  } else {
    const placeholder = document.createElement("div");

    placeholder.className = "book-cover book-cover-placeholder";
    placeholder.textContent = "No cover";

    card.append(placeholder);
  }

  const details = document.createElement("div");
  details.className = "book-details";

  const title = document.createElement("h3");
  title.textContent = book.title ?? "Untitled";
  details.append(title);

  const authors = document.createElement("p");
  authors.className = "book-author";
  authors.textContent = book.authors?.join(", ") || "Unknown author";
  details.append(authors);

  const link =
    book.previewUrl ||
    book.amazonUrl ||
    book.formats?.["text/html"] ||
    book.formats?.["application/epub+zip"];

  if (link) {
    const action = document.createElement("a");

    action.href = link;
    action.target = "_blank";
    action.rel = "noopener noreferrer";
    action.textContent = book.formats ? "Read free" : "View book";

    details.append(action);
  }

  card.append(details);

  return card;
}

// Display the current responsive book batch
function renderBooks(section, books) {
  section.replaceChildren(...books.map(createBookCard));
}

// Rotate through shuffled books every ten seconds
function rotateBooks(section, books) {
  let shuffled = shuffle(books);
  let nextIndex = 0;

  const getNextBatch = () => {
    const batch = [];
    const batchSize = Math.min(getBooksPerPage(), books.length);

    while (batch.length < batchSize) {
      if (nextIndex >= shuffled.length) {
        shuffled = shuffle(books);
        nextIndex = 0;
      }

      batch.push(shuffled[nextIndex]);
      nextIndex += 1;
    }

    return batch;
  };

  let currentBatch = getNextBatch();

  const showNext = () => {
    currentBatch = getNextBatch();

    section.classList.add("is-leaving");

    window.setTimeout(() => {
      renderBooks(section, currentBatch);
      section.classList.remove("is-leaving");
    }, 300);
  };

  renderBooks(section, currentBatch);

  if (books.length > 1) {
    window.setInterval(showNext, ROTATION_DELAY);
  }

  window.matchMedia("(min-width: 690px)").addEventListener("change", () => {
    currentBatch = getNextBatch();
    section.classList.remove("is-leaving");
    renderBooks(section, currentBatch);
  });
}

// Load all homepage book sections
export async function loadHomepageBooks() {
  await Promise.all(
    categories.map(async ({ id, title, load }) => {
      const section = document.getElementById(id);

      if (!section) return;

      const heading = document.createElement("h3");
      heading.textContent = title;

      const list = document.createElement("div");
      list.className = "book-list";
      list.setAttribute("aria-live", "polite");
      list.textContent = "Loading books...";

      section.replaceChildren(heading, list);

      try {
        const books = await load();

        if (!books.length) {
          list.textContent = "No books found.";
          return;
        }

        rotateBooks(list, books);
      } catch (error) {
        console.error(`Failed to load ${title}:`, error);

        list.textContent = "Books could not be loaded. Please try again later.";
      }
    }),
  );
}
