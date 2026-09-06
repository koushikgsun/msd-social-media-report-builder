(function () {
  const model = window.REPORT_MODEL || {};
  const root = document.getElementById('report-root');
  const colors = ReportTheme.chartColors(model.theme);
  const state = { globalFilters: {}, targetFilters: {}, controlValues: {}, ...model.view };
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
    let rows = block.data?.rows || model.data?.rows || [];
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

  function fmt(value,kind){return ReportTheme.format(value,kind,model.settings)}
  function grouped(block){return ReportTheme.groupData(rowsFor(block),(block.data||model.data)?.placeholder?{...block,operation:'sum'}:block)}

  function chartSvg(block){return ReportTheme.chartSvg(grouped(block),block,model.theme)}

  function renderBlock(block) {
    const span = block.span || 12;
    const colors=ReportTheme.chartColors(model.theme,block);
    if (block.type === 'kpi') {
      const value = (block.data||model.data)?.placeholder?0:aggregate(rowsFor(block), block.field, block.operation);
      return `<section class="block" data-id="${esc(block.id)}" style="--span:${span};${esc(ReportTheme.blockStyle(model.theme,block))}"><div class="card kpi"><div class="label">${esc(block.title)}</div><div class="value">${fmt(value, block.format)}</div><div class="note">${esc(block.note)}</div>${block.delta ? `<div class="delta">${esc(block.delta)}</div>` : ''}${sourceHtml(block.source)}</div></section>`;
    }
    if (block.type === 'chart') {
      const legend = ReportTheme.legendData(grouped(block),block).map((item, index) => `<span><i style="background:${colors[index % colors.length]}"></i>${esc(item[0])}</span>`).join('');
      return `<section class="block" data-id="${esc(block.id)}" style="--span:${span};${esc(ReportTheme.blockStyle(model.theme,block))}"><div class="card"><h2>${esc(block.title)}</h2><div class="chart-box" style="min-height:${Number(block.chartHeight) || 290}px;height:${Number(block.chartHeight) || 290}px">${chartSvg(block)}</div><div class="chart-legend">${legend}</div>${sourceHtml(block.source)}</div></section>`;
    }
    if (block.type === 'gallery') {
      const images = (block.images || []).map(image => `<article class="creative"><img src="${asset(image.url)}" alt="${esc(image.title)}"><div class="cap"><span class="pill">${esc(image.tag || 'Creative')}</span><h3>${esc(image.title)}</h3><div class="small">${esc(image.caption)}</div>${sourceHtml(image.source, 'creative-source')}</div></article>`).join('');
      return `<section class="block" data-id="${esc(block.id)}" style="--span:${span};${esc(ReportTheme.blockStyle(model.theme,block))}"><div class="card"><h2>${esc(block.title)}</h2><div class="gallery-grid" style="--image-cols:${Math.min(block.columns || 2, 3)}">${images}</div>${sourceHtml(block.source)}</div></section>`;
    }
    if (block.type === 'text') return `<section class="block" data-id="${esc(block.id)}" style="--span:${span};${esc(ReportTheme.blockStyle(model.theme,block))}"><div class="card tone-${esc(block.tone || 'plain')}"><h2>${esc(block.title)}</h2><div class="rich-content">${block.html || ''}</div>${sourceHtml(block.source)}</div></section>`;
    if (block.type === 'divider') return `<section class="block" data-id="${esc(block.id)}" style="--span:${span};${esc(ReportTheme.blockStyle(model.theme,block))}"><div class="section-divider">${esc(block.title)}</div>${sourceHtml(block.source)}</section>`;
    if (block.type === 'control') {
      const values = [...new Set((model.data?.rows || []).map(row => row[block.field]).filter(value => value != null))];
      const current = state.controlValues[block.id] ?? '';
      let control;
      if (block.controlType === 'button') control = `<button class="report-control button" data-control="${block.id}">${esc(block.buttonLabel || 'Apply')}</button>`;
      else if (block.controlType === 'slider') {
        const index = Math.max(0, values.findIndex(value => String(value) === String(current)));
        control = `<input class="report-control" data-control="${block.id}" type="range" min="0" max="${Math.max(values.length - 1, 0)}" value="${index}"><span data-value="${block.id}">${esc(values[index] ?? '')}</span>`;
      } else control = `<select class="report-control" data-control="${block.id}"><option value="">All</option>${values.map(value => `<option value="${esc(value)}" ${String(value) === String(current) ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>`;
      return `<section class="block" data-id="${esc(block.id)}" style="--span:${span};${esc(ReportTheme.blockStyle(model.theme,block))}"><div class="card control-card"><span class="control-label">${esc(block.title)}</span>${control}${sourceHtml(block.source)}</div></section>`;
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
    const header=model.header||{},layout=model.layout||{},fixed=layout.mode&&layout.mode!=='report';
    const pages=fixed?(model.pages||[{id:'page-1'}]):[{id:null}];
    const headerHtml=(page)=>{const mode=page.headerMode||'custom';if(fixed&&mode==='none')return '';return `<header class="report-header ${fixed&&mode==='banner'?'compact-banner':''}" data-header-mode="${mode}"><div class="header-overlay"></div><div class="header-inner"><div class="report-brand"><span class="brand-mark"><img src="${asset(header.logoImage||model.logoData)}" alt="Report logo"></span><span>${esc(header.brand||'')}</span></div><div class="header-copy"><div class="header-kicker">${esc(header.kicker||'')}</div><h1>${esc(header.title||'')}</h1><p>${esc(header.subtitle||'')}</p></div></div></header>`};
    root.innerHTML=pages.map(page=>`<div class="report-page ${fixed?'fixed-canvas':''}" data-page-id="${esc(page.id||'report')}">${!fixed||layout.showHeader!==false?headerHtml(page):''}<main class="report-main"><div class="report-grid">${(model.blocks||[]).filter(b=>!fixed||!b.pageId||b.pageId===page.id).map(renderBlock).join('')}</div></main>${!fixed?`<footer class="report-footer">${esc(model.footer||'')}</footer>`:''}</div>`).join('');
    ReportTheme.apply(root,model.theme);
    root.style.setProperty('--card-radius',`${model.settings?.radius??16}px`);root.style.setProperty('--card-padding',`${model.settings?.padding??22}px`);
    root.querySelectorAll('.report-header').forEach(el=>ReportTheme.applyHeader(el,header,model.theme,model.logoData));
    root.querySelectorAll('.report-page').forEach(page=>{if(fixed){page.style.width=layout.width+'px';page.style.height=layout.height+'px';page.style.background=(model.pages||[]).find(p=>p.id===page.dataset.pageId)?.background||'var(--report-background)'}page.querySelectorAll('[data-id]').forEach(el=>{const b=model.blocks.find(b=>b.id===el.dataset.id);if(fixed&&b.frame){const f=b.frame;el.style.left=f.x+'px';el.style.top=f.y+'px';el.style.width=f.w+'px';el.style.minHeight=f.h+'px';el.style.height=b.imported?f.h+'px':'auto';if(b.type==='chart'){const chart=el.querySelector('.chart-box');chart.style.height=chart.style.minHeight=Math.max(80,f.h-(b.imported?(b.title?70:42):100))+'px'}}if(b.imported){el.classList.add('imported-object');el.querySelectorAll('.card').forEach(card=>{card.style.background=b.fill||'transparent';card.style.border='0';card.style.padding='0';card.style.boxShadow='none'});const h=el.querySelector('h2');if(h&&(b.type!=='chart'||!b.title))h.hidden=true}});if(!fixed)scheduleMasonry(page.querySelector('.report-grid'))});
    bindControls();
    if(fixed){let style=document.getElementById('page-size');if(!style){style=document.createElement('style');style.id='page-size';document.head.append(style)}style.textContent=`@page{size:${layout.width}px ${layout.height}px;margin:0}`}
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
