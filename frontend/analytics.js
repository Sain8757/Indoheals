// Indo Heals Premium Analytics Dashboard Script

document.addEventListener("DOMContentLoaded", () => {
  // Only run if we are on the analytics/reports page or if the elements exist
  // We'll initialize charts when the reports tab is shown
});

// Chart instances store
const charts = {};

function initAnalytics() {
  renderStatCards();
  renderTopProducts();
  renderLowVolumeList();
  renderSmartInsights();
  renderOrderAnalyticsTable();
  renderProfitAnalytics();
  
  // Setup global Chart.js defaults for premium dark theme
  Chart.defaults.color = 'rgba(255, 255, 255, 0.5)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
  
  initMainDailyChart();
  initVolumeDonutChart();
  initStatusBreakdownChart();
  initTopStatesChart();
  initAdsPerformanceChart();
  initTopProductsOrdersChart();
  initTopProductsProfitChart();
  initLossMakingChart();
  initReturnRiskChart();
  initStatesReturnChart();
}

function renderStatCards() {
  const container = document.getElementById('analytics-cards-container');
  if (!container) return;
  
  const stats = [
    { label: "TOTAL ORDERS", value: "43", color: "#4c7dc9", sub: null, icon: "📦" },
    { label: "DELIVERED", value: "31", color: "#1D9E75", sub: "72.1%", icon: "✅" },
    { label: "CANCELLED", value: "10", color: "#e05858", sub: "23.3%", icon: "❌" },
    { label: "CUSTOMER RETURNS", value: "10", color: "#8a8d91", sub: "32.3%", icon: "↩️" },
    { label: "RTO", value: "2", color: "#8e5ea2", sub: "6.1%", icon: "🚚" },
    { label: "TOTAL RETURNS", value: "12", color: "#e83e8c", sub: "36.4%", icon: "🔄" },
    { label: "AD ORDERS", value: "0", color: "#fd7e14", sub: "0%", icon: "📢" },
    { label: "AD CANCELLED", value: "0", color: "#d9534f", sub: "0%", icon: "🛑" }
  ];

  container.innerHTML = stats.map(s => `
    <div style="background: var(--bg2); border: 1px solid var(--border); border-top: 3px solid ${s.color}; border-radius: 8px; padding: 16px; display: flex; align-items: flex-start; gap: 12px; transition: transform 0.2s;">
      <div style="font-size: 24px;">${s.icon}</div>
      <div>
        <div style="color: ${s.color}; font-size: 24px; font-weight: 800; line-height: 1;">${s.value}</div>
        <div style="color: var(--text3); font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.05em;">${s.label}</div>
        ${s.sub ? `<div style="color: var(--text3); font-size: 11px; margin-top: 4px;">${s.sub}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderTopProducts() {
  const container = document.getElementById('top-5-products-container');
  if (!container) return;
  
  const products = [
    { rank: 1, name: "Obi_Plazzo_C2", orders: 15, share: "34.9%", profit: "₹1,212.80", color: "#1D9E75" },
    { rank: 2, name: "Sain_WP_02", orders: 10, share: "23.3%", profit: "₹513.71", color: "#1D9E75" },
    { rank: 3, name: "Sain_Hair_7", orders: 4, share: "9.3%", profit: "₹299.41", color: "#1D9E75" },
    { rank: 4, name: "Sain_Hair_05_Li...", orders: 3, share: "7%", profit: "₹91.64", color: "#1D9E75" },
    { rank: 5, name: "Sain_85", orders: 2, share: "4.7%", profit: "₹82.30", color: "#1D9E75" }
  ];

  container.innerHTML = products.map(p => `
    <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;">
      <div style="background: rgba(76, 125, 201, 0.1); color: #4c7dc9; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">${p.rank}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="color: var(--text1); font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
        <div style="color: var(--text3); font-size: 10px; margin-top: 2px;">${p.orders} orders • ${p.share} share</div>
      </div>
      <div style="color: ${p.color}; font-size: 12px; font-weight: 700;">${p.profit}</div>
    </div>
  `).join('');
}

function renderLowVolumeList() {
  const container = document.getElementById('low-volume-list');
  if (!container) return;
  
  const products = [
    { name: "Obi_Plazzo_C2", orders: 15, profit: "₹1,212.80" },
    { name: "Sain_WP_02", orders: 10, profit: "₹513.71" },
    { name: "Sain_Hair_7", orders: 4, profit: "₹299.41" },
    { name: "Sain_Hair_05_Light Blue", orders: 3, profit: "₹91.64" },
    { name: "Sain_85", orders: 2, profit: "₹82.30" }
  ];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px;">
      <div style="font-size: 14px; font-weight: bold; color: var(--text1);">13 <span style="font-size:10px; font-weight:normal; color:var(--text3);">SKUs</span></div>
      <div style="font-size: 14px; font-weight: bold; color: var(--text1);">43 <span style="font-size:10px; font-weight:normal; color:var(--text3);">Orders</span></div>
      <div style="font-size: 14px; font-weight: bold; color: var(--text1);">100% <span style="font-size:10px; font-weight:normal; color:var(--text3);">Share</span></div>
    </div>
    ${products.map(p => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 12px; color: var(--text1); font-weight: 600;">${p.name}</div>
        <div style="display: flex; gap: 12px; font-size: 11px;">
          <span style="color: var(--text3);">${p.orders} orders</span>
          <span style="color: #1D9E75; font-weight: 700; width: 50px; text-align: right;">${p.profit}</span>
        </div>
      </div>
    `).join('')}
  `;
}

function renderSmartInsights() {
  const container = document.getElementById('smart-insights-container');
  if (!container) return;

  const insights = [
    {
      title: "Top product found",
      desc: "Obi_Plazzo_C2 contributes 34.9% of total orders.",
      action: "Scale carefully and keep stock ready for this SKU.",
      color: "#1D9E75",
      bg: "rgba(29, 158, 117, 0.05)"
    },
    {
      title: "Customer returns need attention",
      desc: "Customer return rate is 32.3%.",
      action: "Check product photos, sizing/details, quality, and packaging for high-return SKUs.",
      color: "#fd7e14",
      bg: "rgba(253, 126, 20, 0.05)"
    },
    {
      title: "Loss products detected",
      desc: "1 SKU(s) are currently negative after cost.",
      action: "Stop ads, increase price, reduce product cost, or pause weak SKUs.",
      color: "#e05858",
      bg: "rgba(224, 88, 88, 0.05)"
    }
  ];

  container.innerHTML = insights.map(i => `
    <div style="background: ${i.bg}; border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid ${i.color}; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
      <div style="font-size: 13px; font-weight: 700; color: var(--text1);">${i.title}</div>
      <div style="font-size: 12px; color: var(--text2);">${i.desc}</div>
      <div style="font-size: 11px; color: var(--text3); margin-top: auto; padding-top: 8px;">${i.action}</div>
    </div>
  `).join('');
}

function createChart(ctxId, config) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;
  if (charts[ctxId]) charts[ctxId].destroy();
  charts[ctxId] = new Chart(ctx, config);
}

function initMainDailyChart() {
  createChart('chart-main-daily', {
    type: 'line',
    data: {
      labels: ['01-02', '01-04', '01-09', '01-11', '01-14', '01-18', '01-21', '01-24', '01-27', '01-29', '01-31'],
      datasets: [
        {
          label: 'Orders',
          data: [1, 3, 4, 1, 3, 4, 1, 2, 1, 2, 1],
          borderColor: '#4c7dc9',
          backgroundColor: 'rgba(76, 125, 201, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Profit',
          data: [0, 400, 500, -100, -200, 600, 200, -50, 300, 0, 300],
          borderColor: '#1D9E75',
          backgroundColor: 'rgba(29, 158, 117, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        },
        {
          label: 'Returns',
          data: [0, 0, 2, 0, 2, 0, 1, 0, 1, 0, 0],
          borderColor: '#e05858',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6 } } },
      scales: {
        x: { grid: { display: false } },
        y: { type: 'linear', display: true, position: 'left', min: 0, max: 5 },
        y1: { type: 'linear', display: true, position: 'right', min: -200, max: 600, grid: { drawOnChartArea: false } }
      }
    }
  });
}

function initVolumeDonutChart() {
  createChart('chart-volume-donut', {
    type: 'doughnut',
    data: {
      labels: ['High volume', 'Medium volume', 'Low volume'],
      datasets: [{
        data: [0, 0, 43],
        backgroundColor: ['#4c7dc9', '#1D9E75', '#fd7e14'],
        borderWidth: 0,
        cutout: '75%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function initStatusBreakdownChart() {
  createChart('chart-status-breakdown', {
    type: 'doughnut',
    data: {
      labels: ['Delivered', 'Cancelled', 'RTO', 'Shipped/RTS', 'Other'],
      datasets: [{
        data: [31, 10, 2, 0, 0],
        backgroundColor: ['#1D9E75', '#e05858', '#fd7e14', '#8e5ea2', '#4c7dc9'],
        borderWidth: 2,
        borderColor: '#131614',
        cutout: '65%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
  
  // Custom legend text logic can be added here if needed to match the screenshot exactly
}

function initTopStatesChart() {
  createChart('chart-top-states', {
    type: 'bar',
    data: {
      labels: ['Maharashtra', 'Karnataka', 'Gujarat', 'Andhra Pradesh', 'Jharkhand', 'Telangana', 'Uttar Pradesh', 'Rajasthan', 'Chhattisgarh', 'Kerala'],
      datasets: [{
        label: 'Orders',
        data: [6, 5, 4, 3, 3, 3, 2, 2, 2, 2],
        backgroundColor: '#4c7dc9',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function initAdsPerformanceChart() {
  createChart('chart-ads-performance', {
    type: 'bar',
    data: {
      labels: ['Organic Orders'],
      datasets: [{
        label: 'Orders',
        data: [43],
        backgroundColor: '#4c7dc9',
        borderRadius: 4,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { min: 0, max: 50, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function initTopProductsOrdersChart() {
  createChart('chart-top-products-orders', {
    type: 'bar',
    data: {
      labels: ['Obi_Plazzo_C2', 'Sain_WP_02', 'Sain_Hair_7', 'Sain_Hair_05_Light Blue', 'Sain_85'],
      datasets: [{
        label: 'Orders',
        data: [15, 10, 4, 3, 2],
        backgroundColor: '#4c7dc9',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 15, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function initTopProductsProfitChart() {
  createChart('chart-top-products-profit', {
    type: 'bar',
    data: {
      labels: ['Obi_Plazzo_C2', 'Sain_WP_02', 'Sain_Hair_7', 'Sain_207', 'Sain_90'],
      datasets: [{
        label: 'Profit',
        data: [1212, 514, 299, 131, 92],
        backgroundColor: '#1D9E75',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 1400, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function initLossMakingChart() {
  createChart('chart-loss-making', {
    type: 'bar',
    data: {
      labels: ['Sain_Hair_05_Skin'],
      datasets: [{
        label: 'Loss',
        data: [101],
        backgroundColor: '#e05858',
        borderRadius: 4,
        barThickness: 20
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 120, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function initReturnRiskChart() {
  createChart('chart-return-risk', {
    type: 'bar',
    data: {
      labels: ['Sain_WP_02', 'Sain_85', 'Sain_Hair_05_Skin', 'Obi_Plazzo_C2', 'Sain_Hair_7'],
      datasets: [{
        label: 'Return Risk %',
        data: [50, 50, 50, 41.7, 33.3],
        backgroundColor: '#fd7e14',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 50, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false } }
      }
    }
  });
}

function initStatesReturnChart() {
  createChart('chart-states-return', {
    type: 'bar',
    data: {
      labels: ['Odisha', 'Punjab', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Jharkhand', 'Assam'],
      datasets: [
        {
          label: 'Return %',
          data: [100, 100, 66.7, 66.7, 50, 50, 40, 33.3, 33.3, 0],
          backgroundColor: '#8e5ea2',
          borderRadius: 4
        },
        {
          label: 'RTO %',
          data: [0, 100, 0, 0, 0, 0, 20, 0, 0, 0],
          backgroundColor: '#fd7e14',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true } } },
      scales: {
        x: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false }, stacked: false }
      }
    }
  });
}

// Hook into existing showPage function in admin.html if possible, or bind to our tabs
window.switchAnalyticsTab = function(tabId) {
  document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.analytics-panel').forEach(p => p.classList.remove('active'));
  
  document.getElementById('tab-' + tabId).classList.add('active');
  document.getElementById('analytics-' + tabId).classList.add('active');
  
  if (tabId === 'overview') {
    // Re-init charts if needed to fix resize issues
    initAnalytics();
  }
};

// Initialize if already on the page
if (document.getElementById('analytics-cards-container')) {
  setTimeout(initAnalytics, 500);
}

// Hook into admin.html's showPage to initialize charts when Reports tab is clicked
const originalShowPage = window.showPage;
if (typeof originalShowPage === 'function') {
  window.showPage = function(id, el) {
    originalShowPage(id, el);
    if (id === 'reports') {
      setTimeout(initAnalytics, 200);
    }
  };
}

function renderOrderAnalyticsTable() {
  const tbody = document.getElementById('analytics-orders-body');
  if (!tbody) return;

  const data = [
    { sku: "Obi_Plazzo_C2", orders: 15, qty: 15, delQty: 12, can: 3, ret: 5, retPct: "41.7%", rto: 0, rtoPct: "0%", totRet: 5, adOrd: 0 },
    { sku: "Sain_5", orders: 1, qty: 1, delQty: 0, can: 1, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_85", orders: 2, qty: 2, delQty: 1, can: 0, ret: 0, retPct: "0%", rto: 1, rtoPct: "50%", totRet: 1, adOrd: 0 },
    { sku: "Sain_90", orders: 1, qty: 1, delQty: 1, can: 0, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_100", orders: 1, qty: 1, delQty: 1, can: 0, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_207", orders: 1, qty: 1, delQty: 1, can: 0, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_245", orders: 1, qty: 1, delQty: 1, can: 0, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_425", orders: 1, qty: 1, delQty: 0, can: 1, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_Hair_05_Light Blue", orders: 3, qty: 3, delQty: 2, can: 1, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_Hair_05_Natural Beige", orders: 1, qty: 1, delQty: 0, can: 1, ret: 0, retPct: "0%", rto: 0, rtoPct: "0%", totRet: 0, adOrd: 0 },
    { sku: "Sain_Hair_05_Skin", orders: 2, qty: 2, delQty: 2, can: 0, ret: 1, retPct: "50%", rto: 0, rtoPct: "0%", totRet: 1, adOrd: 0 },
    { sku: "Sain_Hair_7", orders: 4, qty: 4, delQty: 2, can: 1, ret: 0, retPct: "0%", rto: 1, rtoPct: "33.3%", totRet: 1, adOrd: 0 },
    { sku: "Sain_WP_02", orders: 10, qty: 10, delQty: 8, can: 2, ret: 4, retPct: "50%", rto: 0, rtoPct: "0%", totRet: 4, adOrd: 0 }
  ];

  const total = { sku: "Total", orders: 43, qty: 43, delQty: 31, can: 10, ret: 10, retPct: "32.3%", rto: 2, rtoPct: "6.1%", totRet: 12, adOrd: 0 };

  const getBadgeStyle = (sku) => {
    if (sku === 'Total') return `font-weight:700; color:var(--text1); font-size:13px;`;
    return `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 600; color: var(--text1); display: inline-block;`;
  };

  const getRowHtml = (r, isTotal = false) => {
    const trStyle = isTotal ? `border-top: 2px solid #4c7dc9; border-bottom: 2px solid #4c7dc9; font-weight: bold; background: rgba(76, 125, 201, 0.05);` : ``;
    return `
      <tr style="${trStyle}">
        <td style="padding: 12px 16px;"><div style="${getBadgeStyle(r.sku)}">${r.sku}</div></td>
        <td style="padding: 12px 16px; color: #4c7dc9; font-weight: 600;">${r.orders}</td>
        <td style="padding: 12px 16px; color: var(--text3);">${r.qty}</td>
        <td style="padding: 12px 16px; color: #1D9E75; font-weight: 600;">${r.delQty}</td>
        <td style="padding: 12px 16px; color: #e05858; font-weight: 600;">${r.can}</td>
        <td style="padding: 12px 16px; color: #fd7e14; font-weight: 600;">${r.ret}</td>
        <td style="padding: 12px 16px; color: #fd7e14; font-weight: 600;">${r.retPct}</td>
        <td style="padding: 12px 16px; color: #8e5ea2; font-weight: 600;">${r.rto}</td>
        <td style="padding: 12px 16px; color: #8e5ea2; font-weight: 600;">${r.rtoPct}</td>
        <td style="padding: 12px 16px; color: #e05858; font-weight: 600;">${r.totRet}</td>
        <td style="padding: 12px 16px; color: var(--text3);">${r.adOrd}</td>
      </tr>
    `;
  };

  tbody.innerHTML = data.map(r => getRowHtml(r)).join('') + getRowHtml(total, true);
}

function renderProfitAnalytics() {
  // 1. Missing Rate Card SKUs
  const missingContainer = document.getElementById('pl-missing-rates');
  if (missingContainer) {
    const skus = [
      "Obi_Plazzo_C2", "Sain_5", "Sain_85", "Sain_90", "Sain_100", "Sain_207", "Sain_245", 
      "Sain_425", "Sain_Hair_05_Light Blue", "Sain_Hair_05_Natural Beige", 
      "Sain_Hair_05_Skin", "Sain_Hair_7", "Sain_WP_02"
    ];
    missingContainer.innerHTML = skus.map(s => 
      `<div style="background: rgba(253, 126, 20, 0.1); border: 1px solid rgba(253, 126, 20, 0.3); border-radius: 99px; padding: 4px 12px; font-size: 11px; font-weight: 600; color: var(--text1); font-family: 'Courier New', Courier, monospace;">${s}</div>`
    ).join('');
  }

  // 2. Profit Analytics Table
  const tbody = document.getElementById('analytics-pl-body');
  if (tbody) {
    const data = [
      { sku: "Obi_Plazzo_C2", sale: "₹2,047.80", qty: 12, rate: "₹0.00", cog: "₹0.00", ret: "₹835.00 (5)", claims: "₹0.00 (0)", net: "₹1,212.80", netVal: 1212.80 },
      { sku: "Sain_5", sale: "₹0.00", qty: 0, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹0.00", netVal: 0 },
      { sku: "Sain_85", sale: "₹82.30", qty: 1, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹82.30", netVal: 82.30 },
      { sku: "Sain_90", sale: "₹91.82", qty: 1, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹91.82", netVal: 91.82 },
      { sku: "Sain_100", sale: "₹80.71", qty: 1, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹80.71", netVal: 80.71 },
      { sku: "Sain_207", sale: "₹130.70", qty: 1, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹130.70", netVal: 130.70 },
      { sku: "Sain_245", sale: "₹86.70", qty: 1, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹86.70", netVal: 86.70 },
      { sku: "Sain_425", sale: "₹0.00", qty: 0, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹0.00", netVal: 0 },
      { sku: "Sain_Hair_05_Light Blue", sale: "₹91.64", qty: 2, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹91.64", netVal: 91.64 },
      { sku: "Sain_Hair_05_Natural Beige", sale: "₹0.00", qty: 0, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹0.00", netVal: 0 },
      { sku: "Sain_Hair_05_Skin", sale: "₹51.88", qty: 2, rate: "₹0.00", cog: "₹0.00", ret: "₹153.00 (1)", claims: "₹0.00 (0)", net: "₹-101.12", netVal: -101.12 },
      { sku: "Sain_Hair_7", sale: "₹299.41", qty: 2, rate: "₹0.00", cog: "₹0.00", ret: "₹0.00 (0)", claims: "₹0.00 (0)", net: "₹299.41", netVal: 299.41 },
      { sku: "Sain_WP_02", sale: "₹1,174.71", qty: 8, rate: "₹0.00", cog: "₹0.00", ret: "₹661.00 (4)", claims: "₹0.00 (0)", net: "₹513.71", netVal: 513.71 }
    ];

    const total = { sku: "Total", sale: "₹4,137.67", qty: 31, rate: "—", cog: "₹0.00", ret: "₹1,649.00 (10)", claims: "₹0.00 (0)", net: "₹2,488.67", netVal: 2488.67 };

    const getBadgeStyle = (sku) => {
      if (sku === 'Total') return `font-weight:700; color:var(--text1); font-size:13px;`;
      return `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 4px 8px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 600; color: var(--text1); display: inline-block;`;
    };

    const getRowHtml = (r, isTotal = false) => {
      const trStyle = isTotal ? `border-top: 2px solid #4c7dc9; border-bottom: 2px solid #4c7dc9; font-weight: bold; background: rgba(76, 125, 201, 0.05);` : ``;
      const netColor = r.netVal > 0 ? '#1D9E75' : (r.netVal < 0 ? '#e05858' : 'var(--text3)');
      const retColor = r.ret !== '₹0.00 (0)' ? '#e05858' : 'var(--text3)';
      const saleColor = r.sale !== '₹0.00' ? '#4c7dc9' : 'var(--text3)';
      
      return `
        <tr style="${trStyle}">
          <td style="padding: 12px 16px;"><div style="${getBadgeStyle(r.sku)}">${r.sku}</div></td>
          <td style="padding: 12px 16px; color: ${saleColor}; font-weight: 600;">${r.sale}</td>
          <td style="padding: 12px 16px; color: var(--text3);">${r.qty}</td>
          <td style="padding: 12px 16px; color: var(--text3);">${r.rate}</td>
          <td style="padding: 12px 16px; color: var(--text3);">${r.cog}</td>
          <td style="padding: 12px 16px; color: ${retColor}; font-weight: 600;">${r.ret}</td>
          <td style="padding: 12px 16px; color: var(--text3);">${r.claims}</td>
          <td style="padding: 12px 16px; color: ${netColor}; font-weight: 600;">${r.net}</td>
        </tr>
      `;
    };

    tbody.innerHTML = data.map(r => getRowHtml(r)).join('') + getRowHtml(total, true);
  }

  // 3. Final Profit Table
  const finalTbody = document.getElementById('analytics-final-profit-body');
  if (finalTbody) {
    finalTbody.innerHTML = `
      <tr>
        <td style="padding: 12px 16px; color: var(--text2);">Gross Sale</td>
        <td style="padding: 12px 16px; color: #4c7dc9; font-weight: 600; text-align: right;">₹4,137.67</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; color: var(--text2);">Claim Money Received (0 Qty)</td>
        <td style="padding: 12px 16px; color: var(--text3); font-weight: 600; text-align: right;">₹0.00</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; color: var(--text2);">Cost of Goods</td>
        <td style="padding: 12px 16px; color: var(--text3); font-weight: 600; text-align: right;">₹0.00</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; color: var(--text2);">Claims/Lost Product Cost</td>
        <td style="padding: 12px 16px; color: var(--text3); font-weight: 600; text-align: right;">₹0.00</td>
      </tr>
      <tr style="border-bottom: 2px solid var(--border);">
        <td style="padding: 12px 16px; color: var(--text2);">Return Deductions</td>
        <td style="padding: 12px 16px; color: #e05858; font-weight: 600; text-align: right;">₹1,649.00</td>
      </tr>
      <tr style="background: rgba(255,255,255,0.02);">
        <td style="padding: 12px 16px; font-weight: 700; color: var(--text1);">
          <div style="font-size: 11px; color: var(--text3); font-weight: 600; margin-bottom: 4px; text-transform: uppercase;">Total Sale</div>
          <div style="color: #4c7dc9;">₹4,137.67</div>
        </td>
        <td style="padding: 12px 16px; font-weight: 700; color: var(--text1); text-align: right; display: flex; justify-content: flex-end; gap: 48px;">
          <div>
            <div style="font-size: 11px; color: var(--text3); font-weight: 600; margin-bottom: 4px; text-transform: uppercase; text-align: left;">Total Expense</div>
            <div style="color: #e05858; text-align: left;">₹1,649.00</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text3); font-weight: 600; margin-bottom: 4px; text-transform: uppercase; text-align: right;">Net Profit</div>
            <div style="color: #1D9E75; font-size: 16px;">₹2,488.67</div>
          </div>
        </td>
      </tr>
    `;
  }
}
