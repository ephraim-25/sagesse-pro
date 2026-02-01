import { jsPDF } from 'jspdf';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

const CSN_COLORS = [
  '#003366', // CSN Blue
  '#0066CC', // Lighter blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#795548', // Brown
];

// Create an offscreen canvas and draw a pie chart
export const drawPieChart = (
  data: ChartData[],
  width: number = 200,
  height: number = 200
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 10;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    // Draw empty state
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#E0E0E0';
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Aucune donnée', centerX, centerY);
    return canvas;
  }
  
  let startAngle = -Math.PI / 2; // Start from top
  
  data.forEach((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = item.color || CSN_COLORS[index % CSN_COLORS.length];
    ctx.fill();
    
    // Add white border between slices
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add percentage label if slice is big enough
    if (item.value / total > 0.05) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = radius * 0.7;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;
      
      const percentage = Math.round((item.value / total) * 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percentage}%`, labelX, labelY);
    }
    
    startAngle = endAngle;
  });
  
  return canvas;
};

// Draw a bar chart
export const drawBarChart = (
  data: ChartData[],
  width: number = 400,
  height: number = 200,
  title?: string
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  const padding = { top: title ? 30 : 15, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, width, height);
  
  // Title
  if (title) {
    ctx.fillStyle = '#003366';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 18);
  }
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(50, (chartWidth / data.length) * 0.7);
  const gap = (chartWidth - barWidth * data.length) / (data.length + 1);
  
  // Draw axes
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
  
  // Draw grid lines and Y-axis labels
  ctx.fillStyle = '#666';
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';
  
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    const value = Math.round(maxValue * (1 - i / gridLines));
    
    ctx.fillText(value.toString(), padding.left - 5, y + 3);
    
    if (i > 0 && i < gridLines) {
      ctx.strokeStyle = '#E0E0E0';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }
  
  // Draw bars
  data.forEach((item, index) => {
    const x = padding.left + gap + (barWidth + gap) * index;
    const barHeight = (item.value / maxValue) * chartHeight;
    const y = height - padding.bottom - barHeight;
    
    // Bar gradient effect
    const gradient = ctx.createLinearGradient(x, y, x, height - padding.bottom);
    const baseColor = item.color || CSN_COLORS[index % CSN_COLORS.length];
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustColor(baseColor, -30));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Bar border
    ctx.strokeStyle = adjustColor(baseColor, -50);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    // Value on top of bar
    if (item.value > 0) {
      ctx.fillStyle = '#003366';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
    }
    
    // X-axis label (truncate if too long)
    ctx.fillStyle = '#333';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    const label = item.label.length > 12 ? item.label.substring(0, 10) + '...' : item.label;
    ctx.fillText(label, x + barWidth / 2, height - padding.bottom + 15);
  });
  
  return canvas;
};

// Draw a horizontal bar chart (good for rankings)
export const drawHorizontalBarChart = (
  data: ChartData[],
  width: number = 400,
  height: number = 200,
  title?: string
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  const padding = { top: title ? 30 : 15, right: 60, bottom: 20, left: 100 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Background
  ctx.fillStyle = '#FAFAFA';
  ctx.fillRect(0, 0, width, height);
  
  // Title
  if (title) {
    ctx.fillStyle = '#003366';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 18);
  }
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barHeight = Math.min(25, (chartHeight / data.length) * 0.7);
  const gap = (chartHeight - barHeight * data.length) / (data.length + 1);
  
  // Draw bars
  data.forEach((item, index) => {
    const y = padding.top + gap + (barHeight + gap) * index;
    const barWidth = (item.value / maxValue) * chartWidth;
    
    // Bar gradient
    const gradient = ctx.createLinearGradient(padding.left, y, padding.left + barWidth, y);
    const baseColor = item.color || CSN_COLORS[index % CSN_COLORS.length];
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, adjustColor(baseColor, 30));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(padding.left, y, barWidth, barHeight);
    
    // Label on left
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    const label = item.label.length > 15 ? item.label.substring(0, 13) + '...' : item.label;
    ctx.fillText(label, padding.left - 5, y + barHeight / 2 + 3);
    
    // Value on right
    ctx.fillStyle = '#003366';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(item.value.toString(), padding.left + barWidth + 5, y + barHeight / 2 + 3);
  });
  
  return canvas;
};

// Draw a legend for charts
export const drawLegend = (
  data: ChartData[],
  width: number = 200,
  itemHeight: number = 20
): HTMLCanvasElement => {
  const height = data.length * itemHeight + 10;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  data.forEach((item, index) => {
    const y = 5 + index * itemHeight;
    
    // Color box
    ctx.fillStyle = item.color || CSN_COLORS[index % CSN_COLORS.length];
    ctx.fillRect(5, y + 2, 12, 12);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(5, y + 2, 12, 12);
    
    // Label
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    const label = item.label.length > 25 ? item.label.substring(0, 23) + '...' : item.label;
    ctx.fillText(`${label} (${item.value})`, 22, y + 12);
  });
  
  return canvas;
};

// Add a canvas chart to PDF
export const addChartToPdf = (
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  pdfWidth?: number,
  pdfHeight?: number
): void => {
  const imgData = canvas.toDataURL('image/png');
  const ratio = canvas.height / canvas.width;
  
  const finalWidth = pdfWidth || 80;
  const finalHeight = pdfHeight || finalWidth * ratio;
  
  doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
};

// Helper function to adjust color brightness
const adjustColor = (hex: string, amount: number): string => {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  }
  
  const r = clamp(parseInt(color.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(color.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(color.substring(4, 6), 16) + amount);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Utility to create chart data from object
export const objectToChartData = (
  obj: Record<string, number>,
  colorMap?: Record<string, string>
): ChartData[] => {
  return Object.entries(obj).map(([label, value]) => ({
    label,
    value,
    color: colorMap?.[label],
  }));
};
