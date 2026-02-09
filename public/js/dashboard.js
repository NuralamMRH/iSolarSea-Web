// Dashboard functionality for Nha May Che Bien
$(document).ready(function () {
  // Define subsection titles for tabs
  const subsectionTitles = {
    "factory-info": "Thông Tin Nhà Máy",
    "factory-list": "Danh Sách Nhà Máy",
    "processing-data": "Dữ Liệu Chế Biến",
    "iuu-report": "Báo Cáo IUU",
    "orders": "Đơn Hàng",
    "transactions": "Giao Dịch",
  };

  // Set default active tab
  showTab("factory-info");

  // Tab click event
  $(".tab-link").on("click", function (e) {
    e.preventDefault();
    const tabId = $(this).attr("data-tab");
    showTab(tabId);
  });

  // Function to show selected tab
  function showTab(tabId) {
    // Hide all tabs
    $(".tab-pane").hide();

    // Show selected tab
    $("#" + tabId).show();
    console.log("Showing tab:", tabId, "Element exists:", $("#" + tabId).length > 0);

    // Update active tab styling
    $(".tab-link").removeClass("active");
    $(`[data-tab="${tabId}"]`).addClass("active");

    // Update subsection title
    $("#subsection-title").text(subsectionTitles[tabId]);
  }

  // Image upload functionality
  $(".image-upload").on("change", function () {
    const file = this.files[0];
    const containerId = $(this).data("container");
    const imageNumber = containerId.split("-").pop();

    if (file) {
      const reader = new FileReader();

      reader.onload = function (e) {
        $(`#${containerId} .upload-placeholder`).hide();
        $(`#preview-image-${imageNumber}`)
          .attr("src", e.target.result)
          .removeClass("hidden");
        $(`#remove-image-${imageNumber}`).removeClass("hidden");
      };

      reader.readAsDataURL(file);
    }
  });

  // Remove image functionality
  $("[id^=remove-image-]").on("click", function () {
    const imageNumber = $(this).attr("id").split("-").pop();
    $(`#preview-image-${imageNumber}`).addClass("hidden").attr("src", "");
    $(`#image-container-${imageNumber} .upload-placeholder`).show();
    $(`#license-image-${imageNumber}`).val("");
    $(this).addClass("hidden");
  });

  // IUU Report view functionality
  $(".view-iuu-btn").on("click", function () {
    const vesselId = $(this).closest("tr").data("vessel");
    $("#selected-vessel-id").text(vesselId);
    $("#vessel-registration").val(vesselId);
    $("#iuu-report-table").closest(".bg-white").hide();
    $("#iuu-vessel-details").removeClass("hidden");
  });

  $("#back-to-iuu-list").on("click", function () {
    $("#iuu-vessel-details").addClass("hidden");
    $("#iuu-report-table").closest(".bg-white").show();
  });

  // IUU search functionality
  $("#iuu-search").on("keyup", function () {
    const searchTerm = $(this).val().toLowerCase();

    $(".iuu-row").each(function () {
      const vesselId = $(this).data("vessel").toLowerCase();
      const reportId = $(this)
        .find("td:nth-child(2)")
        .text()
        .toLowerCase();

      if (
        vesselId.includes(searchTerm) ||
        reportId.includes(searchTerm)
      ) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });
  });

  // Orders search functionality
  $("#search-orders").on("click", function () {
    const dateFrom = $("#date-from").val();
    const dateTo = $("#date-to").val();
    const status = $("#order-status").val();

    // Simulate loading orders
    loadOrders(dateFrom, dateTo, status);
  });

  // Transaction search functionality
  $("#search-transactions").on("click", function () {
    const dateFrom = $("#transaction-date-from").val();
    const dateTo = $("#transaction-date-to").val();
    const type = $("#transaction-type").val();

    // You would implement actual search here
    console.log("Searching transactions:", { dateFrom, dateTo, type });
  });

  // Load sample orders
  function loadOrders(dateFrom, dateTo, status) {
    // This is a simulation - in a real app, you would fetch from an API
    const sampleOrders = [
      {
        id: "ORD-2023-001",
        customer: "Công ty XNK Hải Sản Việt",
        date: "2023-05-10",
        amount: "250,000,000 VND",
        status: "completed",
        products: ["Cá Ngừ Đông Lạnh", "Tôm Sú Đông Lạnh"],
      },
      {
        id: "ORD-2023-002",
        customer: "Công ty TNHH Thủy Sản Đại Dương",
        date: "2023-05-15",
        amount: "180,000,000 VND",
        status: "processing",
        products: ["Mực Ống Đông Lạnh", "Cá Thu Đông Lạnh"],
      },
      {
        id: "ORD-2023-003",
        customer: "Công ty CP Xuất Nhập Khẩu Thủy Sản",
        date: "2023-05-20",
        amount: "320,000,000 VND",
        status: "pending",
        products: ["Cá Hồi Đông Lạnh", "Cá Ngừ Đóng Hộp"],
      },
    ];

    // Filter orders based on search criteria
    let filteredOrders = sampleOrders;

    if (status && status !== "all") {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === status
      );
    }

    // Display orders
    const ordersContainer = $("#orders-container");
    ordersContainer.empty();

    if (filteredOrders.length === 0) {
      $("#no-orders-message").removeClass("hidden");
    } else {
      $("#no-orders-message").addClass("hidden");

      filteredOrders.forEach((order) => {
        const statusClass = {
          pending: "bg-yellow-100 text-yellow-800",
          processing: "bg-blue-100 text-blue-800",
          completed: "bg-green-100 text-green-800",
          cancelled: "bg-red-100 text-red-800",
        };

        const statusText = {
          pending: "Đang xử lý",
          processing: "Đang chế biến",
          completed: "Hoàn thành",
          cancelled: "Đã hủy",
        };

        const orderHtml = `
          <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-3">
              <div>
                <h4 class="font-bold text-lg">${order.id}</h4>
                <p class="text-gray-600">${order.customer}</p>
              </div>
              <div class="mt-2 md:mt-0">
                <span class="${
                  statusClass[order.status]
                } px-2 py-1 rounded-full text-xs">${
          statusText[order.status]
        }</span>
              </div>
            </div>
            <div class="flex flex-col md:flex-row md:justify-between text-sm">
              <div>
                <p><span class="font-medium">Ngày đặt:</span> ${
                  order.date
                }</p>
                <p><span class="font-medium">Sản phẩm:</span> ${order.products.join(
                  ", "
                )}</p>
              </div>
              <div class="mt-2 md:mt-0 md:text-right">
                <p class="font-bold text-lg">${order.amount}</p>
                <div class="mt-2">
                  <button class="text-blue-600 mr-2"><iconify-icon icon="mdi:eye" width="18" height="18"></iconify-icon></button>
                  <button class="text-green-600 mr-2"><iconify-icon icon="mdi:file-document" width="18" height="18"></iconify-icon></button>
                  <button class="text-red-600"><iconify-icon icon="mdi:delete" width="18" height="18"></iconify-icon></button>
                </div>
              </div>
            </div>
          </div>
        `;

        ordersContainer.append(orderHtml);
      });
    }
  }

  // Initialize processing chart
  initProcessingChart();
});




