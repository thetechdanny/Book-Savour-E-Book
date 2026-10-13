const FAVORITES_KEY = "bookSavourFavorites";

// Build a stable identity for matching books across API sources.
function favoriteIdentity(book) {
  const title = (book.title ?? "").trim().toLowerCase();
  const authors = (book.authors ?? []).join(", ").trim().toLowerCase();
  return `${book.id ?? ""}|${title}|${authors}`;
}

// Read saved favourites, returning an empty list for invalid storage.
export function getFavorites() {
  try {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(favorites) ? favorites : [];
  } catch {
    return [];
  }
}

// Check whether a matching book is currently saved as a favourite.
export function isFavorite(book) {
  const identity = favoriteIdentity(book);
  return getFavorites().some(
    (favorite) => favoriteIdentity(favorite) === identity,
  );
}

// Add or remove a book from local storage and return its saved state.
export function toggleFavorite(book) {
  try {
    const favorites = getFavorites();
    const identity = favoriteIdentity(book);
    const existingIndex = favorites.findIndex(
      (favorite) => favoriteIdentity(favorite) === identity,
    );

    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return false;
    }

    favorites.push(book);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return true;
  } catch {
    return isFavorite(book);
  }
}
