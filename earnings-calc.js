(function () {
  const WEEKLY_RENT = { s: 300, m: 400, l: 500 };
  const WEEKS = 4.33;

  function money(amount) {
    return "$" + Math.round(amount).toLocaleString("en-US");
  }

  function paint(root) {
    const rev = root.querySelector("[data-rev]");
    const split = root.querySelector("[data-split]");
    const suite = root.querySelector("[data-suite]");
    const weekly = Number(rev.value);
    const salon = Number(split.value) / 100;
    const rent = WEEKLY_RENT[suite.value] || WEEKLY_RENT.s;
    const today = weekly * (1 - salon) * WEEKS;
    const here = (weekly - rent) * WEEKS;
    const diff = here - today;

    rev.setAttribute("aria-valuenow", String(weekly));
    rev.setAttribute("aria-valuetext", weekly.toLocaleString("en-US") + " dollars per week");
    split.setAttribute("aria-valuenow", split.value);
    split.setAttribute("aria-valuetext", "The salon keeps " + split.value + " percent");

    root.querySelector("[data-rev-label]").textContent = money(weekly) + " / week";
    root.querySelector("[data-split-label]").textContent = split.value + "%";
    root.querySelector("[data-today]").textContent = money(today) + " / mo";
    root.querySelector("[data-oll]").textContent = money(here) + " / mo";

    const more = root.querySelector("[data-more]");
    const diffEl = root.querySelector("[data-diff]");
    if (diff < 0) {
      more.classList.add("is-soft");
      diffEl.textContent = "This mix may not increase your monthly take-home. Find your suite and we’ll look at your numbers together.";
    } else {
      more.classList.remove("is-soft");
      diffEl.textContent = "+" + money(diff);
    }
  }

  document.querySelectorAll("[data-math]").forEach((root) => {
    paint(root);
    root.addEventListener("input", () => paint(root));
  });
})();
