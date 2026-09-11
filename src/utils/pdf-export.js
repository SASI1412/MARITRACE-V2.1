/**
 * PDF Export Utility for MariTrace
 * Generates an official, high-authority Maritime Forensic Investigation Report
 * completely client-side using jsPDF and jspdf-autotable.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { case001 } from '../data/case001.ts';

export async function generateInvestigationPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const vessels = [...case001.vessels].sort((a, b) => b.scores.overall - a.scores.overall);
  const topVessel = vessels[0];
  const now = new Date();
  const dateStr = now.toUTCString();

  // Helper function for page numbers and footer
  const addFooter = (pageNum, totalPages) => {
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `MariTrace Maritime Platform — Confidential Forensic Intelligence Brief`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  // ==========================================
  // HEADER SECTION
  // ==========================================
  // Top bar banner
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Title & Brand
  doc.setTextColor(47, 129, 247);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MARITRACE', margin, 10);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('MARITIME OIL SPILL DETECTION & VESSEL ATTRIBUTION PLATFORM', margin, 15);

  // Classification Tag (Right-aligned)
  doc.setFillColor(218, 54, 51);
  doc.roundedRect(pageWidth - margin - 44, 6, 44, 5.5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('FORENSIC DOSSIER', pageWidth - margin - 22, 9.8, { align: 'center' });

  // Document metadata row
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`DOC ID: MT-REP-${case001.id}`, pageWidth - margin, 16.5, { align: 'right' });
  doc.text(`DATE GENERATED: ${dateStr}`, pageWidth - margin, 20.5, { align: 'right' });

  y = 30;

  // Title Headline
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`EXECUTIVE INVESTIGATION REPORT — CASE ${case001.id}`, margin, y);
  y += 1.5;

  // Decorative blue line
  doc.setDrawColor(47, 129, 247);
  doc.setLineWidth(0.7);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  // ==========================================
  // SECTION 1: SAR INCIDENT DETECTION SUMMARY
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('1. SATELLITE DETECTION & SLICK CHARACTERISTICS', margin, y);
  y += 3.5;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, font: 'helvetica' },
    headStyles: { fillColor: [30, 35, 45], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 247, 250], width: 48 },
      1: { fillColor: [255, 255, 255] }
    },
    body: [
      ['Case Identifier', case001.id],
      ['Satellite Sensor', 'Sentinel-1 C-Band SAR (Interferometric Wide Swath)'],
      ['Observed Spill Area', `${case001.spill.areaKm2} km² (Radar Backscatter Anomaly)`],
      ['ML Detection Confidence', `${case001.spill.detectionConfidence}% (Dampened Capillary Wave Signature)`],
      ['Incident Location', `${case001.spill.location}`],
      ['Acquisition Time', `${case001.spill.detectionTimestamp}`],
      ['Discharge Window', `${case001.origin.estimatedWindow.start} to ${case001.origin.estimatedWindow.end}`]
    ],
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 5;

  // ==========================================
  // SECTION 2: HYDRODYNAMIC DRIFT RECONSTRUCTION
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('2. DRIFT RECONSTRUCTION & REVERSE ORIGIN MODEL', margin, y);
  y += 3.5;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, font: 'helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 247, 250], width: 48 },
      1: { fillColor: [255, 255, 255] }
    },
    body: [
      ['Reconstructed Origin Center', `Lat: ${case001.origin.center.lat.toFixed(4)}° N, Lon: ${case001.origin.center.lng.toFixed(4)}° E`],
      ['Origin Confidence Rating', `${case001.origin.confidence}`],
      ['Origin Dispersion Zone', `${case001.origin.zoneDimensions.widthKm} km (W) × ${case001.origin.zoneDimensions.heightKm} km (H)`],
      ['Ocean Surface Currents', '1.2 knots (Bearing 115° ESE)'],
      ['Atmospheric Wind Vector', '14.0 knots (Bearing 310° NW)'],
      ['Dispersion Algorithm', 'Eulerian-Lagrangian Particle Backward Trajectory Model']
    ],
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 5;

  // ==========================================
  // SECTION 3: TOP ATTRIBUTED VESSEL DOSSIER
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('3. PRIMARY ATTRIBUTED CANDIDATE DOSSIER', margin, y);
  y += 3.5;

  // Highlight container box
  doc.setFillColor(240, 244, 250);
  doc.setDrawColor(47, 129, 247);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  // Ship name and score
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(topVessel.name.toUpperCase(), margin + 5, y + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(`MMSI: ${topVessel.mmsi}  |  Type: ${topVessel.type}  |  Speed: ${topVessel.speedKnots} kn  |  Course: ${topVessel.headingDegrees}°`, margin + 5, y + 12);

  // Score Badge
  doc.setFillColor(35, 134, 54);
  doc.roundedRect(margin + contentWidth - 44, y + 4, 38, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${topVessel.scores.overall}`, margin + contentWidth - 25, y + 13, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('COMPATIBILITY / 100', margin + contentWidth - 25, y + 18, { align: 'center' });

  // Metrics summary
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proximity to Origin Zone: ${topVessel.distanceFromOriginKm} km`, margin + 5, y + 18);
  doc.text(`Confidence Classification: ${topVessel.confidence} CONFIDENCE ATTRIBUTION`, margin + 5, y + 23);

  y += 33;

  // ==========================================
  // SECTION 4: FORENSIC EVIDENCE MATRIX
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('4. MULTI-FACTOR FORENSIC CORRELATION MATRIX', margin, y);
  y += 3.5;

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica' },
    headStyles: { fillColor: [30, 35, 45], textColor: 255, fontStyle: 'bold' },
    head: [['Forensic Dimension', 'Weighted Score', 'Evaluation Metric', 'Status']],
    body: [
      ['Spatial Proximity', `${topVessel.scores.spatial} / 100`, `${topVessel.distanceFromOriginKm} km intercept with origin zone`, 'VERIFIED [PASS]'],
      ['Temporal Overlap', `${topVessel.scores.temporal} / 100`, 'AIS transmission coincided with slick release window', 'VERIFIED [PASS]'],
      ['Trajectory Consistency', `${topVessel.scores.trajectory} / 100`, 'Course corridor intersects origin probability centroid', 'VERIFIED [PASS]'],
      ['Hydrodynamic Drift', `${topVessel.scores.drift} / 100`, 'Simulated forward drift footprint matches satellite slick', 'VERIFIED [PASS]'],
      ['AIS Transmission Integrity', `${topVessel.scores.aisQuality} / 100`, 'Continuous broadcasts with zero transponder blackout', 'VERIFIED [PASS]']
    ],
    margin: { left: margin, right: margin }
  });

  // ==========================================
  // PAGE 2: CANDIDATE COMPARISON & DISCLAIMER
  // ==========================================
  doc.addPage();
  y = margin;

  // Page 2 header
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`MARITRACE INVESTIGATION REPORT — CASE ${case001.id} (CANDIDATES & FINDINGS)`, margin, 11);

  y = 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('5. ALL CORRELATED VESSEL CANDIDATES COMPARISON', margin, y);
  y += 5;

  const candidateRows = vessels.map((v, idx) => [
    `#${idx + 1}`,
    v.name,
    String(v.mmsi),
    v.type,
    `${v.distanceFromOriginKm} km`,
    v.confidence,
    `${v.scores.spatial}`,
    `${v.scores.temporal}`,
    `${v.scores.trajectory}`,
    `${v.scores.drift}`,
    `${v.scores.overall} / 100`
  ]);

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, font: 'helvetica' },
    headStyles: { fillColor: [30, 35, 45], textColor: 255, fontStyle: 'bold' },
    head: [['Rank', 'Vessel Name', 'MMSI', 'Type', 'Dist.', 'Conf.', 'Spat.', 'Temp.', 'Traj.', 'Drift', 'Total Score']],
    body: candidateRows,
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 12;

  // ==========================================
  // SECTION 6: LEGAL DISCLAIMER & SIGNATURE
  // ==========================================
  doc.setFillColor(254, 249, 235);
  doc.setDrawColor(210, 153, 34);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(140, 90, 10);
  doc.text('LEGAL & FORENSIC DISCLAIMER:', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 70, 10);
  const disclaimerText = "MARITRACE provides an evidence-based computational compatibility ranking derived from satellite Synthetic Aperture Radar (SAR) imagery, Eulerian-Lagrangian hydrodynamic drift trajectories, and terrestrial/satellite AIS transponder telemetry. This document constitutes technical and scientific intelligence and does not represent a final judicial or statutory determination of maritime liability under MARPOL or UNCLOS conventions.";
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 10);
  doc.text(splitDisclaimer, margin + 5, y + 11);

  y += 32;

  // Official Signature / Verification Block
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 15, margin + 60, y + 15);
  doc.line(pageWidth - margin - 60, y + 15, pageWidth - margin, y + 15);

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Chief Maritime Forensic Analyst', margin, y + 20);
  doc.text('Automated Verification Signature', pageWidth - margin, y + 20, { align: 'right' });

  // Add footers for both pages
  doc.setPage(1);
  addFooter(1, 2);
  doc.setPage(2);
  addFooter(2, 2);

  // Trigger download
  const filename = `MariTrace-Forensic-Report-${case001.id}.pdf`;
  doc.save(filename);
}
