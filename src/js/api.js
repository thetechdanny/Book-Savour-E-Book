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
            pageCount: book.number_of_pages_median ?? null,
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
            webReaderUrl: volumeInfo.webReaderLink ?? null,
            pageCount: volumeInfo.pageCount ?? null,
        }));
    } catch (error) {
        console.error("Google Books error:", error);

        throw new Error(`Google Books request failed: ${getErrorMessage(error)}`, {
            cause: error,
        });
    }
}

function mapGutendexBook(book) {
    const formats = book.formats ?? {};
    const textUrl =
        Object.entries(formats).find(
            ([format, url]) =>
                format.toLowerCase().startsWith("text/plain") &&
                typeof url === "string" &&
                !/\.zip(?:$|[?#])/i.test(url),
        )?.[1] ?? null;

    return {
        id: book.id,
        title: book.title ?? "Untitled",
        authors: (book.authors ?? []).map((author) => author.name),
        cover: formats["image/jpeg"] ?? null,
        languages: book.languages ?? [],
        downloadCount: book.download_count ?? 0,
        textUrl,
        formats,
    };
}

// Fetch a page of books from Gutendex.
export async function getGutendexBooksPage(queryOrUrl) {
    try {
        const url = queryOrUrl.startsWith("https://gutendex.com/books/")
            ? queryOrUrl
            : `https://gutendex.com/books/?search=${encodeURIComponent(queryOrUrl)}`;
        const data = await fetchJson(url);

        return {
            books: (data.results ?? []).map(mapGutendexBook),
            next: data.next ?? null,
        };
    } catch (error) {
        console.error("Gutendex error:", error);

        throw new Error(`Gutendex request failed: ${getErrorMessage(error)}`, {
            cause: error,
        });
    }
}

// Fetch the first Gutendex page for callers that only need a single result page.
export async function getGutendexBooks(query) {
    const { books } = await getGutendexBooksPage(query);
    return books;
}

function normalizeTitle(title) {
    return (title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getPlainTextUrl(book) {
    return (
        book.textUrl ??
        Object.entries(book.formats ?? {}).find(
            ([format, url]) =>
                format.toLowerCase().startsWith("text/plain") &&
                typeof url === "string" &&
                !/\.zip(?:$|[?#])/i.test(url),
        )?.[1] ??
        null
    );
}

async function fetchPlainText(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Book source returned HTTP ${response.status}.`);
        }
        return response.text();
    } catch (error) {
        const source = new URL(url);
        if (!source.hostname.endsWith("gutenberg.org")) {
            throw error;
        }

        const relayUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(relayUrl);
        if (!response.ok) {
            throw new Error(`Book text relay returned HTTP ${response.status}.`);
        }
        return response.text();
    }
}

// Fetch a free book's plain text and retain it in browser Cache Storage as a .txt file.
export async function fetchFreeBookTextFile(book) {
    const title = book.title ?? "Untitled";
    const filename = `${title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "book"}.txt`;
    const cacheKey = new Request(
        `https://book-savour-cache.invalid/text/${encodeURIComponent(`${book.id ?? title}-${title}`)}`,
    );
    let cache;
    try {
        cache = await globalThis.caches?.open("book-savour-free-text-v1");
        const cachedResponse = await cache?.match(cacheKey);

        if (cachedResponse) {
            return new File([await cachedResponse.blob()], filename, {
                type: "text/plain;charset=utf-8",
            });
        }
    } catch (error) {
        console.warn("Book text cache unavailable; fetching from source.", error);
    }

    let textUrl = getPlainTextUrl(book);
    if (!textUrl && title !== "Untitled") {
        const matches = await getGutendexBooks(title);
        const match = matches.find(
            (candidate) =>
                normalizeTitle(candidate.title) === normalizeTitle(title) &&
                getPlainTextUrl(candidate),
        );
        textUrl = match ? getPlainTextUrl(match) : null;
    }

    if (!textUrl) {
        throw new Error(`No free plain-text edition was found for “${title}”.`);
    }

    const text = await fetchPlainText(textUrl);
    if (!text.trim()) {
        throw new Error("The free book source did not contain readable text.");
    }

    try {
        await cache?.put(
            cacheKey,
            new Response(text, {
                headers: { "Content-Type": "text/plain;charset=utf-8" },
            }),
        );
    } catch (error) {
        console.warn("Could not cache book text; continuing with fetched content.", error);
    }

    return new File([text], filename, { type: "text/plain;charset=utf-8" });
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
            pageCount: book.pages ?? null,
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
