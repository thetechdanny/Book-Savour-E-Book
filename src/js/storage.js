const FAVORITES_KEY = "bookSavourFavorites";

function favoriteIdentity(book) {
    const title = (book.title ?? "").trim().toLowerCase();
    const authors = (book.authors ?? []).join(", ").trim().toLowerCase();
    return `${book.id ?? ""}|${title}|${authors}`;
}

export function getFavorites() {
    try {
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
        return Array.isArray(favorites) ? favorites : [];
    } catch {
        return [];
    }
}

export function isFavorite(book) {
    const identity = favoriteIdentity(book);
    return getFavorites().some((favorite) => favoriteIdentity(favorite) === identity);
}

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
