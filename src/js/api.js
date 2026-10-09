// Fetch and return book in JSON format from a given URL
async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// Fetch book from Library API
export async function getBooks(query) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`;
    const data = await fetchJson(url);

    return (data.docs ?? []).map((book) => ({
      id: book.key,
      title: book.title ?? "Untitled",
      authors: book.author_name ?? [],
      cover: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      publishedYear: book.first_publish_year ?? null,
    }));
  } catch (error) {
    throw new Error(`Open Library request failed: ${getErrorMessage(error)}`, {
      cause: error,
    });
  }
}

// Fetch book from Google Books API
export async function getGoogleBooks(query) {
  try {
    const url =
      `https://www.googleapis.com/books/v1/volumes` +
      `?q=${encodeURIComponent(query)}&maxResults=20`;

    const data = await fetchJson(url);

    return (data.items ?? []).map(({ id, volumeInfo = {} }) => ({
      id,
      title: volumeInfo.title ?? "Untitled",
      authors: volumeInfo.authors ?? [],
      cover:
        volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") ?? null,
      publishedYear: volumeInfo.publishedDate ?? null,
      description: volumeInfo.description ?? "",
      previewUrl: volumeInfo.previewLink ?? null,
    }));
  } catch (error) {
    console.error("Google Books error:", error);

    throw new Error(`Google Books request failed: ${getErrorMessage(error)}`, {
      cause: error,
    });
  }
}

// Fetch book from Gutendex API
export async function getGutendexBooks(query) {
  try {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
    const data = await fetchJson(url);

    return (data.results ?? []).map((book) => ({
      id: book.id,
      title: book.title ?? "Untitled",
      authors: (book.authors ?? []).map((author) => author.name),
      cover: book.formats?.["image/jpeg"] ?? null,
      languages: book.languages ?? [],
      downloadCount: book.download_count ?? 0,
      formats: book.formats ?? {},
    }));
  } catch (error) {
    console.error("Gutendex error:", error);

    throw new Error(`Gutendex request failed: ${getErrorMessage(error)}`, {
      cause: error,
    });
  }
}

// Fetch book from New York Times Bestsellers API
export async function getBestsellers() {
  try {
    const apiKey = import.meta.env.VITE_NYT_API_KEY;

    if (!apiKey) {
      throw new Error("VITE_NYT_API_KEY is missing. Add it to your .env file.");
    }

    const url =
      `https://api.nytimes.com/svc/books/v3/lists/current/` +
      `hardcover-fiction.json?api-key=${encodeURIComponent(apiKey)}`;

    const data = await fetchJson(url);

    return (data.results?.books ?? []).map((book) => ({
      id: book.primary_isbn13 ?? book.primary_isbn10 ?? null,
      title: book.title ?? "Untitled",
      authors: book.author ? [book.author] : [],
      description: book.description ?? "",
      cover: book.book_image ?? null,
      rank: book.rank ?? null,
      amazonUrl: book.amazon_product_url ?? null,
    }));
  } catch (error) {
    console.error("NYT Bestsellers error:", error);

    throw new Error(
      `New York Times bestsellers request failed: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}

// Get customized popular books
export async function getPopularClassics() {
  const classicTitles = [
    "pride and prejudice",
    "frankenstein",
    "dracula",
    "alice in wonderland",
    "the adventures of sherlock holmes",
    "little women",
    "great expectations",
    "the count of monte cristo",
    "the picture of dorian gray",
    "moby dick",
  ];

  const results = await Promise.all(
    classicTitles.map((title) => getGutendexBooks(title)),
  );

  const books = results.flat();

  const uniqueBooks = Array.from(
    new Map(books.map((book) => [book.id, book])).values(),
  );

  return uniqueBooks.sort((a, b) => b.downloadCount - a.downloadCount);
}
