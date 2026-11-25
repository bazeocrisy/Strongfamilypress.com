/* Applies the saved theme and Scripture size before first paint. Reads only this device's localStorage. */
(function () {
  try {
    var s = JSON.parse(localStorage.getItem("theMountain.v1") || "{}");
    if (s.theme === "light" || s.theme === "dark") document.documentElement.setAttribute("data-theme", s.theme);
  } catch (e) { /* storage unavailable: fall back to system theme */ }
})();
