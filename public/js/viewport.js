

document.addEventListener("DOMContentLoaded", () => {
  const MQL = {
    DESKTOP_WIDE: window.matchMedia("(min-width: 1200px)"),
    DESKTOP_NARROW: window.matchMedia(
      "(min-width: 1025px) and (max-width: 1199px)"
    ),
    MOBILE: window.matchMedia("(max-width: 1024px)"),
  };

  function checkBreakPoint() {
    if (MQL.DESKTOP_WIDE.matches) {
      document
        .querySelector("meta[name='viewport']")
        .setAttribute(
          "content",
          "width=device-width,initial-scale=1,maximum-scale=5,minimum-scale=1"
        );
    } else if (MQL.DESKTOP_NARROW.matches) {
      document
        .querySelector("meta[name='viewport']")
        .setAttribute("content", "width=1199");
    } else if (MQL.MOBILE.matches) {
      document
        .querySelector("meta[name='viewport']")
        .setAttribute(
          "content",
          "width=device-width,initial-scale=1,maximum-scale=5,minimum-scale=1"
        );
    }
  }

  // init
  checkBreakPoint();

  // Individual monitoring
  MQL.DESKTOP_WIDE.addListener(checkBreakPoint);
  MQL.DESKTOP_NARROW.addListener(checkBreakPoint);
  MQL.MOBILE.addListener(checkBreakPoint);
});
