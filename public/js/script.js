$(document).ready(function () {
  // Legacy loading screen logic removed - React handles content rendering

  // ========================== Back to Top Button ==========================
  var flag = false;
  var page_up = $(".page_up");

  $(window).scroll(function () {
    if ($(this).scrollTop() > 50) {
      if (!flag) {
        flag = true;
        page_up.stop().animate({ right: "3%" }, 500);
      }
    } else {
      if (flag) {
        flag = false;
        page_up.stop().animate({ right: "-500px" }, 500);
      }
    }
  });

  page_up.click(function () {
    $("body, html").animate({ scrollTop: 0 }, 500);
    return false;
  });

  // ========================== Menu Toggle ==========================
  $("body").on("click", ".menu--menuleft", function () {
    $(
      ".header__right, .header__side-logo--click, .header, #wrapper, .header__side, .mainvisual, .c-mv"
    ).removeClass("open");
  });

  // $("body").on("click", ".menu--menuright", function () {
  //   $(this).toggleClass("open");
  //   $(".header__side2").toggleClass("open");

  //   if ($(this).hasClass("open")) {
  //     // Lưu vị trí cuộn hiện tại và ngăn cuộn
  //     var scrollPosition = $(window).scrollTop();
  //     $("body")
  //       .addClass("no-scroll")
  //       .css({ top: -scrollPosition + "px" });
  //   } else {
  //     // Khôi phục vị trí cuộn khi đóng menu
  //     var scrollPosition = Math.abs(parseInt($("body").css("top")));
  //     $("body").removeClass("no-scroll").css({ top: "" });
  //     $(window).scrollTop(scrollPosition);
  //   }
  // });

  // ========================== Đóng menu khi click vào link ==========================
  function closeMenu() {
    $(
      ".header__right, .header, #wrapper, .header__side, .header__side2, .mainvisual, .menu"
    ).removeClass("open");

    var scrollPosition = Math.abs(parseInt($("body").css("top")));
    $("body").removeClass("no-scroll").css({ top: "" });
    $(window).scrollTop(scrollPosition);
  }

  $("body").on("click", ".header__side a, .header__side2 a", function () {
    closeMenu();
  });
});

// Language switching is now handled by React components

// Add this to your script.js file

// Add this script at the end of your file, before the closing </body> tag

$(document).ready(function () {
  // Set the Vietnam map SVG fill color to blue
  $.get("/images/common_img/vietnam-map.svg", function (data) {
    const svgElement = $(data).find("svg");
    svgElement.find("path").attr("fill", "#0056b3");

    const svgString = new XMLSerializer().serializeToString(svgElement[0]);
    $(".map-image").replaceWith(svgString);
    $(".map-image").css("width", "100%");
  });
});

// Legacy loading script removed - React handles content rendering
// Image optimization can be handled by React components if needed
