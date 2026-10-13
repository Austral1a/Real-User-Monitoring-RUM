(() => {
  try {
    const theme = localStorage.getItem("monitor-theme");
    const dark =
      theme === "dark" ||
      (theme !== "light" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    const locale = localStorage.getItem("monitor-locale");
    if (locale === "ru" || locale === "en") {
      document.documentElement.lang = locale;
    } else if (navigator.language.toLowerCase().startsWith("ru")) {
      document.documentElement.lang = "ru";
    }
  } catch {
    // Private mode can block storage.
  }
})();
