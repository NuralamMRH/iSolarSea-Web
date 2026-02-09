/**
 * Tab Loader - Loads tab content from separate files
 */
document.addEventListener("DOMContentLoaded", function () {
  // Tab configuration - maps tab IDs to component file paths
  const tabComponents = {
    "factory-info": "/dashboard/components/factory-info.html",
    "factory-list": "/dashboard/components/factory-list.html",
    "processing-data": "/dashboard/components/processing-data.html",
    "iuu-report": "/dashboard/components/iuu-report.html",
  };

  // Get all tab buttons
  const tabButtons = document.querySelectorAll(".tab-button");

  // Add click event to each tab button
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Get the tab ID from the button's data-tab attribute
      const tabId = this.getAttribute("data-tab");

      // Update subsection breadcrumb
      updateBreadcrumb(tabId);

      // Remove active class from all buttons
      tabButtons.forEach((btn) => {
        btn.classList.remove("active");
        btn.classList.remove(
          "bg-gradient-to-r",
          "from-blue-800",
          "to-indigo-600",
          "text-yellow-300"
        );
        btn.classList.add(
          "bg-gradient-to-r",
          "from-gray-200",
          "to-gray-300",
          "text-gray-700"
        );
      });

      // Add active class to clicked button
      this.classList.add("active");
      this.classList.remove(
        "bg-gradient-to-r",
        "from-gray-200",
        "to-gray-300",
        "text-gray-700"
      );
      this.classList.add(
        "bg-gradient-to-r",
        "from-blue-800",
        "to-indigo-600",
        "text-yellow-300"
      );

      // Load the tab content
      loadTabContent(tabId);
    });
  });

  // Function to update breadcrumb based on selected tab
  function updateBreadcrumb(tabId) {
    const breadcrumbText = {
      "factory-info": "Thông Tin Nhà Máy",
      "factory-list": "Danh Sách Nhà Máy",
      "processing-data": "Dữ Liệu Chế Biến",
      "iuu-report": "Báo Cáo IUU",
    };

    const subsectionBreadcrumb = document.getElementById(
      "subsection-breadcrumb"
    );
    if (subsectionBreadcrumb && breadcrumbText[tabId]) {
      subsectionBreadcrumb.innerHTML = `<span>${breadcrumbText[tabId]}</span>`;
    }
  }

  // Function to load tab content from external file
  function loadTabContent(tabId) {
    // Get the tab content container
    const tabContainer = document.getElementById(tabId);

    // If the tab container doesn't exist, return
    if (!tabContainer) {
      console.error(`Tab container with ID "${tabId}" not found.`);
      return;
    }

    // Hide all tab panes
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.style.display = "none";
    });

    // If the component path exists for this tab
    if (tabComponents[tabId]) {
      // If the tab content hasn't been loaded yet
      if (!tabContainer.dataset.loaded) {
        // Show loading indicator
        tabContainer.innerHTML =
          '<div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>';

        // Fetch the component HTML
        fetch(tabComponents[tabId])
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load component: ${response.status}`);
            }
            return response.text();
          })
          .then((html) => {
            // Set the tab content
            tabContainer.innerHTML = html;

            // Mark the tab as loaded
            tabContainer.dataset.loaded = "true";

            // Show the tab
            tabContainer.style.display = "block";

            // Initialize any scripts for the tab
            setTimeout(() => {
              initializeTabScripts(tabId);
            }, 100);
          })
          .catch((error) => {
            console.error("Error loading tab content:", error);
            tabContainer.innerHTML = `<div class="text-center py-8 text-red-600">Error loading content: ${error.message}</div>`;
            tabContainer.style.display = "block";
          });
      } else {
        // If already loaded, just show it
        tabContainer.style.display = "block";
      }
    } else {
      // If no component path exists, just show the tab
      tabContainer.style.display = "block";
    }
  }

  // Function to initialize scripts for specific tabs
  function initializeTabScripts(tabId) {
    if (tabId === "factory-info") {
      // Initialize all charts in factory-info tab
      initializeFactoryInfoCharts();
    }

    if (tabId === "processing-data") {
      // Initialize processing chart if Chart.js is loaded
      if (
        typeof Chart !== "undefined" &&
        document.getElementById("processingChart")
      ) {
        initProcessingChart();
      }
    }

    // Initialize IUU report handlers
    if (tabId === "iuu-report") {
      initIUUReportHandlers();
    }
  }

  // Function to initialize all charts in factory-info tab
  function initializeFactoryInfoCharts() {
    // Initialize trip status chart
    const tripStatusCanvas = document.getElementById(
      "tripStatusChartInCompanyInfo"
    );
    if (tripStatusCanvas && typeof Chart !== "undefined") {
      const tripStatusCtx = tripStatusCanvas.getContext("2d");

      // Trip status data
      const tripStatusData = {
        labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        datasets: [
          {
            label: "Trip Status",
            data: [12, 19, 28, 15, 18, 17, 14, 8, 12, 10],
            backgroundColor: [
              "#4338ca", // Departure - deep indigo
              "#f59e0b", // OnRoad - amber
              "#f97316", // Catching - orange
              "#ef4444", // 4Sales - red
              "#ec4899", // 2Buy - pink
              "#d97706", // 4Share - amber-brown
              "#f59e0b", // 2Share - amber
              "#65a30d", // Full - lime
              "#10b981", // Return Port - emerald
              "#06b6d4", // Docking - cyan
            ],
            borderWidth: 0,
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      };

      // Chart configuration
      const tripStatusConfig = {
        type: "bar",
        data: tripStatusData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              titleColor: "#111827",
              bodyColor: "#111827",
              borderColor: "#e5e7eb",
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                title: function (tooltipItems) {
                  const statusLabels = [
                    "Departure",
                    "OnRoad",
                    "Catching",
                    "4Sales",
                    "2Buy",
                    "4Share",
                    "2Share",
                    "Full",
                    "Return Port",
                    "Docking",
                  ];
                  const index = parseInt(tooltipItems[0].label) - 1;
                  return statusLabels[index];
                },
                label: function (context) {
                  return `Vessels: ${context.raw}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  family: "'Barlow', sans-serif",
                  size: 14,
                  weight: "bold",
                },
                color: "#111827",
              },
            },
            y: {
              grid: {
                color: "rgba(229, 231, 235, 0.5)",
                borderDash: [4, 4],
              },
              ticks: {
                font: {
                  family: "'Barlow', sans-serif",
                  size: 12,
                },
                color: "#6b7280",
                padding: 10,
              },
              beginAtZero: true,
            },
          },
        },
      };

      // Create the chart
      new Chart(tripStatusCtx, tripStatusConfig);
    }

    // Initialize region status chart
    const regionChartEl = document.getElementById("regionStatusChartInCompany");
    if (regionChartEl && typeof Chart !== "undefined") {
      const ctx = regionChartEl.getContext("2d");

      // Status labels
      const statusLabels = [
        "Departure",
        "OnRoad",
        "Catching",
        "4Sales",
        "2Buy",
        "4Share",
        "2Share",
        "Full",
        "Return Port",
        "Docking",
      ];

      // Chart data
      const chartData = {
        labels: statusLabels,
        datasets: [
          {
            label: "Region D (North)",
            data: [5, 8, 12, 7, 4, 6, 3, 2, 5, 4],
            borderColor: "rgba(248, 113, 113, 0.8)",
            backgroundColor: "rgba(248, 113, 113, 0.1)",
            pointBackgroundColor: "rgba(248, 113, 113, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(248, 113, 113, 1)",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          },
          {
            label: "Region C (Central)",
            data: [3, 10, 15, 9, 6, 8, 5, 3, 7, 6],
            borderColor: "rgba(96, 165, 250, 0.8)",
            backgroundColor: "rgba(96, 165, 250, 0.1)",
            pointBackgroundColor: "rgba(96, 165, 250, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(96, 165, 250, 1)",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          },
          {
            label: "Region B (South)",
            data: [4, 7, 10, 12, 8, 5, 4, 6, 8, 5],
            borderColor: "rgba(251, 191, 36, 0.8)",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            pointBackgroundColor: "rgba(251, 191, 36, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(251, 191, 36, 1)",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          },
          {
            label: "Region A (Mekong)",
            data: [6, 9, 14, 10, 7, 9, 6, 4, 9, 7],
            borderColor: "rgba(252, 165, 165, 0.8)",
            backgroundColor: "rgba(252, 165, 165, 0.1)",
            pointBackgroundColor: "rgba(252, 165, 165, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(252, 165, 165, 1)",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          },
        ],
      };

      // Chart configuration
      const chartConfig = {
        type: "line",
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: {
              display: false, // We're using custom legend
            },
            tooltip: {
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              titleColor: "#111827",
              bodyColor: "#111827",
              borderColor: "#e5e7eb",
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                title: function (tooltipItems) {
                  return `Status: ${tooltipItems[0].label}`;
                },
                label: function (context) {
                  return `${context.dataset.label}: ${context.raw} vessels`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  family: "'Barlow', sans-serif",
                  size: 12,
                },
                color: "#6b7280",
              },
            },
            y: {
              grid: {
                color: "rgba(229, 231, 235, 0.5)",
                borderDash: [4, 4],
              },
              ticks: {
                font: {
                  family: "'Barlow', sans-serif",
                  size: 12,
                },
                color: "#6b7280",
                padding: 10,
              },
              beginAtZero: true,
            },
          },
        },
      };

      // Create the chart
      new Chart(ctx, chartConfig);
    }
  }

  // Initialize processing chart
  function initProcessingChart() {
    const ctx = document.getElementById("processingChart");
    if (!ctx) return;

    // Sample data for the chart
    const data = {
      labels: [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
      ],
      datasets: [
        {
          label: "Sản lượng chế biến (tấn)",
          data: [850, 920, 1100, 980, 1250, 1050],
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    };

    // Chart configuration
    const config = {
      type: "line",
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Sản lượng (tấn)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Tháng",
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.raw} tấn`;
              },
            },
          },
        },
      },
    };

    // Create the chart
    new Chart(ctx, config);
  }

  // Initialize IUU report handlers
  function initIUUReportHandlers() {
    // IUU search functionality
    const iuuSearch = document.getElementById("iuu-search");
    if (iuuSearch) {
      iuuSearch.addEventListener("keyup", function () {
        const searchTerm = this.value.toLowerCase();

        document.querySelectorAll(".iuu-row").forEach((row) => {
          const vesselId = row.getAttribute("data-vessel").toLowerCase();
          const reportId = row
            .querySelector("td:nth-child(2)")
            .textContent.toLowerCase();

          if (vesselId.includes(searchTerm) || reportId.includes(searchTerm)) {
            row.style.display = "";
          } else {
            row.style.display = "none";
          }
        });
      });
    }

    // View IUU report buttons
    const viewButtons = document.querySelectorAll(".view-iuu-btn");
    viewButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const vesselId = this.closest("tr").getAttribute("data-vessel");
        document.getElementById("selected-vessel-id").textContent = vesselId;
        document.getElementById("vessel-registration").value = vesselId;
        document
          .getElementById("iuu-report-table")
          .closest(".bg-white").style.display = "none";
        document
          .getElementById("iuu-vessel-details")
          .classList.remove("hidden");
      });
    });

    // Back to IUU list button
    const backButton = document.getElementById("back-to-iuu-list");
    if (backButton) {
      backButton.addEventListener("click", function () {
        document.getElementById("iuu-vessel-details").classList.add("hidden");
        document
          .getElementById("iuu-report-table")
          .closest(".bg-white").style.display = "block";
      });
    }
  }

  // Load the default tab (first tab)
  const defaultTab = document.querySelector(".tab-button.active");
  if (defaultTab) {
    const tabId = defaultTab.getAttribute("data-tab");
    loadTabContent(tabId);
  } else if (document.querySelector(".tab-button")) {
    // If no active tab, select the first one
    const firstTab = document.querySelector(".tab-button");
    firstTab.click();
  }
});
