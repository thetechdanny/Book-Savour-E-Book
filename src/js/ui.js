export function toggleMenu() {
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".navMenu");

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("show");
    navMenu.classList.toggle("show");
  });
}
