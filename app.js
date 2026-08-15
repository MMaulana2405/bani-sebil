
// CONFIG - Token disimpan aman di Vercel server, tidak di sini!
var ADMIN_PASSWORD_HASH = null; // Set saat login admin

// PASSWORD
function _chk(v){ return v==='tegal danas'||v==='admin bani sebil tegal danas'; }
function _isAdm(v){ return v==='admin bani sebil tegal danas'; }
var isAdmin=false;

function getPending(){ try{return JSON.parse(localStorage.getItem('ikbas_pending')||'[]');}catch(e){return[];} }

// Global list of current pending items (loaded from GitHub or localStorage)
var currentPendingList = [];
function savePending(arr){ localStorage.setItem('ikbas_pending',JSON.stringify(arr)); }

function checkPassword(){
  var inp=document.getElementById('pwInput');
  var err=document.getElementById('pwError');
  if(!inp)return;
  var val=inp.value.trim().toLowerCase();
  if(!val){inp.focus();return;}
  if(_chk(val)){
    isAdmin=_isAdm(val);
    sessionStorage.setItem('ikbas_auth',isAdmin?'admin':'user');
    enterApp();
  } else {
    if(err)err.classList.add('show');
    inp.classList.add('error');
    inp.value='';inp.focus();
    setTimeout(function(){inp.classList.remove('error');if(err)err.classList.remove('show');},1500);
  }
}
function togglePw(){
  var inp=document.getElementById('pwInput');
  var btn=document.getElementById('togglePwBtn');
  if(!inp||!btn)return;
  if(inp.type==='password'){inp.type='text';btn.textContent='X';}
  else{inp.type='password';btn.textContent='O';}
}
function enterApp(){
  var landing=document.getElementById('landing');
  var app=document.getElementById('app');
  // Store password for API calls (only in session memory)
  var val=document.getElementById('pwInput').value.trim().toLowerCase();
  if(_isAdm(val)) sessionStorage.setItem('ikbas_admin_pw', val);
  landing.style.opacity='0';landing.style.transition='opacity .4s';
  setTimeout(function(){landing.style.display='none';app.classList.add('visible');if(isAdmin)initAdminMode();},400);
}
function logout(){if(!confirm('Keluar?'))return;sessionStorage.removeItem('ikbas_auth');location.reload();}
(function(){
  var s=sessionStorage.getItem('ikbas_auth');
  if(s==='admin'){isAdmin=true;document.getElementById('landing').style.display='none';document.getElementById('app').classList.add('visible');}
  else if(s==='user'){isAdmin=false;document.getElementById('landing').style.display='none';document.getElementById('app').classList.add('visible');}
})();

function toggleLegend(){
  var c=document.getElementById('legContent');
  var t=document.getElementById('legToggle');
  if(!c||!t)return;
  if(c.style.display==='none'){c.style.display='block';t.textContent='\u25B2';}
  else{c.style.display='none';t.textContent='\u25BC';}
}

function initAdminMode(){
  var hst=document.querySelector('.hst');
  if(hst){var badge=document.createElement('div');badge.style.cssText='background:#f5c518;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:800;color:#0d2b18;display:flex;align-items:center;gap:4px';badge.innerHTML='ADMIN';hst.insertBefore(badge,hst.firstChild);}
  var tb=document.querySelector('.tb');
  if(tb){var adminBtn=document.createElement('button');adminBtn.className='btn';adminBtn.style.cssText='border-color:rgba(245,197,24,0.6);color:#7a6000;background:#fffbe6;font-weight:700';adminBtn.innerHTML='Panel Admin';adminBtn.onclick=openAdminPanel;tb.appendChild(adminBtn);}
  var pending=getPending();
  if(pending.length>0){setTimeout(function(){showToast('Ada '+pending.length+' permintaan menunggu!');},1500);}
}

function openAdminPanel(){
  var panelEl=document.getElementById('adminModal');
  var contentEl=document.getElementById('adminContent');
  if(!panelEl||!contentEl)return;
  panelEl.classList.add('show');
  contentEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--txt2)">Memuat permintaan...</div>';

  fetch('/api/submissions',{
    headers:{'x-admin-password':sessionStorage.getItem('ikbas_admin_pw')||''}
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){renderAdminPanel(d.data);}
    else{contentEl.innerHTML='<div style="color:#ef4444;padding:16px;font-weight:600">Error: '+(d.error||'Gagal load data')+'</div>';}
  })
  .catch(function(){
    // Fallback to localStorage if API not available
    renderAdminPanel(getPending());
  });
}

function renderAdminPanel(pending){
  currentPendingList = pending.slice(); // save globally
  var contentEl=document.getElementById('adminContent');if(!contentEl)return;
  if(!pending.length){
    contentEl.innerHTML='<div style="text-align:center;padding:24px;color:var(--txt2)"><div style="font-size:40px;margin-bottom:12px">OK</div><div style="font-weight:700">Tidak ada permintaan pending</div></div>';
    return;
  }
  contentEl.innerHTML=pending.map(function(item,i){
    return '<div style="background:var(--green-light);border:1.5px solid var(--green-mid);border-radius:12px;padding:14px;margin-bottom:10px">'
      +'<div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:6px">'+(item.nama||'')+'</div>'
      +(item.pasangan?'<div style="font-size:12px;color:var(--txt2);margin-bottom:2px">Pasangan: <b>'+item.pasangan+'</b></div>':'')
      +(item.namaOrangTua?'<div style="font-size:12px;color:var(--txt2);margin-bottom:2px">Orang Tua: <b>'+item.namaOrangTua+'</b></div>':'')
      +(item.tipe?'<div style="font-size:11px;color:var(--txt3);margin-bottom:8px">Tipe: '+item.tipe+'</div>':'')
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="approveItem('+i+')" style="flex:1;background:var(--green);border:none;border-radius:8px;color:#fff;padding:8px;font-size:12px;font-weight:700;cursor:pointer">Setujui</button>'
      +'<button onclick="rejectItem('+i+')" style="flex:1;background:#fff;border:1.5px solid #ef4444;border-radius:8px;color:#ef4444;padding:8px;font-size:12px;font-weight:700;cursor:pointer">Tolak</button>'
      +'</div></div>';
  }).join('');
}

function closeAdminPanel(){var el=document.getElementById('adminModal');if(el)el.classList.remove('show');}

function approveItem(idx){
  var pending=currentPendingList;
  var item=pending[idx];
  if(!item){showToast('Item tidak ditemukan, refresh panel admin');return;}

  // Apply to tree in browser immediately

  if(item.tipe==='TAMBAH_ANAK'&&item.namaOrangTua){
    var pname=item.namaOrangTua.split(' + ')[0].trim();
    var pnode=allNodes.find(function(n){return n.n.toLowerCase()===pname.toLowerCase();});
    if(pnode){
      var nid=Date.now();
      var nn={id:nid,n:item.nama,s:item.pasangan||null,g:pnode.g+1,w:pnode.w,note:item.catatan||null,c:[],_parent:pnode};
      pnode.c.push(nn);allNodes.push(nn);nodeMap[nid]=nn;
      layoutTree();render();buildSidebar();buildListView();
      document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');
      showToast(item.nama+' berhasil ditambahkan!');
    } else {
      showToast('Orang tua tidak ditemukan: '+pname+'. Tetap disetujui untuk diproses server.');
    }
  } else if(item.tipe==='UPDATE'&&item.namaAsli){
    var node=allNodes.find(function(n){return n.n===item.namaAsli;});
    if(node){node.n=item.nama;if(item.pasangan)node.s=item.pasangan;layoutTree();render();showToast('Data diupdate!');}
  }

  // Remove from local list
  pending.splice(idx,1);
  currentPendingList=pending.slice();
  savePending(pending);

  // Kirim ke Vercel API untuk approve (aman, token di server)
  fetch('/api/approve',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-admin-password':sessionStorage.getItem('ikbas_admin_pw')||''},
    body:JSON.stringify({action:'approve',item:item})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d.success){showToast(d.message||'Disetujui! Pohon akan update dalam ~2 menit.');}
    else{showToast('Error: '+(d.error||'Gagal approve'));}
  })
  .catch(function(){showToast('Gagal terhubung ke server.');});

  closeAdminPanel();
  setTimeout(openAdminPanel,500);
}

function rejectItem(idx){
  if(!confirm('Tolak permintaan ini?'))return;
  var pending=currentPendingList;
  var item=pending[idx];
  pending.splice(idx,1);
  currentPendingList=pending.slice();
  savePending(pending);
  removeFromSubmissions(item);
  showToast('Permintaan ditolak');
  closeAdminPanel();
  setTimeout(openAdminPanel,500);
}


var NW=160,NH=52,HGAP=20,VGAP=68;
var WCOL=['#ef4444','#3b82f6','#10b981'];
var ACOL='#f59e0b',SCOL='#1a7a3c';
var GLBL=['Leluhur I','Leluhur II','Leluhur III','Leluhur IV','Bapak Sebil','Anak (Gen 1)','Cucu (Gen 2)','Cicit (Gen 3)','Gen 4','Gen 5','Gen 6','Gen 7'];
function gLabel(g){return GLBL[g]||'Gen '+g;}
function nColor(n){if(n.g<=3)return ACOL;if(n.g===4)return SCOL;if(n.w===0)return WCOL[0];if(n.w===1)return WCOL[1];if(n.w===2)return WCOL[2];return '#7c3aed';}

var allNodes=[],nodeMap={},posMap={};
var collapsed=new Set(),hlId=null;
var sideOpen=true,currentView='tree',maxGen=0;
var vx=0,vy=0,vk=0.6,dragging=false,dragSX=0,dragSY=0,dragVX=0,dragVY=0;
var svg=document.getElementById('tsvg'),mainG=document.getElementById('mainG');

function buildIndex(node,parent){node._parent=parent;allNodes.push(node);nodeMap[node.id]=node;if(node.g>maxGen)maxGen=node.g;(node.c||[]).forEach(function(c){buildIndex(c,node);});}
function layoutTree(){
  posMap={};var genY={};
  allNodes.forEach(function(n){if(genY[n.g]===undefined)genY[n.g]=Object.keys(genY).length*(NH+VGAP);});
  var counter=0;
  function assignX(node){var kids=collapsed.has(node.id)?[]:(node.c||[]);if(!kids.length){posMap[node.id]={x:counter*(NW+HGAP),y:genY[node.g]||0};counter++;return;}kids.forEach(function(c){assignX(c);});var fx=posMap[kids[0].id].x,lx=posMap[kids[kids.length-1].id].x;posMap[node.id]={x:(fx+lx)/2,y:genY[node.g]||0};}
  TREE.ancestors.forEach(function(a,i){posMap[a.id]={x:0,y:genY[a.g]||i*(NH+VGAP)};});
  counter=0;assignX(TREE.sebil);
  var sx=posMap[TREE.sebil.id].x;TREE.ancestors.forEach(function(a){posMap[a.id].x=sx;});
}

function render(){
  while(mainG.firstChild)mainG.removeChild(mainG.firstChild);
  var ns='http://www.w3.org/2000/svg';
  var linkG=document.createElementNS(ns,'g');
  function drawLinks(node){if(collapsed.has(node.id))return;var sp=posMap[node.id];if(!sp)return;(node.c||[]).forEach(function(child){var cp=posMap[child.id];if(!cp)return;var x1=sp.x+NW/2,y1=sp.y+NH,x2=cp.x+NW/2,y2=cp.y,my=(y1+y2)/2;var p=document.createElementNS(ns,'path');p.setAttribute('d','M'+x1+','+y1+' C'+x1+','+my+' '+x2+','+my+' '+x2+','+y2);p.setAttribute('fill','none');p.setAttribute('stroke',nColor(child)+'50');p.setAttribute('stroke-width','2');linkG.appendChild(p);drawLinks(child);});}
  for(var i=0;i<TREE.ancestors.length-1;i++){var a=TREE.ancestors[i],b=TREE.ancestors[i+1],ap=posMap[a.id],bp=posMap[b.id];if(ap&&bp){var lp=document.createElementNS(ns,'path');lp.setAttribute('d','M'+(ap.x+NW/2)+','+(ap.y+NH)+' L'+(bp.x+NW/2)+','+bp.y);lp.setAttribute('fill','none');lp.setAttribute('stroke',ACOL+'60');lp.setAttribute('stroke-width','2');linkG.appendChild(lp);}}
  var la=TREE.ancestors[TREE.ancestors.length-1],lap=posMap[la.id],sep=posMap[TREE.sebil.id];
  if(lap&&sep){var lp2=document.createElementNS(ns,'path');lp2.setAttribute('d','M'+(lap.x+NW/2)+','+(lap.y+NH)+' L'+(sep.x+NW/2)+','+sep.y);lp2.setAttribute('fill','none');lp2.setAttribute('stroke',ACOL+'60');lp2.setAttribute('stroke-width','2');linkG.appendChild(lp2);}
  drawLinks(TREE.sebil);mainG.appendChild(linkG);
  var nodeG=document.createElementNS(ns,'g');
  function drawNode(node){var pos=posMap[node.id];if(!pos)return;var col=nColor(node),isHL=hlId===node.id,kids=node.c||[],isAnc=node.g<=4,isColl=collapsed.has(node.id);var g=document.createElementNS(ns,'g');g.setAttribute('transform','translate('+pos.x+','+pos.y+')');g.style.cursor='pointer';g.addEventListener('click',function(e){e.stopPropagation();if(document.getElementById('relbox').classList.contains('show')&&relActive>0)selectForRelCalc(node);else showInfo(node.id);});g.addEventListener('dblclick',function(e){e.stopPropagation();if(kids.length)toggleCollapse(node.id);});var sh=document.createElementNS(ns,'rect');sh.setAttribute('x','2');sh.setAttribute('y','3');sh.setAttribute('width',NW);sh.setAttribute('height',NH);sh.setAttribute('rx','11');sh.setAttribute('fill','rgba(26,122,60,0.07)');sh.setAttribute('filter','url(#cardshadow)');g.appendChild(sh);var bg=document.createElementNS(ns,'rect');bg.setAttribute('width',NW);bg.setAttribute('height',NH);bg.setAttribute('rx','11');bg.setAttribute('fill',isHL?col+'18':'#ffffff');bg.setAttribute('stroke',isHL?col:col+'45');bg.setAttribute('stroke-width',isHL?'2.5':'1.5');g.appendChild(bg);var bar=document.createElementNS(ns,'rect');bar.setAttribute('width','5');bar.setAttribute('height',NH-10);bar.setAttribute('x','0');bar.setAttribute('y','5');bar.setAttribute('rx','2.5');bar.setAttribute('fill',col);g.appendChild(bar);if(isHL){var gl=document.createElementNS(ns,'rect');gl.setAttribute('width',NW);gl.setAttribute('height',NH);gl.setAttribute('rx','11');gl.setAttribute('fill','none');gl.setAttribute('stroke',col);gl.setAttribute('stroke-width','2.5');gl.setAttribute('filter','url(#glow)');g.appendChild(gl);}var nm=node.n.length>20?node.n.slice(0,19)+'...':node.n;var nt=document.createElementNS(ns,'text');nt.setAttribute('x','12');nt.setAttribute('y',node.s?'18':'28');nt.setAttribute('fill','#0d2b18');nt.setAttribute('font-size',isAnc?'12px':'11px');nt.setAttribute('font-weight','700');nt.setAttribute('font-family','Plus Jakarta Sans,Inter,system-ui,sans-serif');nt.textContent=nm;g.appendChild(nt);if(node.s){var spStr=node.s.length>22?node.s.slice(0,21)+'...':node.s;var st=document.createElementNS(ns,'text');st.setAttribute('x','12');st.setAttribute('y','33');st.setAttribute('fill','#3d6b4f');st.setAttribute('font-size','10px');st.setAttribute('font-weight','500');st.setAttribute('font-family','Inter,system-ui,sans-serif');st.textContent='+ '+spStr;g.appendChild(st);}if(kids.length>0){var cc=kids.length,bw=cc>9?28:22,bx=NW-bw-4,by=NH-16;var br=document.createElementNS(ns,'rect');br.setAttribute('x',bx);br.setAttribute('y',by);br.setAttribute('width',bw);br.setAttribute('height',13);br.setAttribute('rx','6');br.setAttribute('fill',isColl?col:'rgba(26,122,60,0.1)');g.appendChild(br);var bt=document.createElementNS(ns,'text');bt.setAttribute('x',bx+bw/2);bt.setAttribute('y',by+9.5);bt.setAttribute('text-anchor','middle');bt.setAttribute('fill',isColl?'#fff':col);bt.setAttribute('font-size','9px');bt.setAttribute('font-weight','800');bt.setAttribute('font-family','Inter,system-ui,sans-serif');bt.textContent=isColl?'+'+cc:cc;g.appendChild(bt);}nodeG.appendChild(g);if(!isColl)(node.c||[]).forEach(function(c){drawNode(c);});}
  TREE.ancestors.forEach(function(a){drawNode(a);});drawNode(TREE.sebil);mainG.appendChild(nodeG);
  applyTransform();
}

function applyTransform(){mainG.setAttribute('transform','translate('+vx+','+vy+') scale('+vk+')');}
svg.addEventListener('mousedown',function(e){if(e.button!==0)return;dragging=true;dragSX=e.clientX;dragSY=e.clientY;dragVX=vx;dragVY=vy;svg.style.cursor='grabbing';});
window.addEventListener('mousemove',function(e){if(!dragging)return;vx=dragVX+(e.clientX-dragSX);vy=dragVY+(e.clientY-dragSY);applyTransform();});
window.addEventListener('mouseup',function(){dragging=false;svg.style.cursor='grab';});
svg.addEventListener('wheel',function(e){e.preventDefault();var rect=svg.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;var f=e.deltaY<0?1.15:0.87,nk=Math.max(0.05,Math.min(3,vk*f));vx=mx-(mx-vx)*(nk/vk);vy=my-(my-vy)*(nk/vk);vk=nk;applyTransform();},{passive:false});
var lastTD=null,tSX=0,tSY=0,tVX=0,tVY=0;
svg.addEventListener('touchstart',function(e){
  if(e.touches.length===1){
    dragging=true;
    tSX=e.touches[0].clientX;tSY=e.touches[0].clientY;
    tVX=vx;tVY=vy;
    lastTD=null;
  } else if(e.touches.length===2){
    dragging=false;
    var dx=e.touches[0].clientX-e.touches[1].clientX;
    var dy=e.touches[0].clientY-e.touches[1].clientY;
    lastTD=Math.sqrt(dx*dx+dy*dy);
    // Store pinch center
    var rect=svg.getBoundingClientRect();
    tSX=(e.touches[0].clientX+e.touches[1].clientX)/2-rect.left;
    tSY=(e.touches[0].clientY+e.touches[1].clientY)/2-rect.top;
    tVX=vx;tVY=vy;
  }
},{passive:true});

svg.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===1&&dragging){
    vx=tVX+(e.touches[0].clientX-tSX);
    vy=tVY+(e.touches[0].clientY-tSY);
    applyTransform();
  } else if(e.touches.length===2&&lastTD){
    var dx=e.touches[0].clientX-e.touches[1].clientX;
    var dy=e.touches[0].clientY-e.touches[1].clientY;
    var dist=Math.sqrt(dx*dx+dy*dy);
    var scale=dist/lastTD;
    var nk=Math.max(0.05,Math.min(3,vk*scale));
    // Zoom toward pinch center
    vx=tSX-(tSX-tVX)*(nk/vk);
    vy=tSY-(tSY-tVY)*(nk/vk);
    vk=nk;
    lastTD=dist;
    tVX=vx;tVY=vy;
    applyTransform();
  }
},{passive:false});

svg.addEventListener('touchend',function(e){
  if(e.touches.length===0){dragging=false;lastTD=null;}
  else if(e.touches.length===1){
    dragging=true;
    tSX=e.touches[0].clientX;tSY=e.touches[0].clientY;
    tVX=vx;tVY=vy;
    lastTD=null;
  }
},{passive:true});
function zoomIn(){var w=svg.clientWidth,h=svg.clientHeight,nk=Math.min(3,vk*1.3);vx=w/2-(w/2-vx)*(nk/vk);vy=h/2-(h/2-vy)*(nk/vk);vk=nk;applyTransform();}
function zoomOut(){var w=svg.clientWidth,h=svg.clientHeight,nk=Math.max(0.05,vk*0.77);vx=w/2-(w/2-vx)*(nk/vk);vy=h/2-(h/2-vy)*(nk/vk);vk=nk;applyTransform();}
function resetView(){var pos=posMap[TREE.sebil.id];if(!pos)return;var w=svg.clientWidth,h=svg.clientHeight;vk=0.6;vx=w/2-(pos.x+NW/2)*vk;vy=h/2-(pos.y+NH/2)*vk;applyTransform();}

function toggleCollapse(id){if(collapsed.has(id)){collapsed.delete(id);var node=nodeMap[id];(node.c||[]).forEach(function(c){if((c.c||[]).length>0)collapsed.add(c.id);});showToast('Dibuka 1 level');}else{collapsed.add(id);showToast('Cabang dilipat');}layoutTree();render();}
function expandAll(){collapsed.clear();layoutTree();render();showToast('Semua cabang dibuka');}
function collapseAll(){collapsed.clear();allNodes.forEach(function(n){if((n.c||[]).length>0)collapsed.add(n.id);});TREE.ancestors.forEach(function(a){collapsed.delete(a.id);});collapsed.delete(TREE.sebil.id);layoutTree();render();showToast('Semua cabang dilipat');}

function showInfo(id){
  var node=nodeMap[id];if(!node)return;
  hlId=id;layoutTree();render();
  var kids=node.c||[],par=node._parent;
  var h='<div class="igb">'+gLabel(node.g)+'</div><div class="iname">'+node.n+'</div>';
  if(node.foto){var fotoDiv=document.createElement('div');fotoDiv.style.cssText='text-align:center;margin-bottom:10px';var fotoImg=document.createElement('img');fotoImg.src=node.foto;fotoImg.style.cssText='width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--green);box-shadow:0 4px 12px rgba(26,122,60,0.2)';fotoImg.onerror=function(){this.style.display='none';};fotoDiv.appendChild(fotoImg);document.getElementById('ipc').insertAdjacentElement('afterbegin',fotoDiv);}
  if(node.s)h+='<div class="isp">Pasangan: <span>'+node.s+'</span></div>';
  if(node.note)h+='<div class="inote">'+node.note+'</div>';
  h+='<div class="idv"></div>';
  h+='<div class="ir"><span class="l">Generasi</span><span class="v">'+gLabel(node.g)+'</span></div>';
  if(par){h+='<div class="ir"><span class="l">Orang Tua</span><span class="v">'+par.n+'</span></div>';var sibs=par.c||[],idx2=sibs.findIndex(function(c){return c.id===id;});if(idx2!==-1)h+='<div class="ir"><span class="l">Urutan Anak</span><span class="v">Ke-'+(idx2+1)+' dari '+sibs.length+'</span></div>';}
  h+='<div class="ir"><span class="l">Jumlah Anak</span><span class="v">'+kids.length+' orang</span></div>';
  if(node.w!==null&&node.w!==undefined&&node.g>=5)h+='<div class="ir"><span class="l">Cabang</span><span class="v" style="color:'+WCOL[node.w]+'">'+TREE.wives[node.w]+'</span></div>';
  if(kids.length>0){h+='<div class="idv"></div><div style="font-size:10px;color:var(--txt3);margin-bottom:4px;font-weight:700">Anak-anak ('+kids.length+')</div><div class="icl">';kids.slice(0,15).forEach(function(c,i){h+='<div class="ici" onclick="navigateTo('+c.id+',true)">'+(i+1)+'. '+c.n+(c.s?' + '+c.s:'')+'</div>';});if(kids.length>15)h+='<div style="font-size:10px;color:var(--txt3);padding:3px 8px">...dan '+(kids.length-15)+' lainnya</div>';h+='</div>';}
  h+='<div class="idv"></div><div style="display:flex;gap:6px"><button onclick="openEditNode('+id+')" style="flex:1;background:var(--green-light);border:1.5px solid var(--green-mid);border-radius:8px;color:var(--green);padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Update</button><button onclick="openAddChild('+id+')" style="flex:1;background:var(--yellow-light);border:1.5px solid rgba(245,197,24,0.4);border-radius:8px;color:#7a6000;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Tambah Anak</button></div>';
  if(isAdmin){h+='<div style="display:flex;gap:6px;margin-top:6px"><button onclick="moveNode('+id+')" style="flex:1;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;color:#1d4ed8;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Pindahkan</button><button onclick="deleteNode('+id+')" style="flex:1;background:#fef2f2;border:1.5px solid #fecaca;border-radius:8px;color:#dc2626;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Hapus</button></div>';}
  document.getElementById('ipc').innerHTML=h;
  document.getElementById('ip').classList.add('show');
  navigateTo(id,false);
}
function closeInfo(){document.getElementById('ip').classList.remove('show');hlId=null;layoutTree();render();}
function navigateTo(id,showPanel){var node=nodeMap[id];if(!node)return;var cur=node._parent;while(cur){collapsed.delete(cur.id);cur=cur._parent;}layoutTree();render();if(showPanel)showInfo(id);var pos=posMap[id];if(!pos)return;var w=svg.clientWidth,h=svg.clientHeight,tx=w/2-(pos.x+NW/2)*vk,ty=h/2-(pos.y+NH/2)*vk;var sx=vx,sy=vy,step=0;var anim=setInterval(function(){step++;var p=1-Math.pow(1-step/20,3);vx=sx+(tx-sx)*p;vy=sy+(ty-sy)*p;applyTransform();if(step>=20)clearInterval(anim);},16);}

var stimer;
document.getElementById('si').addEventListener('input',function(){clearTimeout(stimer);stimer=setTimeout(function(){doSearch(document.getElementById('si').value);},180);});
document.getElementById('si').addEventListener('blur',function(){setTimeout(function(){document.getElementById('sr').classList.remove('show');},200);});
function doSearch(q){var res=document.getElementById('sr');if(!q||q.length<2){res.classList.remove('show');return;}q=q.toLowerCase();var hits=allNodes.filter(function(n){return n.n.toLowerCase().indexOf(q)>=0||(n.s&&n.s.toLowerCase().indexOf(q)>=0);}).slice(0,18);if(!hits.length){res.innerHTML='<div class="sri" style="color:var(--txt3)">Tidak ditemukan</div>';res.classList.add('show');return;}res.innerHTML=hits.map(function(n){return '<div class="sri" onclick="pickSearch('+n.id+')">'+n.n+(n.s?' <span style="color:var(--txt3)">+ '+n.s+'</span>':'')+'<span class="gb">'+gLabel(n.g)+'</span></div>';}).join('');res.classList.add('show');}
function pickSearch(id){document.getElementById('sr').classList.remove('show');document.getElementById('si').value=nodeMap[id].n;if(currentView!=='tree')setView('tree');navigateTo(id,true);}

function buildSidebar(){var bl=document.getElementById('bl');var h='<div class="bi" onclick="navigateTo('+TREE.sebil.id+',true)"><div class="bn"><div class="bd" style="background:#f59e0b"></div>Leluhur & Bapak Sebil</div><div class="bm">Rantai leluhur dari Raden Wirawangsa</div></div>';(TREE.sebil.c||[]).forEach(function(n){var col=nColor(n),dc=countDesc(n);h+='<div class="bi" id="bi'+n.id+'" onclick="focusBranch('+n.id+')"><div class="bn"><div class="bd" style="background:'+col+'"></div>'+n.n+'</div><div class="bm">'+(n.s?'+ '+n.s+' \u00B7 ':'')+dc+' keturunan</div></div>';});bl.innerHTML=h;}
function countDesc(node){var c=0;var q=[].concat(node.c||[]);while(q.length){var n=q.shift();c++;q=q.concat(n.c||[]);}return c;}
function focusBranch(id){document.querySelectorAll('.bi').forEach(function(el){el.classList.remove('on');});var el=document.getElementById('bi'+id);if(el)el.classList.add('on');collapsed.delete(id);layoutTree();render();navigateTo(id,true);if(window.innerWidth<=768)toggleSide();}
function toggleSide(){sideOpen=!sideOpen;document.getElementById('side').classList.toggle('off',!sideOpen);}

function buildListView(){var byGen={};allNodes.forEach(function(n){if(!byGen[n.g])byGen[n.g]=[];byGen[n.g].push(n);});var h='';Object.keys(byGen).sort(function(a,b){return +a-+b;}).forEach(function(g){var list=byGen[g];h+='<div class="lgs"><div class="lgt">'+gLabel(+g)+' <span class="lgc">'+list.length+' orang</span></div><div class="lgr">'+list.map(function(n){return '<div class="lc" onclick="pickList('+n.id+')"><div class="lcn">'+n.n+'</div>'+(n.s?'<div class="lcs">'+n.s+'</div>':'')+'</div>';}).join('')+'</div></div>';});document.getElementById('lv').innerHTML=h;}
function pickList(id){setView('tree');setTimeout(function(){navigateTo(id,true);},80);}
function setView(v){currentView=v;document.getElementById('cwrap').style.display=v==='tree'?'block':'none';document.getElementById('lv').classList.toggle('show',v==='list');document.getElementById('btree').classList.toggle('on',v==='tree');document.getElementById('blist').classList.toggle('on',v==='list');}

var editingNodeId=null,addingToParentId=null;
function openEditNode(id){var node=nodeMap[id];if(!node)return;editingNodeId=id;addingToParentId=null;document.getElementById('modalTitle').textContent='Update: '+node.n;document.getElementById('fNama').value=node.n;document.getElementById('fPasangan').value=node.s||'';['fJK','fTgl','fTmpt','fHP','fAlamat'].forEach(function(id2){document.getElementById(id2).value='';});document.getElementById('fCatatan').value=node.note||'';document.getElementById('fParentInfo').style.display='none';
  document.getElementById('fFotoUrl').value='';
  document.getElementById('fFotoFile').value='';
  document.getElementById('photoPreviewWrap').style.display='none';
  document.getElementById('photoUploadArea').style.display='block';
  document.getElementById('editModal').classList.add('show');}
function openAddChild(parentId){var parent=nodeMap[parentId];if(!parent)return;editingNodeId=null;addingToParentId=parentId;document.getElementById('modalTitle').textContent='Tambah Anak dari: '+parent.n;['fNama','fPasangan','fTmpt','fHP','fAlamat','fCatatan'].forEach(function(id2){document.getElementById(id2).value='';});document.getElementById('fJK').value='';document.getElementById('fTgl').value='';document.getElementById('fParentInfo').style.display='block';document.getElementById('fParentName').textContent=parent.n+(parent.s?' + '+parent.s:'');document.getElementById('editModal').classList.add('show');}
function closeModal(){document.getElementById('editModal').classList.remove('show');}

function submitForm(){
  var nama=document.getElementById('fNama').value.trim();
  if(!nama){alert('Nama tidak boleh kosong!');return;}
  var parentNode=addingToParentId?nodeMap[addingToParentId]:null;
  var editNode=editingNodeId?nodeMap[editingNodeId]:null;
  var payload={
    tipe:editingNodeId?'UPDATE':(addingToParentId?'TAMBAH_ANAK':'TAMBAH_BARU'),
    nama:nama,
    pasangan:document.getElementById('fPasangan').value.trim(),
    jk:document.getElementById('fJK').value,
    tglLahir:document.getElementById('fTgl').value,
    tmptLahir:document.getElementById('fTmpt').value.trim(),
    hp:document.getElementById('fHP').value.trim(),
    alamat:document.getElementById('fAlamat').value.trim(),
    catatan:document.getElementById('fCatatan').value.trim(),
    namaOrangTua:parentNode?(parentNode.n+(parentNode.s?' + '+parentNode.s:'')):'',
    namaAsli:editNode?editNode.n:'',
    fotoUrl:document.getElementById('fFotoUrl').value||null
  };
  var btn=document.getElementById('btnSubmit');
  btn.innerHTML='<span class="spinner"></span> Mengirim...';btn.disabled=true;

  // Kirim ke Vercel API (aman, token di server)
  fetch('/api/submit',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  })
  .then(function(r){return r.json();})
  .then(function(d){
    btn.innerHTML='Kirim Data';btn.disabled=false;
    closeModal();
    if(d.success){showToast('Permintaan terkirim! Admin akan memverifikasi.');}
    else{showToast('Gagal: '+(d.error||'Unknown error'));}
  })
  .catch(function(e){
    btn.innerHTML='Kirim Data';btn.disabled=false;
    closeModal();
    showToast('Gagal mengirim. Coba lagi.');
  });
}

document.getElementById('editModal').addEventListener('click',function(e){if(e.target===this)closeModal();});

function deleteNode(id){var node=nodeMap[id];if(!node)return;var kids=node.c||[];var msg='Hapus "'+node.n+'"?';if(kids.length>0)msg+=' Peringatan: '+kids.length+' anak juga akan terhapus!';if(!confirm(msg))return;if(node._parent)node._parent.c=node._parent.c.filter(function(c){return c.id!==id;});function removeAll(n){delete nodeMap[n.id];var idx2=allNodes.findIndex(function(x){return x.id===n.id;});if(idx2>-1)allNodes.splice(idx2,1);(n.c||[]).forEach(function(c){removeAll(c);});}removeAll(node);closeInfo();layoutTree();render();buildSidebar();buildListView();document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');showToast('"'+node.n+'" berhasil dihapus');}
function moveNode(id){var node=nodeMap[id];if(!node)return;var newParentName=prompt('Masukkan nama orang tua baru untuk "'+node.n+'":');if(!newParentName)return;var newParent=allNodes.find(function(n){return n.n.toLowerCase()===newParentName.trim().toLowerCase();});if(!newParent){alert('Nama "'+newParentName+'" tidak ditemukan.');return;}if(newParent.id===id){alert('Tidak bisa memindahkan ke diri sendiri!');return;}if(node._parent)node._parent.c=node._parent.c.filter(function(c){return c.id!==id;});newParent.c.push(node);node._parent=newParent;function updateGen(n,gen){n.g=gen;(n.c||[]).forEach(function(c){updateGen(c,gen+1);});}updateGen(node,newParent.g+1);layoutTree();render();buildSidebar();showInfo(id);showToast('"'+node.n+'" berhasil dipindahkan ke "'+newParent.n+'"');}

function exportToCSV(){
  var wifes=['Ma Jangkung','Ma Hideung','Ma Aeni'];
  var rows=[['ID','Nama Lengkap','Nama Pasangan','Nama Orang Tua','Generasi','Cabang','Catatan']];
  function processNode(node,parentName){
    var cabang=node.g<=4?'Leluhur':(node.w!==null&&node.w!==undefined&&node.w<3?wifes[node.w]:'Lainnya');
    rows.push(['BS-'+String(node.id).padStart(4,'0'),node.n||'',node.s||'',parentName||'',node.g,cabang,(node.note||'').split(',').join(';')]);
    (node.c||[]).forEach(function(c){processNode(c,node.n+(node.s?' + '+node.s:''));});
  }
  TREE.ancestors.forEach(function(a){processNode(a,'');});
  processNode(TREE.sebil,TREE.ancestors.length?TREE.ancestors[TREE.ancestors.length-1].n:'');
  var bom='\uFEFF';
  var csv=bom+rows.map(function(r){
    return r.map(function(cell){
      var s=String(cell).split('"').join('""');
      return (s.indexOf(',')>=0||s.indexOf('"')>=0)?'"'+s+'"':s;
    }).join(',');
  }).join('\r\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='Silsilah-Bani-Sebil-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showToast('Data '+allNodes.length.toLocaleString('id')+' anggota berhasil di-export!');
}

var relActive=1,relNode1=null,relNode2=null;
function toggleRelCalc(){var box=document.getElementById('relbox');box.classList.toggle('show');if(box.classList.contains('show')){relActive=1;updateSlotHL();showToast('Pilih orang pertama dengan klik node');}}
function setActiveSlot(n){relActive=n;updateSlotHL();}
function updateSlotHL(){document.getElementById('slot1').classList.toggle('active',relActive===1);document.getElementById('slot2').classList.toggle('active',relActive===2);}
function clearRelCalc(){relNode1=null;relNode2=null;relActive=1;['slot1name','slot2name'].forEach(function(id2){var el=document.getElementById(id2);el.textContent='Belum dipilih';el.style.color='var(--txt3)';el.style.fontStyle='italic';el.style.fontWeight='400';});['slot1','slot2'].forEach(function(id2){document.getElementById(id2).classList.remove('filled');});document.getElementById('relresult').classList.remove('show');updateSlotHL();}
function selectForRelCalc(node){if(relActive===1){relNode1=node;var el=document.getElementById('slot1name');el.textContent=node.n;el.style.cssText='color:var(--txt);font-style:normal;font-weight:700';document.getElementById('slot1').classList.add('filled');relActive=2;updateSlotHL();showToast('Sekarang pilih orang kedua');}else if(relActive===2){relNode2=node;var el2=document.getElementById('slot2name');el2.textContent=node.n;el2.style.cssText='color:var(--txt);font-style:normal;font-weight:700';document.getElementById('slot2').classList.add('filled');relActive=0;updateSlotHL();calcRelation();}}
function getAllAnc(node){var res=new Map();function walk(cur,d){if(!cur)return;if(!res.has(cur.id))res.set(cur.id,[]);res.get(cur.id).push(d);if(cur._parent)walk(cur._parent,d+1);}walk(node,0);return res;}
function findLCAs(n1,n2){var a1=getAllAnc(n1),a2=getAllAnc(n2),common=[];a1.forEach(function(d1s,id){if(a2.has(id)){var d2s=a2.get(id),nd=nodeMap[id];if(nd)d1s.forEach(function(d1){d2s.forEach(function(d2){common.push({lca:nd,d1:d1,d2:d2,total:d1+d2});});});}});return common.sort(function(a,b){return a.total-b.total;}).slice(0,5);}
function getAncAtLCA(node,lcaId){var cur=node;while(cur&&cur._parent){if(cur._parent.id===lcaId)return cur;cur=cur._parent;}return null;}
function ancLabel(d){var m={1:'orang tua',2:'kakek/nenek',3:'buyut',4:'canggah',5:'wareng',6:'udeg-udeg',7:'gantung siwur'};return m[d]||('leluhur '+d+' generasi ke atas');}
function descLabel(d){var m={1:'anak',2:'cucu',3:'cicit',4:'canggah',5:'wareng',6:'udeg-udeg',7:'gantung siwur'};return m[d]||('keturunan '+d+' generasi ke bawah');}
function buildRelInfo(d1,d2,lcaNode){var n1=relNode1.n,n2=relNode2.n,lcaN=lcaNode.n,rel='',sen='',desc='',path='';if(d1===0&&d2===0)return{rel:'Orang yang sama',sen:'',desc:'',path:''};if(d1===0){rel=descLabel(d2);desc=n1+' adalah '+ancLabel(d2)+' dari '+n2;sen=n1+' adalah '+ancLabel(d2)+' dari '+n2+'. '+n2+' wajib menghormati '+n1;path=n2+' adalah '+rel+' dari '+n1;}else if(d2===0){rel=descLabel(d1);desc=n2+' adalah '+ancLabel(d1)+' dari '+n1;sen=n2+' adalah '+ancLabel(d1)+' dari '+n1+'. '+n1+' wajib menghormati '+n2;path=n1+' adalah '+rel+' dari '+n2;}else if(d1===1&&d2===1){rel='Saudara Kandung';desc=n1+' dan '+n2+' adalah saudara kandung';path='Orang tua bersama: '+lcaN;var par=relNode1._parent;if(par&&par.id===(relNode2._parent&&relNode2._parent.id)){var sibs=par.c||[],i1=sibs.findIndex(function(c){return c.id===relNode1.id;}),i2=sibs.findIndex(function(c){return c.id===relNode2.id;});if(i1!==-1&&i2!==-1&&i1!==i2){var older=i1<i2?n1:n2,younger=i1<i2?n2:n1,oi=Math.min(i1,i2),yi=Math.max(i1,i2);sen=older+' lebih tua (anak ke-'+(oi+1)+'). '+younger+' (anak ke-'+(yi+1)+') memanggil: Kang/Aa/Teh/Neng';}else sen='Saudara kandung - urutan berdasarkan posisi di pohon (kiri = lebih tua)';}else sen='Saudara kandung - urutan berdasarkan posisi di pohon';}else if((d1===1&&d2===2)||(d1===2&&d2===1)){var unc=d1<d2?n1:n2,nep=d1<d2?n2:n1;rel='Paman/Bibi - Keponakan';desc=unc+' adalah paman/bibi dari '+nep;sen=unc+' adalah paman/bibi. '+nep+' memanggil: Paman/Om/Ua/Mamang (L) atau Bibi/Tante/Ante (P)';path='Kakek/nenek bersama: '+lcaN;}else{var minD=Math.min(d1,d2),diff=Math.abs(d1-d2),lvl=minD-1;var sLbls=['','Sepupu 1x','Sepupu 2x','Sepupu 3x','Sepupu 4x','Sepupu 5x','Sepupu 6x'];var gLbls=['','satu','dua','tiga','empat','lima'];var base=sLbls[lvl]||('Sepupu '+lvl+'x');if(diff===0){rel=base;desc=n1+' dan '+n2+' adalah '+rel+' (setingkat generasi)';var a1x=getAncAtLCA(relNode1,lcaNode.id),a2x=getAncAtLCA(relNode2,lcaNode.id);if(a1x&&a2x&&a1x.id!==a2x.id){var lcaKids=lcaNode.c||[],p1=lcaKids.findIndex(function(c){return c.id===a1x.id;}),p2=lcaKids.findIndex(function(c){return c.id===a2x.id;});if(p1!==-1&&p2!==-1){var olderN=p1<p2?n1:n2,youngerN=p1<p2?n2:n1,op=Math.min(p1,p2),yp=Math.max(p1,p2),oa=p1<p2?a1x.n:a2x.n,ya=p1<p2?a2x.n:a1x.n;sen=olderN+' adalah KAKAK SEPUPU (leluhurnya "'+oa+'" adalah anak ke-'+(op+1)+' dari '+lcaN+'). '+youngerN+' adalah ADIK SEPUPU (leluhurnya "'+ya+'" adalah anak ke-'+(yp+1)+' dari '+lcaN+'). '+youngerN+' memanggil '+olderN+' dengan: Kang/Aa/Teh/Neng Sepupu';}else sen='Sepupu setingkat - urutan berdasarkan posisi anak di pohon (kiri = lebih tua)';}else sen='Sepupu setingkat - urutan berdasarkan posisi anak di pohon';}else{rel=base+' beda '+(gLbls[diff]||diff)+' generasi';desc=n1+' dan '+n2+' adalah '+rel;var olderN2=d1<d2?n1:n2,youngerN2=d1<d2?n2:n1;sen=olderN2+' lebih tua '+diff+' generasi - harus dituakan. Dalam adat, '+youngerN2+' memanggil '+olderN2+' dengan sebutan yang lebih hormat';}path='Leluhur bersama: '+lcaN+' ('+d1+' generasi dari '+n1+', '+d2+' generasi dari '+n2+')';}return{rel:rel,sen:sen,desc:desc,path:path};}
function calcRelation(){if(!relNode1||!relNode2){showToast('Pilih dua orang terlebih dahulu');return;}if(relNode1.id===relNode2.id){showResult('Orang yang sama','','Anda memilih orang yang sama','');return;}var lcas=findLCAs(relNode1,relNode2);if(!lcas.length){showResult('Tidak ada hubungan','','Kedua orang tidak memiliki leluhur yang sama','');return;}var info=buildRelInfo(lcas[0].d1,lcas[0].d2,lcas[0].lca);var extraPath=info.path;if(lcas.length>1){extraPath+=' | ADA PERNIKAHAN DALAM KELUARGA - Ada '+lcas.length+' jalur hubungan: ';lcas.forEach(function(lca,i){var r=buildRelInfo(lca.d1,lca.d2,lca.lca);extraPath+=(i+1)+'. '+r.rel+' (via '+lca.lca.n+', jarak '+lca.d1+'+'+lca.d2+'='+lca.total+')'+(i===0?' - TERDEKAT':'')+'. ';});extraPath+='Hubungan nomor 1 adalah yang paling relevan.';}showResult(info.rel+(lcas.length>1?' (terdekat)':''),info.sen,info.desc,extraPath);}
function showResult(main,sen,desc,path){document.getElementById('rel-main').textContent=main;var senEl=document.getElementById('rel-seniority');senEl.textContent=sen;senEl.style.display=sen?'block':'none';document.getElementById('rel-desc').textContent=desc;document.getElementById('rel-path').textContent=path;document.getElementById('relresult').classList.add('show');}

var tt;
function showToast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show');},2500);}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeInfo();closeModal();var rb=document.getElementById('relbox');if(rb&&rb.classList.contains('show'))toggleRelCalc();}if(!e.target.matches('input')&&!e.target.matches('textarea')){if(e.key==='+'||e.key==='=')zoomIn();if(e.key==='-')zoomOut();if(e.key==='r'||e.key==='R')resetView();}});
svg.addEventListener('click',function(e){if(e.target===svg||e.target.tagName==='rect')closeInfo();});


// ── CLOUDINARY CONFIG ─────────────────────────────────
// Daftar gratis di cloudinary.com → dapat cloud_name dan upload_preset
var CLOUDINARY_CLOUD = 'nawa3l3k';      // contoh: 'bani-sebil-ikbas'
var CLOUDINARY_PRESET = 'bani-sebil-foto';  // contoh: 'ml_default'

// ── PHOTO FUNCTIONS ───────────────────────────────────
function handlePhotoSelect(input){
  if(!input.files||!input.files[0])return;
  var file=input.files[0];
  if(file.size>5*1024*1024){showToast('Foto terlalu besar! Maksimal 5MB');return;}
  uploadToCloudinary(file);
}

function handlePhotoDrop(e){
  e.preventDefault();
  document.getElementById('photoUploadArea').classList.remove('dragover');
  var file=e.dataTransfer.files[0];
  if(!file||!file.type.startsWith('image/')){showToast('File harus berupa gambar!');return;}
  uploadToCloudinary(file);
}

function uploadToCloudinary(file){
  // Show uploading state
  document.getElementById('photoUploading').style.display='flex';
  document.getElementById('photoUploadArea').style.display='none';

  if(CLOUDINARY_CLOUD==='CLOUD_NAME_ANDA'){
    // Demo mode: use local preview only (no actual upload)
    var reader=new FileReader();
    reader.onload=function(e){
      showPhotoPreview(e.target.result);
      document.getElementById('fFotoUrl').value=e.target.result;
      document.getElementById('photoUploading').style.display='none';
      showToast('Preview foto siap! (Setup Cloudinary untuk upload permanen)');
    };
    reader.readAsDataURL(file);
    return;
  }

  // Upload to Cloudinary
  var formData=new FormData();
  formData.append('file',file);
  formData.append('upload_preset',CLOUDINARY_PRESET);
  formData.append('folder','bani-sebil');

  fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',{
    method:'POST',
    body:formData
  })
  .then(function(r){return r.json();})
  .then(function(d){
    document.getElementById('photoUploading').style.display='none';
    if(d.secure_url){
      // Use face-crop transformation for profile photo
      var url=d.secure_url.replace('/upload/','/upload/w_200,h_200,c_fill,g_face,r_max/');
      showPhotoPreview(url);
      document.getElementById('fFotoUrl').value=d.secure_url;
      showToast('Foto berhasil diupload!');
    } else {
      document.getElementById('photoUploadArea').style.display='block';
      showToast('Gagal upload foto: '+(d.error&&d.error.message||'Unknown error'));
    }
  })
  .catch(function(){
    document.getElementById('photoUploading').style.display='none';
    document.getElementById('photoUploadArea').style.display='block';
    showToast('Gagal upload foto. Cek koneksi internet.');
  });
}

function showPhotoPreview(url){
  // Show preview card
  document.getElementById('photoPreviewImg').src=url;
  document.getElementById('photoPreviewWrap').style.display='block';

  // Update preview with current form values
  updatePhotoPreview();
}

function updatePhotoPreview(){
  var nama=document.getElementById('fNama').value||'Nama Lengkap';
  var pasangan=document.getElementById('fPasangan').value;
  var parentName=document.getElementById('fParentName').textContent;

  document.getElementById('previewName').textContent=nama;
  document.getElementById('previewSpouse').textContent=pasangan?'♥ '+pasangan:'';
  document.getElementById('previewGen').textContent=parentName?'Anak dari: '+parentName:'';
}

function removePhoto(){
  document.getElementById('fFotoUrl').value='';
  document.getElementById('fFotoFile').value='';
  document.getElementById('photoPreviewWrap').style.display='none';
  document.getElementById('photoUploadArea').style.display='block';
  showToast('Foto dihapus');
}

// Update preview when name/spouse changes
function setupPhotoPreviewListeners(){
  var fields=['fNama','fPasangan'];
  fields.forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener('input',function(){
      if(document.getElementById('fFotoUrl').value) updatePhotoPreview();
    });
  });
}

TREE.ancestors.forEach(function(a){buildIndex(a,null);});
buildIndex(TREE.sebil,null);
allNodes.forEach(function(n){if((n.c||[]).length>0)collapsed.add(n.id);});
TREE.ancestors.forEach(function(a){collapsed.delete(a.id);});
collapsed.delete(TREE.sebil.id);
layoutTree();render();buildSidebar();buildListView();
document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');
document.getElementById('sgen').textContent=maxGen+1;
setTimeout(resetView,100);
if(sessionStorage.getItem('ikbas_auth')==='admin')initAdminMode();
setupPhotoPreviewListeners();
showToast('Selamat datang di Silsilah IKBAS!');
