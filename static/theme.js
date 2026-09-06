(function () {
  const palette = {primary:'#00857C',secondary:'#0C2340',tertiary:'#6ECEB2',background:'#F7F7F7',surface:'#FFFFFF',text:'#0C2340',muted:'#687986'};
  const fonts = {'Arial':'Arial, sans-serif','Aptos':'Aptos, Calibri, sans-serif','Calibri':'Calibri, Arial, sans-serif','Segoe UI':'"Segoe UI", Arial, sans-serif','Verdana':'Verdana, sans-serif','Trebuchet MS':'"Trebuchet MS", sans-serif','Georgia':'Georgia, serif','Times New Roman':'"Times New Roman", serif','Courier New':'"Courier New", monospace','Tahoma':'Tahoma, sans-serif'};
  const roles = {header:'secondary',heading:'secondary',value:'secondary',accent:'primary',chart1:'primary',chart2:'secondary',chart3:'tertiary'};
  const fontRoles = {heading:'primary',body:'secondary',value:'primary'};
  const defaults = () => ({colors:{...palette},roles:{...roles},fonts:{primary:'Arial',secondary:'Arial'},fontRoles:{...fontRoles},customFonts:[]});
  function normalize(value) {
    const t=defaults(), v=value||{};
    Object.keys(palette).forEach(k=>{if(/^#[0-9a-f]{6}$/i.test(v.colors?.[k]))t.colors[k]=v.colors[k]});
    Object.keys(roles).forEach(k=>{if(Object.hasOwn(palette,v.roles?.[k]))t.roles[k]=v.roles[k]});
    t.customFonts=(Array.isArray(v.customFonts)?v.customFonts:[]).filter(f=>f&&/^Font-[a-z0-9-]+$/i.test(f.name)&&/^data:font\/(woff2?|ttf|otf);base64,[a-z0-9+/=]+$/i.test(f.data)&&f.data.length<1500000).slice(0,8);
    Object.keys(t.fonts).forEach(k=>{if(Object.hasOwn(fonts,v.fonts?.[k])||t.customFonts.some(f=>f.name===v.fonts?.[k]))t.fonts[k]=v.fonts[k]});
    Object.keys(fontRoles).forEach(k=>{if(['primary','secondary'].includes(v.fontRoles?.[k]))t.fontRoles[k]=v.fontRoles[k]});
    return t;
  }
  const color=(theme,role)=>theme.colors[theme.roles[role]]||theme.colors.primary;
  const font=(theme,role)=>fonts[theme.fonts[role]]||`"${theme.fonts[role]}", sans-serif`;
  function apply(root,value) {
    const t=normalize(value);
    root.classList.add('themed-report');
    Object.entries(t.colors).forEach(([k,v])=>root.style.setProperty('--report-'+k,v));
    Object.keys(roles).forEach(k=>root.style.setProperty('--role-'+k,color(t,k)));
    ['primary','secondary'].forEach(k=>root.style.setProperty('--font-'+k,font(t,k)));
    Object.keys(fontRoles).forEach(k=>root.style.setProperty('--font-'+k,font(t,t.fontRoles[k])));
    let style=document.getElementById('report-fonts');
    if(!style){style=document.createElement('style');style.id='report-fonts';document.head.append(style)}
    style.textContent=t.customFonts.map(f=>`@font-face{font-family:"${f.name}";src:url("${f.data}");font-display:swap}`).join('\n');
    return t;
  }
  function blockStyle(theme,block) {
    const t=normalize(theme),s=block.appearance||{},out=[];
    ['accent','heading','value'].forEach(k=>{if(Object.hasOwn(t.colors,s[k]))out.push(`--role-${k}:${t.colors[s[k]]}`)});
    ['heading','body'].forEach(k=>{if(['primary','secondary'].includes(s[k+'Font']))out.push(`--font-${k}:${font(t,s[k+'Font'])}`)});
    return out.join(';');
  }
  function chartColors(theme,block={}) {const t=normalize(theme);return [Object.hasOwn(t.colors,block.appearance?.accent)?t.colors[block.appearance.accent]:color(t,'chart1'),color(t,'chart2'),color(t,'chart3')]}
  function groupData(rows,b){const fields=b.showAllSeries&&b.seriesFields?.length?b.seriesFields:[b.yField],groups=new Map();rows.forEach(r=>{const k=String(r[b.xField]??'Unspecified');if(!groups.has(k))groups.set(k,fields.map(()=>0));const values=groups.get(k);fields.forEach((f,i)=>{const n=Number(String(r[f]??0).replace(/[$,%\s,]/g,''));values[i]+=b.operation==='count'?1:Number.isFinite(n)?n:0})});return [...groups].slice(0,20).map(([k,values])=>[k,values[0],values])}
  function legendData(data,b){return b.showAllSeries&&b.seriesFields?.length>1&&!['pie','doughnut'].includes(b.chartType)?b.seriesFields.map(s=>[s,0]):data}
  function chartSvg(data,block,theme){
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const colors=chartColors(theme,block),w=700,h=Math.max(120,Number(block.chartHeight)||290),pad=42,type=block.chartType||'bar';
    if(!data.length||data.every(d=>(d[2]||[d[1]]).every(v=>v===0)))return '<div class="small">No values to chart yet.</div>';
    const multi=block.showAllSeries&&block.seriesFields?.length>1&&!['pie','doughnut'].includes(type),seriesCount=multi?block.seriesFields.length:1;
    let content='';
    if(type==='pie'||type==='doughnut'){
      if(data.some(d=>d[1]<0))return '<div class="small">Pie charts need non-negative values. Choose a bar or line chart.</div>';
      const total=data.reduce((s,d)=>s+d[1],0),cx=w/2,cy=h/2,r=Math.min(110,h/2-14);let a=-Math.PI/2;
      content=data.map((d,i)=>{if(!d[1])return '';const da=d[1]/total*Math.PI*2,z=a+da;const path=da>=Math.PI*2-.00001?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[i%3]}"/>`:`<path d="M${cx} ${cy} L${cx+r*Math.cos(a)} ${cy+r*Math.sin(a)} A${r} ${r} 0 ${da>Math.PI?1:0} 1 ${cx+r*Math.cos(z)} ${cy+r*Math.sin(z)} Z" fill="${colors[i%3]}"/>`;a=z;return path}).join('');if(type==='doughnut')content+=`<circle cx="${cx}" cy="${cy}" r="${r*.5}" fill="${normalize(theme).colors.surface}"/>`;
    }else{
      const all=data.flatMap(d=>multi?d[2]:[d[1]]),lo=Math.min(0,...all),hi=Math.max(0,...all),range=hi-lo||1;
      if(type==='horizontalBar'){
        const start=140,end=640,zero=start+(0-lo)/range*(end-start),row=(h-40)/data.length;
        content=`<line x1="${zero}" x2="${zero}" y1="15" y2="${h-15}" stroke="#bdc8cc"/>`+data.map((d,i)=>{const y=20+i*row;return `<text x="4" y="${y+row*.5}" font-size="11">${esc(d[0]).slice(0,24)}</text>`+(multi?d[2]:[d[1]]).map((v,j)=>{const x=start+(v-lo)/range*(end-start);return `<rect x="${Math.min(x,zero)}" y="${y+j*row*.8/seriesCount}" width="${Math.abs(x-zero)}" height="${Math.max(1,row*.7/seriesCount)}" rx="2" fill="${colors[(multi?j:i)%3]}"/>`}).join('')}).join('');
      }else{
        const sy=v=>h-pad-(v-lo)/range*(h-pad*2),zero=sy(0),step=(w-pad*2)/data.length,pts=data.map((d,i)=>[pad+(i+.5)*step,sy(d[1])]);
        content=`<line x1="${pad}" x2="${w-pad}" y1="${zero}" y2="${zero}" stroke="#bdc8cc"/>`;
        if(type==='line'||type==='area'){for(let j=0;j<seriesCount;j++){const seriesPts=data.map((d,i)=>[pts[i][0],sy(multi?d[2][j]:d[1])]),path=seriesPts.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');if(type==='area')content+=`<path d="${path} L${pts.at(-1)[0]} ${zero} L${pts[0][0]} ${zero}Z" fill="${colors[multi?j%3:2]}" fill-opacity=".3"/>`;content+=`<path d="${path}" fill="none" stroke="${colors[j%3]}" stroke-width="3"/>`+seriesPts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${colors[j%3]}"/>`).join('')}}else content+=data.map((d,i)=>(multi?d[2]:[d[1]]).map((v,j)=>`<rect x="${pts[i][0]-step*.35+j*step*.7/seriesCount}" y="${Math.min(sy(v),zero)}" width="${step*.65/seriesCount}" height="${Math.abs(sy(v)-zero)}" rx="3" fill="${colors[(multi?j:i)%3]}"/>`).join('')).join('');
        content+=pts.map((p,i)=>`<text x="${p[0]}" y="${h-10}" text-anchor="middle" font-size="10">${esc(data[i][0]).slice(0,15)}</text>`).join('');
      }
    }
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(block.title||'Chart')}">${content}</svg>`;
  }
  function format(value,kind,settings={}) {
    const options={maximumFractionDigits:Number.isInteger(settings.decimals)?settings.decimals:2};
    if(kind==='currency'){options.style='currency';options.currency=settings.currency||'USD'}
    try{return new Intl.NumberFormat(settings.locale||'en-US',options).format(value)+(kind==='percent'?'%':'')}catch{return String(value)}
  }
  function applyHeader(el,h,t,logo) {
    el.style.backgroundColor=h.backgroundMode==='theme'?color(normalize(t),'header'):(h.backgroundColor||'#0C2340');
    el.style.backgroundImage=h.backgroundImage?`url("${String(h.backgroundImage).replace(/["\\\n\r]/g,'')}")`:'none';
    el.style.backgroundSize=['cover','contain'].includes(h.imageFit)?h.imageFit:'cover';
    el.style.backgroundRepeat='no-repeat';el.style.backgroundPosition=h.imagePosition||'center';
    el.style.minHeight=`${Math.max(180,Math.min(700,Number(h.height)||260))}px`;
    el.style.textAlign=h.align||'left';
    el.classList.toggle('hide-decoration',h.showDecoration===false);
    el.style.setProperty('--overlay',h.overlay??.18);
    el.style.setProperty('--header-text',/^#[0-9a-f]{6}$/i.test(h.textColor)?h.textColor:'#FFFFFF');
    el.style.setProperty('--header-title-size',`${Math.max(20,Math.min(90,Number(h.titleSize)||46))}px`);
    el.style.setProperty('--header-overlay-color',/^#[0-9a-f]{6}$/i.test(h.overlayColor)?h.overlayColor:'#0C2340');
    ['title','body'].forEach(k=>{if(['primary','secondary'].includes(h[k+'Font']))el.style.setProperty('--header-'+k+'-font',font(normalize(t),h[k+'Font']));else el.style.removeProperty('--header-'+k+'-font')});
    const brand=el.querySelector('.report-brand');if(brand)brand.style.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[h.align]||'flex-start';
    const mark=el.querySelector('.brand-mark');if(mark){mark.style.display=h.showLogo===false?'none':'grid';mark.style.width=mark.style.height=`${Math.max(24,Math.min(160,Number(h.logoSize)||40))}px`;mark.style.borderRadius=h.logoShape==='square'?'0':'50%';const img=mark.querySelector('img');if(img)img.src=h.logoImage||logo||''}
  }
  window.ReportTheme={defaults,normalize,apply,applyHeader,blockStyle,chartColors,groupData,legendData,chartSvg,format,fonts,palette,roles,fontRoles};
})();
