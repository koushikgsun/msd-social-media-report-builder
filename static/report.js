(function () {
  const model = window.REPORT_MODEL || {};
  const root = document.getElementById('report-root');
  const colors = ['#00857C', '#0C2340', '#6ECEB2', '#688CE8', '#BFED33', '#5450E4', '#F5A623', '#D44C7D'];
  const state = { globalFilters: {}, targetFilters: {}, controlValues: {} };
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
  const asset = url => url && url.startsWith('data:') ? url : url || '';
  const num = value => {
    const parsed = Number(String(value ?? '').replace(/[$,%\s,]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  function sourceHtml(value, className = 'item-source') {
    if (!value) return '';
    const isUrl = /^https?:\/\//i.test(value);
    return `<div class="${className}"><b>Source:</b> ${isUrl ? `<a href="${esc(value)}" target="_blank" rel="noopener">${esc(value)}</a>` : esc(value)}</div>`;
  }

  function targetIds(block) {
    if (Array.isArray(block.targetIds) && block.targetIds.length) return block.targetIds;
    return block.targetId ? [block.targetId] : ['all'];
  }

  function rowsFor(block) {
    let rows = model.data?.rows || [];
    const filters = { ...state.globalFilters, ...(state.targetFilters[block.id] || {}) };
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== '' && value != null) rows = rows.filter(row => String(row[field]) === String(value));
    });
    return rows;
  }

  function aggregate(rows, field, operation = 'sum') {
    const values = rows.map(row => num(row[field]));
    if (operation === 'count') return rows.length;
    if (!values.length) return 0;
    if (operation === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
    if (operation === 'max') return Math.max(...values);
    if (operation === 'min') return Math.min(...values);
    return values.reduce((a, b) => a + b, 0);
  }

  function fmt(value, kind = 'number') {
    if (kind === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    if (kind === 'percent') return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) + '%';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }

  function grouped(block) {
    const groups = new Map();
    rowsFor(block).forEach(row => {
      const key = String(row[block.xField] ?? 'Unspecified');
      const value = block.operation === 'count' ? 1 : num(row[block.yField]);
      groups.set(key, (groups.get(key) || 0) + value);
    });
    return [...groups].slice(0, 20);
  }

  function chartSvg(block) {
    const data = grouped(block);
    if (!data.length) return '<div class="small">No rows match this view.</div>';
    const type = block.chartType || 'bar', width = 700, height = Math.max(220, Number(block.chartHeight) || 300), pad = 42;
    const max = Math.max(...data.map(item => Math.abs(item[1])), 1);
    if (type === 'pie' || type === 'doughnut') {
      const total = data.reduce((sum, item) => sum + Math.abs(item[1]), 0) || 1;
      let angle = -Math.PI / 2;
      const cx = 350, cy = height / 2, radius = Math.min(110, height / 2 - 18);
      const parts = data.map((item, index) => {
        const delta = Math.abs(item[1]) / total * Math.PI * 2, end = angle + delta;
        const x1 = cx + radius * Math.cos(angle), y1 = cy + radius * Math.sin(angle);
        const x2 = cx + radius * Math.cos(end), y2 = cy + radius * Math.sin(end);
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${delta > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
        angle = end;
        return `<path d="${path}" fill="${colors[index % colors.length]}"/>`;
      }).join('');
      return `<svg viewBox="0 0 ${width} ${height}" role="img">${parts}${type === 'doughnut' ? `<circle cx="${cx}" cy="${cy}" r="58" fill="white"/>` : ''}</svg>`;
    }
    if (type === 'horizontalBar') {
      const barHeight = Math.max(12, (height - pad * 2) / data.length - 8);
      return `<svg viewBox="0 0 ${width} ${height}" role="img">${data.map((item, index) => {
        const y = pad + index * ((height - pad * 2) / data.length), barWidth = (width - 210) * Math.abs(item[1]) / max;
        return `<text x="5" y="${y + barHeight * .75}" font-size="12" fill="#506273">${esc(item[0]).slice(0, 20)}</text><rect x="150" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${colors[index % colors.length]}"/><text x="${155 + barWidth}" y="${y + barHeight * .75}" font-size="11" fill="#506273">${fmt(item[1])}</text>`;
      }).join('')}</svg>`;
    }
    const step = (width - pad * 2) / data.length;
    const points = data.map((item, index) => [pad + step * index + step / 2, height - pad - (Math.abs(item[1]) / max) * (height - pad * 2)]);
    const axes = `<line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#cbd5dc"/>`;
    if (type === 'line' || type === 'area') {
      const path = points.map((point, index) => (index ? 'L' : 'M') + point.join(' ')).join(' ');
      return `<svg viewBox="0 0 ${width} ${height}" role="img">${axes}${type === 'area' ? `<path d="${path} L ${points.at(-1)[0]} ${height - pad} L ${points[0][0]} ${height - pad} Z" fill="#6ECEB255"/>` : ''}<path d="${path}" fill="none" stroke="#00857C" stroke-width="4"/>${points.map((point, index) => `<circle cx="${point[0]}" cy="${point[1]}" r="5" fill="#00857C"/><text x="${point[0]}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#506273">${esc(data[index][0]).slice(0, 12)}</text>`).join('')}</svg>`;
    }
    return `<svg viewBox="0 0 ${width} ${height}" role="img">${axes}${data.map((item, index) => {
      const barWidth = step * .62, barHeight = (Math.abs(item[1]) / max) * (height - pad * 2), x = pad + index * step + step * .19, y = height - pad - barHeight;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="5" fill="${colors[index % colors.length]}"/><text x="${x + barWidth / 2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#506273">${esc(item[0]).slice(0, 12)}</text>`;
    }).join('')}</svg>`;
  }

  function renderBlock(block) {
    const span = block.span || 12;
    if (block.type === 'kpi') {
      const value = aggregate(rowsFor(block), block.field, block.operation);
      return `<section class="block" style="--span:${span}"><div class="card kpi"><div class="label">${esc(block.title)}</div><div class="value">${fmt(value, block.format)}</div><div class="note">${esc(block.note)}</div>${block.delta ? `<div class="delta">${esc(block.delta)}</div>` : ''}${sourceHtml(block.source)}</div></section>`;
    }
    if (block.type === 'chart') {
      const legend = grouped(block).map((item, index) => `<span><i style="background:${colors[index % colors.length]}"></i>${esc(item[0])}</span>`).join('');
      return `<section class="block" style="--span:${span}"><div class="card"><h2>${esc(block.title)}</h2><div class="chart-box" style="min-height:${Number(block.chartHeight) || 290}px;height:${Number(block.chartHeight) || 290}px">${chartSvg(block)}</div><div class="chart-legend">${legend}</div>${sourceHtml(block.source)}</div></section>`;
    }
    if (block.type === 'gallery') {
      const images = (block.images || []).map(image => `<article class="creative"><img src="${asset(image.url)}" alt="${esc(image.title)}"><div class="cap"><span class="pill">${esc(image.tag || 'Creative')}</span><h3>${esc(image.title)}</h3><div class="small">${esc(image.caption)}</div>${sourceHtml(image.source, 'creative-source')}</div></article>`).join('');
      return `<section class="block" style="--span:${span}"><div class="card"><h2>${esc(block.title)}</h2><div class="gallery-grid" style="--image-cols:${Math.min(block.columns || 2, 3)}">${images}</div>${sourceHtml(block.source)}</div></section>`;
    }
    if (block.type === 'text') return `<section class="block" style="--span:${span}"><div class="card tone-${esc(block.tone || 'plain')}"><h2>${esc(block.title)}</h2><div class="rich-content">${block.html || ''}</div>${sourceHtml(block.source)}</div></section>`;
    if (block.type === 'divider') return `<section class="block" style="--span:${span}"><div class="section-divider">${esc(block.title)}</div>${sourceHtml(block.source)}</section>`;
    if (block.type === 'control') {
      const values = [...new Set((model.data?.rows || []).map(row => row[block.field]).filter(value => value != null))];
      const current = state.controlValues[block.id] ?? '';
      let control;
      if (block.controlType === 'button') control = `<button class="report-control button" data-control="${block.id}">${esc(block.buttonLabel || 'Apply')}</button>`;
      else if (block.controlType === 'slider') {
        const index = Math.max(0, values.findIndex(value => String(value) === String(current)));
        control = `<input class="report-control" data-control="${block.id}" type="range" min="0" max="${Math.max(values.length - 1, 0)}" value="${index}"><span data-value="${block.id}">${esc(values[index] ?? '')}</span>`;
      } else control = `<select class="report-control" data-control="${block.id}"><option value="">All</option>${values.map(value => `<option value="${esc(value)}" ${String(value) === String(current) ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>`;
      return `<section class="block" style="--span:${span}"><div class="card control-card"><span class="control-label">${esc(block.title)}</span>${control}${sourceHtml(block.source)}</div></section>`;
    }
    return '';
  }

  function layoutMasonry(grid) {
    if (!grid) return;
    const blocks = [...grid.children].filter(item => item.classList.contains('block'));
    grid.classList.remove('masonry-ready');
    blocks.forEach(block => block.style.gridRowEnd = 'auto');
    const heights = blocks.map(block => block.offsetHeight);
    grid.classList.add('masonry-ready');
    blocks.forEach((block, index) => block.style.gridRowEnd = `span ${Math.max(1, Math.ceil((heights[index] + 16) / 20))}`);
  }

  function scheduleMasonry(grid) {
    requestAnimationFrame(() => {
      layoutMasonry(grid);
      grid?.querySelectorAll('img').forEach(image => {
        if (!image.complete) image.addEventListener('load', () => layoutMasonry(grid), { once: true });
      });
    });
  }

  function render() {
    const header = model.header || {};
    const background = header.backgroundImage ? `background-image:url('${asset(header.backgroundImage)}')` : '';
    root.innerHTML = `<header class="report-header" style="background-color:${esc(header.backgroundColor || '#0C2340')};${background};--overlay:${header.overlay ?? .2}"><div class="header-overlay"></div><div class="header-inner"><div class="report-brand"><span class="brand-mark"><img src="${asset(model.logoData)}" alt="MSD mark"></span><span>${esc(header.brand || 'MSD GCC')}</span></div><div class="header-copy"><div class="header-kicker">${esc(header.kicker || 'CAMPAIGN PERFORMANCE REPORT')}</div><h1>${esc(header.title)}</h1><p>${esc(header.subtitle)}</p></div></div></header><main class="report-main"><div class="report-grid">${(model.blocks || []).map(renderBlock).join('')}</div></main><footer class="report-footer">${esc(model.footer || '')}</footer>`;
    bindControls();
    scheduleMasonry(root.querySelector('.report-grid'));
  }

  function bindControls() {
    (model.blocks || []).filter(block => block.type === 'control').forEach(block => {
      const element = document.querySelector(`[data-control="${block.id}"]`);
      if (!element) return;
      const values = [...new Set((model.data?.rows || []).map(row => row[block.field]).filter(value => value != null))];
      const apply = () => {
        let value = element.value;
        if (block.controlType === 'slider') value = values[Number(element.value)] ?? '';
        if (block.controlType === 'button') value = block.buttonValue ?? values[0] ?? '';
        state.controlValues[block.id] = value;
        const targets = targetIds(block);
        if (targets.includes('all')) state.globalFilters[block.field] = value;
        else targets.forEach(id => {
          state.targetFilters[id] ??= {};
          state.targetFilters[id][block.field] = value;
        });
        render();
      };
      element.addEventListener(block.controlType === 'button' ? 'click' : block.controlType === 'slider' ? 'input' : 'change', apply);
    });
  }

  window.addEventListener('resize', () => scheduleMasonry(root.querySelector('.report-grid')));
  render();
})();
