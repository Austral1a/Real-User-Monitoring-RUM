(() => {
  try {
    const theme = localStorage.getItem("monitor-theme");
    const dark =
      theme === "dark" ||
      (theme !== "light" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch {
    // Private mode can block storage.
  }
})();
