import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    rollupOptions: {
      input: [
        "src/index.html",
        "src/search/search.html",
        "src/browse/browse.html",
        "src/best_sellers/best_sellers.html",
        "src/favourites/favourites.html",
        "src/reading_room/reading_room.html",
      ],
    },
  },
});
