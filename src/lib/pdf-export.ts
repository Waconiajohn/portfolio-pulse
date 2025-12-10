import { PortfolioAnalysis, Holding, ClientInfo } from '@/types/portfolio';
import jsPDF from 'jspdf';

export async function generatePDF(
  analysis: PortfolioAnalysis,
  holdings: Holding[],
  clientInfo: ClientInfo,
  notes: string,
  type: 'full' | 'summary' | 'recommendations' = 'full'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246];
  const textColor: [number, number, number] = [30, 41, 59];
  const mutedColor: [number, number, number] = [100, 116, 139];
  const greenColor: [number, number, number] = [34, 197, 94];
  const yellowColor: [number, number, number] = [234, 179, 8];
  const redColor: [number, number, number] = [239, 68, 68];

  const getStatusColor = (status: string): [number, number, number] => {
    if (status === 'GREEN') return greenColor;
    if (status === 'YELLOW') return yellowColor;
    return redColor;
  };

  const addHeader = () => {
    // Header background
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 45, 'F');

    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Portfolio Diagnostic', margin, 20);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Professional Advisory Analysis', margin, 28);

    // Client info
    pdf.setFontSize(10);
    pdf.text(`Client: ${clientInfo.name || 'N/A'}`, pageWidth - margin - 60, 15, { align: 'left' });
    pdf.text(`Date: ${clientInfo.meetingDate}`, pageWidth - margin - 60, 22, { align: 'left' });
    pdf.text(`Risk Profile: ${clientInfo.riskTolerance}`, pageWidth - margin - 60, 29, { align: 'left' });

    yPos = 55;
  };

  const addHealthScore = () => {
    // Health score box
    const scoreColor = analysis.healthScore >= 70 ? greenColor : analysis.healthScore >= 40 ? yellowColor : redColor;
    
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

    pdf.setFontSize(12);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Portfolio Health Score', margin + 10, yPos + 12);

    pdf.setFontSize(32);
    pdf.setTextColor(...scoreColor);
    pdf.text(analysis.healthScore.toString(), margin + 10, yPos + 30);

    pdf.setFontSize(12);
    pdf.setTextColor(...mutedColor);
    pdf.text('/100', margin + 35, yPos + 30);

    // Key metrics
    const metrics = [
      { label: 'Portfolio Value', value: `$${analysis.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
      { label: 'Expected Return', value: `${(analysis.expectedReturn * 100).toFixed(1)}%` },
      { label: 'Volatility', value: `${(analysis.volatility * 100).toFixed(1)}%` },
      { label: 'Sharpe Ratio', value: analysis.sharpeRatio.toFixed(2) },
      { label: 'Annual Fees', value: `$${analysis.totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    ];

    let xOffset = margin + 70;
    metrics.forEach((m, i) => {
      pdf.setFontSize(8);
      pdf.setTextColor(...mutedColor);
      pdf.text(m.label, xOffset, yPos + 12);
      
      pdf.setFontSize(14);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(m.value, xOffset, yPos + 22);
      
      xOffset += 30;
    });

    yPos += 45;
  };

  const addDiagnosticSummary = () => {
    pdf.setFontSize(14);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Diagnostic Summary', margin, yPos);
    yPos += 8;

    const categories = [
      { name: 'Risk Management', key: 'riskManagement' },
      { name: 'Protection & Vulnerability', key: 'protection' },
      { name: 'Return Efficiency', key: 'returnEfficiency' },
      { name: 'Cost & Fee Analysis', key: 'costAnalysis' },
      { name: 'Tax Efficiency', key: 'taxEfficiency' },
      { name: 'Diversification Quality', key: 'diversification' },
      { name: 'Risk-Adjusted Performance', key: 'riskAdjusted' },
      { name: 'Crisis Resilience', key: 'crisisResilience' },
      { name: 'Portfolio Optimization', key: 'optimization' },
      { name: 'Planning Gaps', key: 'planningGaps' },
    ];

    const colWidth = (pageWidth - 2 * margin) / 2;
    
    categories.forEach((cat, i) => {
      const result = analysis.diagnostics[cat.key as keyof typeof analysis.diagnostics];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * colWidth;
      const y = yPos + row * 12;

      // Status indicator
      pdf.setFillColor(...getStatusColor(result.status));
      pdf.circle(x + 3, y + 2, 2, 'F');

      // Category name
      pdf.setFontSize(9);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'normal');
      pdf.text(cat.name, x + 8, y + 4);

      // Score
      pdf.setTextColor(...mutedColor);
      pdf.text(`${result.score}`, x + colWidth - 15, y + 4);
    });

    yPos += Math.ceil(categories.length / 2) * 12 + 10;
  };

  const addRecommendations = () => {
    if (analysis.recommendations.length === 0) return;

    pdf.setFontSize(14);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Priority Recommendations', margin, yPos);
    yPos += 10;

    analysis.recommendations.forEach((rec, i) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin;
      }

      // Priority number
      pdf.setFillColor(...primaryColor);
      pdf.circle(margin + 4, yPos + 3, 4, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text((i + 1).toString(), margin + 2.5, yPos + 5);

      // Title
      pdf.setFontSize(10);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(rec.title, margin + 12, yPos + 5);

      // Description
      pdf.setFontSize(9);
      pdf.setTextColor(...mutedColor);
      pdf.setFont('helvetica', 'normal');
      pdf.text(rec.description, margin + 12, yPos + 12);

      // Impact
      pdf.setTextColor(...greenColor);
      pdf.text(`Impact: ${rec.impact}`, margin + 12, yPos + 19);

      yPos += 26;
    });
  };

  const addHoldings = () => {
    if (holdings.length === 0) return;

    if (yPos > pageHeight - 60) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFontSize(14);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Holdings Summary', margin, yPos);
    yPos += 8;

    // Table header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    
    pdf.setFontSize(8);
    pdf.setTextColor(...mutedColor);
    pdf.setFont('helvetica', 'bold');
    
    const cols = [margin + 2, margin + 22, margin + 65, margin + 95, margin + 125, margin + 155];
    pdf.text('Ticker', cols[0], yPos + 5);
    pdf.text('Name', cols[1], yPos + 5);
    pdf.text('Shares', cols[2], yPos + 5);
    pdf.text('Price', cols[3], yPos + 5);
    pdf.text('Value', cols[4], yPos + 5);
    pdf.text('Gain/Loss', cols[5], yPos + 5);
    
    yPos += 10;

    holdings.slice(0, 15).forEach((h, i) => {
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = margin;
      }

      const value = h.shares * h.currentPrice;
      const cost = h.shares * h.costBasis;
      const gainLoss = value - cost;
      const gainLossPct = cost > 0 ? ((value - cost) / cost * 100).toFixed(1) : '0.0';

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      
      pdf.text(h.ticker, cols[0], yPos + 4);
      pdf.text(h.name.substring(0, 18), cols[1], yPos + 4);
      pdf.text(h.shares.toString(), cols[2], yPos + 4);
      pdf.text(`$${h.currentPrice.toFixed(2)}`, cols[3], yPos + 4);
      pdf.text(`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, cols[4], yPos + 4);
      
      pdf.setTextColor(...(gainLoss >= 0 ? greenColor : redColor));
      pdf.text(`${gainLoss >= 0 ? '+' : ''}${gainLossPct}%`, cols[5], yPos + 4);

      yPos += 7;
    });

    if (holdings.length > 15) {
      pdf.setTextColor(...mutedColor);
      pdf.text(`... and ${holdings.length - 15} more holdings`, margin + 2, yPos + 4);
      yPos += 10;
    }
  };

  const addNotes = () => {
    if (!notes.trim()) return;

    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFontSize(14);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Advisor Notes', margin, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setTextColor(...mutedColor);
    pdf.setFont('helvetica', 'normal');

    const lines = pdf.splitTextToSize(notes, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(line, margin, yPos);
      yPos += 5;
    });
  };

  const addFooter = () => {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(...mutedColor);
      pdf.text(
        `Generated by Portfolio Diagnostic | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  };

  // Build PDF based on type
  addHeader();
  addHealthScore();

  if (type === 'full' || type === 'summary') {
    addDiagnosticSummary();
  }

  if (type === 'full' || type === 'recommendations') {
    addRecommendations();
  }

  if (type === 'full') {
    addHoldings();
    addNotes();
  }

  addFooter();

  // Save
  const filename = `portfolio-diagnostic-${clientInfo.name || 'report'}-${clientInfo.meetingDate}-${type}.pdf`;
  pdf.save(filename);
}
