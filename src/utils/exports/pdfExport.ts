import {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  MetricsStats,
  UserSummary,
} from './types';
import { formatDateRangeForFilename } from './helpers';
import { formatDate } from '../formatters';

export function exportReportPdf(
  stats: MetricsStats,
  enterpriseName: string | null,
  userSummaries: UserSummary[],
  languageStats: LanguageStats[],
  engagementData: DailyEngagementData[],
  chatUsersData: DailyChatUsersData[],
  chatRequestsData: DailyChatRequestsData[]
): void {
  const reportHtml = generatePdfHtml(
    stats,
    enterpriseName,
    userSummaries,
    languageStats,
    engagementData,
    chatUsersData,
    chatRequestsData
  );

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function generatePdfHtml(
  stats: MetricsStats,
  enterpriseName: string | null,
  userSummaries: UserSummary[],
  languageStats: LanguageStats[],
  engagementData: DailyEngagementData[],
  chatUsersData: DailyChatUsersData[],
  chatRequestsData: DailyChatRequestsData[]
): string {
  const formattedStartDate = formatDate(stats.reportStartDay);
  const formattedEndDate = formatDate(stats.reportEndDay);
  
  // Calculate totals from user summaries
  const totalInteractions = userSummaries.reduce((sum, u) => sum + u.total_user_initiated_interactions, 0);
  const totalGenerations = userSummaries.reduce((sum, u) => sum + u.total_code_generation_activities, 0);
  const totalAcceptances = userSummaries.reduce((sum, u) => sum + u.total_code_acceptance_activities, 0);
  const acceptanceRate = totalGenerations > 0 ? ((totalAcceptances / totalGenerations) * 100).toFixed(1) : '0';
  
  const topLanguages = languageStats.slice(0, 10);
  const topUsers = [...userSummaries]
    .sort((a, b) => b.total_code_acceptance_activities - a.total_code_acceptance_activities)
    .slice(0, 10);

  const dateRangeFilename = formatDateRangeForFilename(stats.reportStartDay, stats.reportEndDay);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Copilot Usage Report ${dateRangeFilename}</title>
  <style>
    ${getPdfStyles()}
  </style>
</head>
<body>
  <div class="header">
    <h1>GitHub Copilot Usage Report</h1>
    <p class="subtitle">
      ${formattedStartDate} — ${formattedEndDate}
      ${enterpriseName ? `<span class="enterprise"> | ${enterpriseName}</span>` : ''}
    </p>
  </div>

  <h2>Summary Statistics</h2>
  ${renderSummaryStats(stats, totalInteractions, totalGenerations, totalAcceptances, acceptanceRate)}

  <h2>Daily User Engagement</h2>
  <p class="chart-description">Percentage of total users active each day during the reporting period</p>
  ${renderEngagementChart(engagementData)}

  ${chatUsersData.length > 0 ? `
  <h2>Daily Chat Users Trends</h2>
  <p class="chart-description">Number of unique users using different chat modes each day</p>
  ${renderChatUsersChart(chatUsersData)}
  ` : ''}

  ${chatRequestsData.length > 0 ? `
  <h2>Daily Chat Requests</h2>
  <p class="chart-description">Number of user-initiated chat interactions per mode each day</p>
  ${renderChatRequestsChart(chatRequestsData)}
  ` : ''}

  <h2>Top Languages</h2>
  ${renderLanguagesTable(topLanguages)}

  <h2>Top Users by Code Acceptances</h2>
  ${renderUsersTable(topUsers)}

  <h2>Daily Activity Summary</h2>
  <h3>Engagement Trends</h3>
  ${renderEngagementTable(engagementData)}

  ${chatUsersData.length > 0 ? `
  <h3>Chat &amp; Agent Mode User Trends</h3>
  ${renderChatUsersTable(chatUsersData)}
  ` : ''}

  ${chatRequestsData.length > 0 ? `
  <h3>Chat &amp; Agent Mode Request Trends</h3>
  ${renderChatRequestsTable(chatRequestsData)}
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p>GitHub Copilot Usage Metrics Viewer</p>
  </div>
</body>
</html>
  `;
}

function getPdfStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-top: 32px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    h3 {
      font-size: 14px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .header {
      margin-bottom: 32px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
    }
    .enterprise {
      color: #2563eb;
      font-weight: 500;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    tr:hover {
      background: #f9fafb;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-green {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-blue {
      background: #dbeafe;
      color: #1e40af;
    }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 11px;
      text-align: center;
    }
    .chart-container {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .chart-description {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 11px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    .chart-stats {
      display: flex;
      gap: 24px;
      margin-top: 12px;
      font-size: 11px;
      color: #6b7280;
    }
    .chart-stats strong {
      color: #374151;
    }
    .chart-stats-inline {
      display: flex;
      gap: 16px;
      font-size: 11px;
      color: #6b7280;
    }
    .chart-stats-inline strong {
      color: #111827;
    }
    .chart-footer {
      margin-top: 12px;
      font-size: 11px;
      color: #6b7280;
    }
    .chart-footer-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
      font-size: 11px;
      color: #6b7280;
    }
    @media print {
      body {
        padding: 20px;
      }
      .stats-grid {
        grid-template-columns: repeat(4, 1fr);
      }
      .chart-container {
        page-break-inside: avoid;
      }
      h2 {
        page-break-before: auto;
        page-break-after: avoid;
      }
      table {
        page-break-inside: avoid;
      }
    }
  `;
}

function renderSummaryStats(
  stats: MetricsStats,
  totalInteractions: number,
  totalGenerations: number,
  totalAcceptances: number,
  acceptanceRate: string
): string {
  return `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${stats.uniqueUsers.toLocaleString()}</div>
      <div class="stat-label">Unique Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.chatUsers.toLocaleString()}</div>
      <div class="stat-label">Chat Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.agentUsers.toLocaleString()}</div>
      <div class="stat-label">Agent Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalRecords.toLocaleString()}</div>
      <div class="stat-label">Total Records</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${totalInteractions.toLocaleString()}</div>
      <div class="stat-label">Total Interactions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalGenerations.toLocaleString()}</div>
      <div class="stat-label">Total Generations</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalAcceptances.toLocaleString()}</div>
      <div class="stat-label">Total Acceptances</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${acceptanceRate}%</div>
      <div class="stat-label">Acceptance Rate</div>
    </div>
  </div>
  `;
}

function renderLanguagesTable(topLanguages: LanguageStats[]): string {
  return `
  <table>
    <thead>
      <tr>
        <th>Language</th>
        <th class="text-right">Generations</th>
        <th class="text-right">Acceptances</th>
        <th class="text-right">LOC Added</th>
        <th class="text-right">LOC Deleted</th>
      </tr>
    </thead>
    <tbody>
      ${topLanguages.map(lang => `
        <tr>
          <td>${lang.language}</td>
          <td class="text-right">${lang.totalGenerations.toLocaleString()}</td>
          <td class="text-right">${lang.totalAcceptances.toLocaleString()}</td>
          <td class="text-right">${lang.locAdded.toLocaleString()}</td>
          <td class="text-right">${lang.locDeleted.toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  `;
}

function renderUsersTable(topUsers: UserSummary[]): string {
  return `
  <table>
    <thead>
      <tr>
        <th>Username</th>
        <th class="text-right">Days Active</th>
        <th class="text-right">Interactions</th>
        <th class="text-right">Acceptances</th>
        <th class="text-center">Chat</th>
        <th class="text-center">Agent</th>
      </tr>
    </thead>
    <tbody>
      ${topUsers.map(user => `
        <tr>
          <td>${user.user_login}</td>
          <td class="text-right">${user.days_active}</td>
          <td class="text-right">${user.total_user_initiated_interactions.toLocaleString()}</td>
          <td class="text-right">${user.total_code_acceptance_activities.toLocaleString()}</td>
          <td class="text-center">${user.used_chat ? '<span class="badge badge-blue">Yes</span>' : 'No'}</td>
          <td class="text-center">${user.used_agent ? '<span class="badge badge-green">Yes</span>' : 'No'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  `;
}

function renderEngagementTable(engagementData: DailyEngagementData[]): string {
  return `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th class="text-right">Active Users</th>
        <th class="text-right">Total Users</th>
        <th class="text-right">Engagement %</th>
      </tr>
    </thead>
    <tbody>
      ${engagementData.slice(0, 30).map(day => `
        <tr>
          <td>${day.date}</td>
          <td class="text-right">${day.activeUsers.toLocaleString()}</td>
          <td class="text-right">${day.totalUsers.toLocaleString()}</td>
          <td class="text-right">${day.engagementPercentage.toFixed(1)}%</td>
        </tr>
      `).join('')}
      ${engagementData.length > 30 ? `
        <tr>
          <td colspan="4" class="text-center" style="color: #6b7280; font-style: italic;">
            ... and ${engagementData.length - 30} more days
          </td>
        </tr>
      ` : ''}
    </tbody>
  </table>
  `;
}

function renderChatUsersTable(chatUsersData: DailyChatUsersData[]): string {
  return `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th class="text-right">Ask Mode</th>
        <th class="text-right">Agent Mode</th>
        <th class="text-right">Edit Mode</th>
        <th class="text-right">Inline Mode</th>
      </tr>
    </thead>
    <tbody>
      ${chatUsersData.slice(0, 30).map(day => `
        <tr>
          <td>${day.date}</td>
          <td class="text-right">${day.askModeUsers.toLocaleString()}</td>
          <td class="text-right">${day.agentModeUsers.toLocaleString()}</td>
          <td class="text-right">${day.editModeUsers.toLocaleString()}</td>
          <td class="text-right">${day.inlineModeUsers.toLocaleString()}</td>
        </tr>
      `).join('')}
      ${chatUsersData.length > 30 ? `
        <tr>
          <td colspan="5" class="text-center" style="color: #6b7280; font-style: italic;">
            ... and ${chatUsersData.length - 30} more days
          </td>
        </tr>
      ` : ''}
    </tbody>
  </table>
  `;
}

function renderEngagementChart(data: DailyEngagementData[]): string {
  if (data.length === 0) return '<p>No engagement data available</p>';

  const width = 800;
  const height = 300;
  const padding = { top: 40, right: 30, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.engagementPercentage);
  const maxValue = 100;
  const minValue = 0;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const pointCoords = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.engagementPercentage - minValue) / (maxValue - minValue)) * chartHeight;
    return { x, y };
  });

  const points = pointCoords.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`;

  const dataPointCircles = pointCoords.map(p => 
    `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#3b82f6" stroke="white" stroke-width="1" />`
  ).join('');

  const xLabels = getChartXLabelsEnhanced(data.map(d => d.date), chartWidth, padding, height);
  const yLabels = getChartYLabelsEnhanced(0, maxValue, chartHeight, padding, '%', 10);
  const gridLines = renderChartGridEnhanced(chartWidth, chartHeight, padding, 10);

  return `
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-color" style="background: #3b82f6"></span> User Engagement %</span>
      </div>
      <div class="chart-stats-inline">
        <span>Avg: <strong>${avg.toFixed(2)}%</strong></span>
        <span>Max: <strong>${max.toFixed(2)}%</strong></span>
        <span>Min: <strong>${min.toFixed(2)}%</strong></span>
      </div>
    </div>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${gridLines}
      <polygon points="${areaPoints}" fill="rgba(59, 130, 246, 0.1)" />
      <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" />
      ${dataPointCircles}
      ${xLabels}
      ${yLabels}
      <text x="${padding.left + chartWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500">Date</text>
      <text x="15" y="${padding.top + chartHeight / 2}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500" transform="rotate(-90, 15, ${padding.top + chartHeight / 2})">Engagement Percentage (%)</text>
    </svg>
    <div class="chart-footer">
      Total unique users in reporting period: ${data[0]?.totalUsers || 0}
    </div>
  </div>
  `;
}

function renderChatUsersChart(data: DailyChatUsersData[]): string {
  if (data.length === 0) return '<p>No chat users data available</p>';

  const width = 800;
  const height = 300;
  const padding = { top: 40, right: 30, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => [d.askModeUsers, d.agentModeUsers, d.editModeUsers, d.inlineModeUsers]);
  const rawMaxValue = Math.max(...allValues, 1);
  const maxValue = getNiceMaxValue(rawMaxValue);

  const datasets = [
    { values: data.map(d => d.askModeUsers), color: '#22c55e', label: 'Ask Mode' },
    { values: data.map(d => d.agentModeUsers), color: '#a855f7', label: 'Agent Mode' },
    { values: data.map(d => d.editModeUsers), color: '#f59e0b', label: 'Edit Mode' },
    { values: data.map(d => d.inlineModeUsers), color: '#ef4444', label: 'Inline Mode' },
  ];

  const linesAndPoints = datasets.map(dataset => {
    const pointCoords = dataset.values.map((v, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (v / maxValue) * chartHeight;
      return { x, y };
    });
    const points = pointCoords.map(p => `${p.x},${p.y}`).join(' ');
    const circles = pointCoords.map(p => 
      `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${dataset.color}" stroke="white" stroke-width="1" />`
    ).join('');
    return `<polyline points="${points}" fill="none" stroke="${dataset.color}" stroke-width="2" />${circles}`;
  }).join('');

  const xLabels = getChartXLabelsEnhanced(data.map(d => d.date), chartWidth, padding, height);
  const yLabels = getChartYLabelsEnhanced(0, maxValue, chartHeight, padding, '', 5);
  const gridLines = renderChartGridEnhanced(chartWidth, chartHeight, padding, 5);

  const legend = datasets.map(d => `
    <span class="legend-item">
      <span class="legend-color" style="background: ${d.color}"></span>
      ${d.label}
    </span>
  `).join('');

  return `
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-legend">${legend}</div>
    </div>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${gridLines}
      ${linesAndPoints}
      ${xLabels}
      ${yLabels}
      <text x="${padding.left + chartWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500">Date</text>
      <text x="15" y="${padding.top + chartHeight / 2}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500" transform="rotate(-90, 15, ${padding.top + chartHeight / 2})">Number of Users</text>
    </svg>
  </div>
  `;
}

function getNiceMaxValue(value: number): number {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

function renderChartGridEnhanced(chartWidth: number, chartHeight: number, padding: { top: number; left: number }, tickCount: number): string {
  const lines = [];
  for (let i = 0; i <= tickCount; i++) {
    const y = padding.top + (i / tickCount) * chartHeight;
    lines.push(`<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`);
  }
  return lines.join('');
}

function getChartXLabelsEnhanced(dates: string[], chartWidth: number, padding: { top: number; left: number }, svgHeight: number): string {
  const step = Math.ceil(dates.length / 10);
  return dates
    .filter((_, i) => i % step === 0 || i === dates.length - 1)
    .map((date) => {
      const originalIndex = dates.indexOf(date);
      const x = padding.left + (originalIndex / (dates.length - 1 || 1)) * chartWidth;
      const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<text x="${x}" y="${svgHeight - 25}" text-anchor="middle" font-size="10" fill="#6b7280">${formattedDate}</text>`;
    })
    .join('');
}

function getChartYLabelsEnhanced(min: number, max: number, chartHeight: number, padding: { top: number; left: number }, suffix: string, tickCount: number): string {
  const labels = [];
  for (let i = 0; i <= tickCount; i++) {
    const value = min + ((max - min) * (tickCount - i)) / tickCount;
    const y = padding.top + (i / tickCount) * chartHeight;
    labels.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${Math.round(value)}${suffix}</text>`);
  }
  return labels.join('');
}

function renderChatRequestsChart(data: DailyChatRequestsData[]): string {
  if (data.length === 0) return '<p>No chat requests data available</p>';

  const width = 800;
  const height = 300;
  const padding = { top: 40, right: 30, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => [d.askModeRequests, d.agentModeRequests, d.editModeRequests, d.inlineModeRequests]);
  const rawMaxValue = Math.max(...allValues, 1);
  const maxValue = getNiceMaxValue(rawMaxValue);

  const totalAsk = data.reduce((sum, d) => sum + d.askModeRequests, 0);
  const totalAgent = data.reduce((sum, d) => sum + d.agentModeRequests, 0);
  const totalEdit = data.reduce((sum, d) => sum + d.editModeRequests, 0);
  const totalInline = data.reduce((sum, d) => sum + d.inlineModeRequests, 0);
  const grandTotal = totalAsk + totalAgent + totalEdit + totalInline;

  const avgAsk = Math.round(totalAsk / data.length);
  const avgAgent = Math.round(totalAgent / data.length);
  const avgEdit = Math.round(totalEdit / data.length);
  const avgInline = Math.round(totalInline / data.length);

  const maxAsk = Math.max(...data.map(d => d.askModeRequests));
  const maxAgent = Math.max(...data.map(d => d.agentModeRequests));
  const maxEdit = Math.max(...data.map(d => d.editModeRequests));
  const maxInline = Math.max(...data.map(d => d.inlineModeRequests));

  const datasets = [
    { values: data.map(d => d.askModeRequests), color: '#22c55e', label: 'Ask Mode Requests' },
    { values: data.map(d => d.agentModeRequests), color: '#a855f7', label: 'Agent Mode Requests' },
    { values: data.map(d => d.editModeRequests), color: '#f59e0b', label: 'Edit Mode Requests' },
    { values: data.map(d => d.inlineModeRequests), color: '#ef4444', label: 'Inline Mode Requests' },
  ];

  const linesAndPoints = datasets.map(dataset => {
    const pointCoords = dataset.values.map((v, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (v / maxValue) * chartHeight;
      return { x, y };
    });
    const points = pointCoords.map(p => `${p.x},${p.y}`).join(' ');
    const circles = pointCoords.map(p => 
      `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${dataset.color}" stroke="white" stroke-width="1" />`
    ).join('');
    return `<polyline points="${points}" fill="none" stroke="${dataset.color}" stroke-width="2" />${circles}`;
  }).join('');

  const xLabels = getChartXLabelsEnhanced(data.map(d => d.date), chartWidth, padding, height);
  const yLabels = getChartYLabelsEnhanced(0, maxValue, chartHeight, padding, '', 5);
  const gridLines = renderChartGridEnhanced(chartWidth, chartHeight, padding, 5);

  const legend = datasets.map(d => `
    <span class="legend-item">
      <span class="legend-color" style="background: ${d.color}"></span>
      ${d.label}
    </span>
  `).join('');

  return `
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-legend">${legend}</div>
      <div class="chart-stats-inline">
        <span>Avg Ask: <strong>${avgAsk}</strong></span>
        <span>Avg Agent: <strong>${avgAgent}</strong></span>
        <span>Avg Edit: <strong>${avgEdit}</strong></span>
        <span>Avg Inline: <strong>${avgInline}</strong></span>
      </div>
    </div>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${gridLines}
      ${linesAndPoints}
      ${xLabels}
      ${yLabels}
      <text x="${padding.left + chartWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500">Date</text>
      <text x="15" y="${padding.top + chartHeight / 2}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500" transform="rotate(-90, 15, ${padding.top + chartHeight / 2})">Number of Requests</text>
    </svg>
    <div class="chart-footer-grid">
      <div><span style="color: #22c55e; font-weight: 500;">Ask Mode:</span> ${totalAsk.toLocaleString()} total (max ${maxAsk}/day)</div>
      <div><span style="color: #a855f7; font-weight: 500;">Agent Mode:</span> ${totalAgent.toLocaleString()} total (max ${maxAgent}/day)</div>
      <div><span style="color: #f59e0b; font-weight: 500;">Edit Mode:</span> ${totalEdit.toLocaleString()} total (max ${maxEdit}/day)</div>
      <div><span style="color: #ef4444; font-weight: 500;">Inline Mode:</span> ${totalInline.toLocaleString()} total (max ${maxInline}/day)</div>
      <div><span style="color: #374151; font-weight: 500;">All Modes:</span> ${grandTotal.toLocaleString()} total requests</div>
    </div>
  </div>
  `;
}

function renderChatRequestsTable(data: DailyChatRequestsData[]): string {
  return `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th class="text-right">Ask Mode</th>
        <th class="text-right">Agent Mode</th>
        <th class="text-right">Edit Mode</th>
        <th class="text-right">Inline Mode</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${data.slice(0, 30).map(day => {
        const total = day.askModeRequests + day.agentModeRequests + day.editModeRequests + day.inlineModeRequests;
        return `
        <tr>
          <td>${day.date}</td>
          <td class="text-right">${day.askModeRequests.toLocaleString()}</td>
          <td class="text-right">${day.agentModeRequests.toLocaleString()}</td>
          <td class="text-right">${day.editModeRequests.toLocaleString()}</td>
          <td class="text-right">${day.inlineModeRequests.toLocaleString()}</td>
          <td class="text-right"><strong>${total.toLocaleString()}</strong></td>
        </tr>
      `}).join('')}
      ${data.length > 30 ? `
        <tr>
          <td colspan="6" class="text-center" style="color: #6b7280; font-style: italic;">
            ... and ${data.length - 30} more days
          </td>
        </tr>
      ` : ''}
    </tbody>
  </table>
  `;
}
