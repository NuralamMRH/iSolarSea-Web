// Initialize chart for processing data
function initProcessingChart() {
  // Check if Chart.js is loaded
  if (typeof Chart === "undefined") {
    // Load Chart.js dynamically if not available
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = createChart;
    document.head.appendChild(script);
  } else {
    createChart();
  }
}

function createChart() {
  const ctx = document.getElementById("processingChart");
  if (!ctx) {
    console.error("Processing chart canvas not found");
    return;
  }

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
  new Chart(ctx.getContext("2d"), config);
}