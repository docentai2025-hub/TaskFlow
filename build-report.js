#!/usr/bin/env node
'use strict';
/**
 * build-report.js
 * Converts internship-report.md into a beautifully styled HTML report
 * that can be viewed in any browser and saved/printed as PDF.
 * Uses only built-in Node.js modules.
 */

const fs = require('node:fs');
const path = require('node:path');

const mdPath = path.join(__dirname, 'internship-report.md');
const outPath = path.join(__dirname, 'internship-report.html');

if (!fs.existsSync(mdPath)) {
  console.error(`Cannot find markdown file at ${mdPath}`);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function parseMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let inCode = false;
  let codeBuffer = [];
  let inList = false;
  let inTable = false;
  let tableRows = [];

  function flushList() {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  }

  function flushTable() {
    if (inTable && tableRows.length > 0) {
      out.push('<table>');
      tableRows.forEach((row, idx) => {
        const tag = idx === 0 ? 'th' : 'td';
        const cells = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        out.push('<tr>' + cells.map(c => `<${tag}>${inlineFormat(escapeHtml(c))}</${tag}>`).join('') + '</tr>');
      });
      out.push('</table>');
      inTable = false;
      tableRows = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) {
        out.push('<pre><code>' + escapeHtml(codeBuffer.join('\n')) + '</code></pre>');
        codeBuffer = [];
        inCode = false;
      } else {
        flushList();
        flushTable();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      if (line.includes('---')) continue; // separator row
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      flushList();
      out.push(`<h1>${inlineFormat(escapeHtml(line.slice(2)))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      out.push(`<h2>${inlineFormat(escapeHtml(line.slice(3)))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      out.push(`<h3>${inlineFormat(escapeHtml(line.slice(4)))}</h3>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      out.push(`<blockquote>${inlineFormat(escapeHtml(line.slice(2)))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineFormat(escapeHtml(line.trim().slice(2)))}</li>`);
      continue;
    } else if (line.trim().match(/^\d+\.\s/)) {
      // Ordered list
      const text = line.trim().replace(/^\d+\.\s+/, '');
      out.push(`<p class="numbered-item">${inlineFormat(escapeHtml(text))}</p>`);
      continue;
    } else {
      flushList();
    }

    // Blank line
    if (!line.trim()) {
      continue;
    }

    // Paragraph
    out.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
  }

  flushList();
  flushTable();
  return out.join('\n');
}

const htmlBody = parseMarkdown(md);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow — Internship Project Report</title>
  <style>
    :root {
      --primary: #2563eb;
      --text: #1e293b;
      --text-muted: #64748b;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --code-bg: #0f172a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.65;
      color: var(--text);
      background-color: var(--bg);
      padding: 2rem 1rem;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--surface);
      padding: 3rem 3.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border);
    }
    h1 {
      font-size: 1.85rem;
      color: #0f172a;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    h2 {
      font-size: 1.35rem;
      color: #1e3a8a;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3rem;
    }
    h3 {
      font-size: 1.1rem;
      color: #334155;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
    }
    p { margin-bottom: 1rem; }
    blockquote {
      background: #eff6ff;
      border-left: 4px solid var(--primary);
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      color: #1e40af;
      border-radius: 0 6px 6px 0;
      font-size: 0.95rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.25rem 0;
      font-size: 0.92rem;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 0.6rem 0.85rem;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #0f172a;
    }
    tr:nth-child(even) td { background-color: #f8fafc; }
    ul { margin: 0 0 1rem 1.5rem; }
    li { margin-bottom: 0.35rem; }
    pre {
      background: var(--code-bg);
      color: #f8fafc;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 0.88rem;
      line-height: 1.45;
    }
    code {
      background: #f1f5f9;
      color: #d97706;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-family: Consolas, Monaco, monospace;
      font-size: 0.88em;
    }
    pre code { background: none; color: inherit; padding: 0; }
    .print-btn {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      background: var(--primary);
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    .print-btn:hover { background: #1d4ed8; }
    @media print {
      body { background: white; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  <div class="container">
    ${htmlBody}
  </div>
</body>
</html>`;

fs.writeFileSync(outPath, fullHtml, 'utf8');
console.log(`Generated report HTML: ${outPath}`);

