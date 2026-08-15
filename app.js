// ═══════════════════════════════════════════════════════════
// SILSILAH BANI SEBIL — app.js v2.1
// ═══════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────
var CLOUDINARY_CLOUD  = 'CLOUD_NAME_ANDA';
var CLOUDINARY_PRESET = 'bani-sebil-foto';

// ── PASSWORD ──────────────────────────────────────────────
function _chk(v){ return v==='tegal danas'||v==='admin bani sebil tegal danas'; }
function _isAdm(v){ return v==='admin bani sebil tegal danas'; }
var isAdmin = false;

// ── LOCAL STORAGE ─────────────────────────────────────────
function getPending(){ try{ return JSON.parse(localStorage.getItem('ikbas_pending')||'[]'); }catch(e){ return []; } }
function savePending(arr){ try{ localStorage.setItem('ikbas_pending', JSON.stringify(arr)); }catch(e){} }

// ── AUTH ──────────────────────────────────────────────────
function checkPassword(){
  var inp=document.getElementById('pwInput'), err=document.getElementById('pwError');
  if(!inp) return;
  var val=inp.value.trim().toLowerCase();
  if(!val){ inp.focus(); return; }
  if(_chk(val)){
    isAdmin=_isAdm(val);
    sessionStorage.setItem('ikbas_auth', isAdmin?'admin':'user');
    if(isAdmin) sessionStorage.setItem('ikbas_admin_pw', val);
    enterApp();
  } else {
    if(err) err.classList.add('show');
    inp.classList.add('error'); inp.value=''; inp.focus();
    setTimeout(function(){ inp.classList.remove('error'); if(err) err.classList.remove('show'); }, 1500);
  }
}
function togglePw(){
  var inp=document.getElementById('pwInput'), btn=document.getElementById('togglePwBtn');
  if(!inp||!btn) return;
  if(inp.type==='password'){ inp.type='text'; btn.textContent='X'; }
  else { inp.type='password'; btn.textContent='O'; }
}
function enterApp(){
  var landing=document.getElementById('landing'), app=document.getElementById('app');
  landing.style.opacity='0'; landing.style.transition='opacity .4s';
  setTimeout(function(){
    landing.style.display='none';
    app.classList.add('visible');
    if(isAdmin) initAdminMode();
    // Load tree data setelah app visible
    loadTreeData();
  }, 400);
}
function logout(){
  if(!confirm('Keluar dari Silsilah IKBAS?')) return;
  sessionStorage.clear(); location.reload();
}
(function(){
  var s=sessionStorage.getItem('ikbas_auth');
  if(s==='admin'){ isAdmin=true; document.getElementById('landing').style.display='none'; document.getElementById('app').classList.add('visible'); }
  else if(s==='user'){ isAdmin=false; document.getElementById('landing').style.display='none'; document.getElementById('app').classList.add('visible'); }
})();

// ── LEGEND ────────────────────────────────────────────────
function toggleLegend(){
  var c=document.getElementById('legContent'), t=document.getElementById('legToggle');
  if(!c||!t) return;
  if(c.style.display==='none'){ c.style.display='block'; t.textContent='▲'; }
  else { c.style.display='none'; t.textContent='▼'; }
}

// ── API HELPERS ───────────────────────────────────────────
function apiPost(endpoint, body, adminRequired){
  var headers={'Content-Type':'application/json'};
  if(adminRequired) headers['x-admin-password']=sessionStorage.getItem('ikbas_admin_pw')||'';
  return fetch(endpoint,{method:'POST',headers:headers,body:JSON.stringify(body)})
    .then(function(r){ if(!r.ok) return r.json().then(function(e){throw new Error(e.error||'HTTP '+r.status);}); return r.json(); });
}
function apiGet(endpoint, adminRequired){
  var headers={};
  if(adminRequired) headers['x-admin-password']=sessionStorage.getItem('ikbas_admin_pw')||'';
  return fetch(endpoint,{headers:headers})
    .then(function(r){ if(!r.ok) return r.json().then(function(e){throw new Error(e.error||'HTTP '+r.status);}); return r.json(); });
}

// ── ADMIN MODE ────────────────────────────────────────────
function initAdminMode(){
  var hst=document.querySelector('.hst');
  if(hst&&!document.getElementById('adminBadge')){
    var badge=document.createElement('div'); badge.id='adminBadge';
    badge.style.cssText='background:#f5c518;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:800;color:#0d2b18;display:flex;align-items:center;gap:4px';
    badge.innerHTML='🔑 ADMIN'; hst.insertBefore(badge,hst.firstChild);
  }
  var tb=document.querySelector('.tb');
  if(tb&&!document.getElementById('adminPanelBtn')){
    var btn=document.createElement('button'); btn.id='adminPanelBtn'; btn.className='btn';
    btn.style.cssText='border-color:rgba(245,197,24,0.6);color:#7a6000;background:#fffbe6;font-weight:700';
    btn.innerHTML='🔑 Panel Admin'; btn.onclick=openAdminPanel; tb.appendChild(btn);
  }
  apiGet('/api/submissions',true).then(function(d){ if(d.success&&d.data&&d.data.length>0) setTimeout(function(){showToast('🔔 Ada '+d.data.length+' permintaan menunggu!');},1500); }).catch(function(){});
}

// ── ADMIN PANEL ───────────────────────────────────────────
var currentPendingList=[];

function openAdminPanel(){
  var panelEl=document.getElementById('adminModal'), contentEl=document.getElementById('adminContent');
  if(!panelEl||!contentEl) return;
  panelEl.classList.add('show');
  contentEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--txt2)">Memuat permintaan...</div>';
  apiGet('/api/submissions',true)
    .then(function(d){
      if(d.success){ currentPendingList=d.data||[]; renderAdminPanel(currentPendingList); }
      else contentEl.innerHTML='<div style="color:#ef4444;padding:16px;font-weight:600">Error: '+(d.error||'Gagal load data')+'</div>';
    })
    .catch(function(e){ contentEl.innerHTML='<div style="color:#ef4444;padding:16px;font-weight:600">Gagal terhubung: '+e.message+'</div>'; });
}

function closeAdminPanel(){ var el=document.getElementById('adminModal'); if(el) el.classList.remove('show'); }

function renderAdminPanel(pending){
  var contentEl=document.getElementById('adminContent'); if(!contentEl) return;
  if(!pending||!pending.length){
    contentEl.innerHTML='<div style="text-align:center;padding:24px;color:var(--txt2)"><div style="font-size:40px;margin-bottom:12px">✅</div><div style="font-weight:700">Tidak ada permintaan pending</div></div>';
    return;
  }
  contentEl.innerHTML=pending.map(function(item,i){
    var tipeLabel='',tipeColor='',tipeIcon='';
    if(item.tipe==='TAMBAH_ANAK'){tipeLabel='Tambah Anak Baru';tipeColor='#059669';tipeIcon='➕';}
    else if(item.tipe==='UPDATE'){tipeLabel='Update Data';tipeColor='#2563eb';tipeIcon='✏️';}
    else if(item.tipe==='HAPUS'){tipeLabel='Hapus Data';tipeColor='#dc2626';tipeIcon='🗑️';}
    else{tipeLabel=item.tipe||'Lainnya';tipeColor='#7c3aed';tipeIcon='📝';}
    var currentNode=null;
    if((item.tipe==='UPDATE'||item.tipe==='HAPUS')&&item.namaAsli) currentNode=allNodes.find(function(n){return n.n===item.namaAsli;});
    var parentNode=null;
    if(item.namaOrangTua){var pname=item.namaOrangTua.split(' + ')[0].trim();parentNode=allNodes.find(function(n){return n.n.toLowerCase()===pname.toLowerCase();});}
    var html='<div style="background:#fff;border:1.5px solid var(--green-mid);border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(26,122,60,0.08)">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    html+='<span style="background:'+tipeColor+'22;color:'+tipeColor+';border:1px solid '+tipeColor+'44;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">'+tipeIcon+' '+tipeLabel+'</span>';
    html+='<span style="font-size:10px;color:var(--txt3)">'+new Date(item.timestamp||Date.now()).toLocaleString('id-ID')+'</span></div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    // BEFORE
    html+='<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px">';
    html+='<div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">⬅ Sebelum</div>';
    if(item.tipe==='TAMBAH_ANAK'){
      html+='<div style="font-size:11px;color:#6b7280;font-style:italic">Belum ada</div>';
      if(parentNode){html+='<div style="font-size:11px;color:#374151;margin-top:4px">Orang tua: <b>'+parentNode.n+'</b></div>';html+='<div style="font-size:10px;color:#6b7280">Saat ini punya '+(parentNode.c||[]).length+' anak</div>';}
    } else if(currentNode){
      if(currentNode.foto) html+='<img src="'+currentNode.foto+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #dc2626;margin-bottom:4px">';
      html+='<div style="font-size:13px;font-weight:700;color:#374151">'+currentNode.n+'</div>';
      if(currentNode.s) html+='<div style="font-size:11px;color:#6b7280">♥ '+currentNode.s+'</div>';
      if(currentNode.note) html+='<div style="font-size:10px;color:#6b7280;margin-top:2px">'+currentNode.note+'</div>';
    } else html+='<div style="font-size:11px;color:#6b7280;font-style:italic">Data tidak ditemukan di pohon</div>';
    html+='</div>';
    // AFTER
    html+='<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px">';
    html+='<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">➡ Sesudah</div>';
    if(item.tipe==='HAPUS'){
      html+='<div style="font-size:11px;color:#dc2626;font-weight:600">Data akan dihapus permanen</div>';
      if(currentNode) html+='<div style="font-size:10px;color:#6b7280;margin-top:4px">Termasuk '+(currentNode.c||[]).length+' keturunan</div>';
    } else {
      if(item.fotoUrl) html+='<img src="'+item.fotoUrl+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #059669;margin-bottom:4px">';
      html+='<div style="font-size:13px;font-weight:700;color:#374151">'+(item.nama||'-')+'</div>';
      if(item.pasangan) html+='<div style="font-size:11px;color:#6b7280">♥ '+item.pasangan+'</div>';
      if(item.namaOrangTua) html+='<div style="font-size:11px;color:#374151;margin-top:4px">Orang tua: <b>'+item.namaOrangTua+'</b></div>';
      if(item.jk) html+='<div style="font-size:10px;color:#6b7280">'+(item.jk==='L'?'Laki-laki':'Perempuan')+'</div>';
      if(item.tglLahir) html+='<div style="font-size:10px;color:#6b7280">Lahir: '+item.tglLahir+(item.tmptLahir?' di '+item.tmptLahir:'')+'</div>';
      if(item.hp) html+='<div style="font-size:10px;color:#6b7280">HP: '+item.hp+'</div>';
      if(item.catatan) html+='<div style="font-size:10px;color:#6b7280;margin-top:2px">'+item.catatan+'</div>';
    }
    html+='</div></div>';
    html+='<div style="display:flex;gap:8px">';
    html+='<button onclick="approveItem('+i+')" style="flex:1;background:var(--green);border:none;border-radius:8px;color:#fff;padding:9px;font-size:12px;font-weight:700;cursor:pointer">✅ Setujui & Terapkan</button>';
    html+='<button onclick="rejectItem('+i+')" style="flex:1;background:#fff;border:1.5px solid #ef4444;border-radius:8px;color:#ef4444;padding:9px;font-size:12px;font-weight:700;cursor:pointer">❌ Tolak</button>';
    html+='</div></div>';
    return html;
  }).join('');
}

function approveItem(idx){
  var item=currentPendingList[idx];
  if(!item){ showToast('Item tidak ditemukan, refresh panel admin'); return; }
  // Apply to browser tree immediately
  if(item.tipe==='TAMBAH_ANAK'&&item.namaOrangTua){
    var pname=item.namaOrangTua.split(' + ')[0].trim();
    var pnode=allNodes.find(function(n){return n.n.toLowerCase()===pname.toLowerCase();});
    if(pnode){
      var nid=Date.now();
      var nn={id:nid,n:item.nama,s:item.pasangan||null,g:pnode.g+1,w:pnode.w,note:item.catatan||null,foto:item.fotoUrl||null,jk:item.jk||null,tglLahir:item.tglLahir||null,tmptLahir:item.tmptLahir||null,hp:item.hp||null,alamat:item.alamat||null,c:[],_parent:pnode};
      pnode.c.push(nn); allNodes.push(nn); nodeMap[nid]=nn;
      layoutTree(); render(); buildSidebar(); buildListView();
      document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');
    }
  } else if(item.tipe==='UPDATE'&&item.namaAsli){
    var node=allNodes.find(function(n){return n.n===item.namaAsli;});
    if(node){
      node.n=item.nama;
      if(item.pasangan!==undefined) node.s=item.pasangan||null;
      if(item.catatan) node.note=item.catatan;
      if(item.fotoUrl) node.foto=item.fotoUrl;
      if(item.jk) node.jk=item.jk;
      if(item.tglLahir) node.tglLahir=item.tglLahir;
      if(item.tmptLahir) node.tmptLahir=item.tmptLahir;
      if(item.hp) node.hp=item.hp;
      if(item.alamat) node.alamat=item.alamat;
      layoutTree(); render();
    }
  } else if(item.tipe==='HAPUS'){
    var delNode=allNodes.find(function(n){return n.n===(item.namaAsli||item.nama);});
    if(delNode){
      if(delNode._parent) delNode._parent.c=delNode._parent.c.filter(function(c){return c.id!==delNode.id;});
      function removeAll(n){delete nodeMap[n.id];var i2=allNodes.findIndex(function(x){return x.id===n.id;});if(i2>-1)allNodes.splice(i2,1);(n.c||[]).forEach(function(c){removeAll(c);});}
      removeAll(delNode); layoutTree(); render(); buildSidebar(); buildListView();
      document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');
    }
  }
  apiPost('/api/approve',{action:'approve',item:item},true)
    .then(function(d){ currentPendingList.splice(idx,1); showToast(d.message||'✅ Disetujui! Pohon akan update dalam ~2 menit.'); closeAdminPanel(); setTimeout(openAdminPanel,500); })
    .catch(function(e){ showToast('❌ Gagal approve: '+e.message); });
}

function rejectItem(idx){
  if(!confirm('Tolak permintaan ini?')) return;
  var item=currentPendingList[idx]; if(!item) return;
  apiPost('/api/approve',{action:'reject',item:item},true)
    .then(function(d){ currentPendingList.splice(idx,1); showToast(d.message||'Permintaan ditolak'); closeAdminPanel(); setTimeout(openAdminPanel,500); })
    .catch(function(e){ showToast('❌ Gagal tolak: '+e.message); });
}

// ── PHOTO UPLOAD ──────────────────────────────────────────
function handlePhotoSelect(input){
  if(!input.files||!input.files[0]) return;
  var file=input.files[0];
  if(file.size>5*1024*1024){ showToast('Foto terlalu besar! Maksimal 5MB'); return; }
  if(!file.type.startsWith('image/')){ showToast('File harus berupa gambar!'); return; }
  uploadPhoto(file);
}

function uploadPhoto(file){
  document.getElementById('photoUploading').style.display='flex';
  document.getElementById('photoUploadArea').style.display='none';
  var uniqueName=Date.now()+'_'+Math.random().toString(36).substr(2,9)+'_'+file.name.replace(/[^a-zA-Z0-9.]/g,'_');
  if(!CLOUDINARY_CLOUD||CLOUDINARY_CLOUD==='CLOUD_NAME_ANDA'){
    var reader=new FileReader();
    reader.onload=function(e){ showPhotoPreview(e.target.result); document.getElementById('fFotoUrl').value=''; document.getElementById('photoUploading').style.display='none'; showToast('Preview tampil! Isi CLOUDINARY_CLOUD di app.js untuk upload permanen.'); };
    reader.onerror=function(){ showToast('Gagal baca file foto'); document.getElementById('photoUploading').style.display='none'; document.getElementById('photoUploadArea').style.display='block'; };
    reader.readAsDataURL(file); return;
  }
  var formData=new FormData();
  formData.append('file',file);
  formData.append('upload_preset',CLOUDINARY_PRESET);
  formData.append('folder','bani-sebil');
  formData.append('public_id','bani-sebil/'+uniqueName.replace(/\.[^.]+$/,''));
  fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',{method:'POST',body:formData})
    .then(function(r){return r.json();})
    .then(function(d){
      document.getElementById('photoUploading').style.display='none';
      if(d.secure_url){
        var url=d.secure_url.replace('/upload/','/upload/w_300,h_300,c_fill,g_face,r_max,q_auto,f_auto/');
        showPhotoPreview(url); document.getElementById('fFotoUrl').value=d.secure_url;
        showToast('✅ Foto berhasil diupload!');
      } else {
        document.getElementById('photoUploadArea').style.display='block';
        showToast('❌ Gagal upload: '+((d.error&&d.error.message)||JSON.stringify(d)));
        console.error('Cloudinary error:',d);
      }
    })
    .catch(function(e){ document.getElementById('photoUploading').style.display='none'; document.getElementById('photoUploadArea').style.display='block'; showToast('❌ Gagal upload: '+e.message); });
}

function showPhotoPreview(url){
  var img=document.getElementById('photoPreviewImg'), wrap=document.getElementById('photoPreviewWrap');
  if(!img||!wrap) return;
  img.src=url; img.style.display='block'; wrap.style.display='block'; updatePhotoPreview();
}

function updatePhotoPreview(){
  var nama=document.getElementById('fNama').value||'Nama Lengkap';
  var pasangan=document.getElementById('fPasangan').value;
  var parentInfoEl=document.getElementById('fParentInfo');
  var parentName='';
  if(parentInfoEl&&parentInfoEl.style.display!=='none') parentName=document.getElementById('fParentName').textContent;
  var nameEl=document.getElementById('previewName'), spouseEl=document.getElementById('previewSpouse'), genEl=document.getElementById('previewGen');
  if(nameEl) nameEl.textContent=nama;
  if(spouseEl) spouseEl.textContent=pasangan?'♥ '+pasangan:'';
  if(genEl) genEl.textContent=parentName?'Anak dari: '+parentName:'';
}

function removePhoto(){ resetPhotoUpload(); showToast('Foto dihapus'); }

function resetPhotoUpload(){
  var els={fFotoUrl:'',fFotoFile:''};
  Object.keys(els).forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  var wrap=document.getElementById('photoPreviewWrap'); if(wrap) wrap.style.display='none';
  var area=document.getElementById('photoUploadArea'); if(area) area.style.display='block';
  var uploading=document.getElementById('photoUploading'); if(uploading) uploading.style.display='none';
  var img=document.getElementById('photoPreviewImg'); if(img){img.src='';img.style.display='none';}
}

// ── SUBMIT FORM ───────────────────────────────────────────
var editingNodeId=null, addingToParentId=null;

function submitForm(){
  var nama=document.getElementById('fNama').value.trim();
  if(!nama){ alert('Nama tidak boleh kosong!'); return; }
  var parentNode=addingToParentId?nodeMap[addingToParentId]:null;
  var editNode=editingNodeId?nodeMap[editingNodeId]:null;
  var payload={
    tipe:editingNodeId?'UPDATE':(addingToParentId?'TAMBAH_ANAK':'TAMBAH_BARU'),
    nama:nama,
    pasangan:document.getElementById('fPasangan').value.trim()||null,
    jk:document.getElementById('fJK').value||null,
    tglLahir:document.getElementById('fTgl').value||null,
    tmptLahir:document.getElementById('fTmpt').value.trim()||null,
    hp:document.getElementById('fHP').value.trim()||null,
    alamat:document.getElementById('fAlamat').value.trim()||null,
    catatan:document.getElementById('fCatatan').value.trim()||null,
    namaOrangTua:parentNode?(parentNode.n+(parentNode.s?' + '+parentNode.s:'')):'',
    namaAsli:editNode?editNode.n:'',
    fotoUrl:document.getElementById('fFotoUrl').value||null
  };
  var btn=document.getElementById('btnSubmit');
  btn.innerHTML='<span class="spinner"></span> Mengirim...'; btn.disabled=true;
  apiPost('/api/submit',payload,false)
    .then(function(d){ btn.innerHTML='📤 Kirim Data'; btn.disabled=false; closeModal(); showToast(d.success?'✅ '+(d.message||'Permintaan terkirim!'):'❌ '+(d.error||'Gagal mengirim')); })
    .catch(function(e){ btn.innerHTML='📤 Kirim Data'; btn.disabled=false; showToast('❌ Gagal mengirim: '+e.message); console.error('submitForm error:',e); });
}

function openEditNode(id){
  var node=nodeMap[id]; if(!node) return;
  editingNodeId=id; addingToParentId=null;
  document.getElementById('modalTitle').textContent='✏️ Update: '+node.n;
  document.getElementById('fNama').value=node.n;
  document.getElementById('fPasangan').value=node.s||'';
  document.getElementById('fJK').value=node.jk||'';
  document.getElementById('fTgl').value=node.tglLahir||'';
  document.getElementById('fTmpt').value=node.tmptLahir||'';
  document.getElementById('fHP').value=node.hp||'';
  document.getElementById('fAlamat').value=node.alamat||'';
  document.getElementById('fCatatan').value=node.note||'';
  document.getElementById('fParentInfo').style.display='none';
  resetPhotoUpload();
  if(node.foto){ showPhotoPreview(node.foto); document.getElementById('fFotoUrl').value=node.foto; }
  document.getElementById('editModal').classList.add('show');
}

function openAddChild(parentId){
  var parent=nodeMap[parentId]; if(!parent) return;
  editingNodeId=null; addingToParentId=parentId;
  document.getElementById('modalTitle').textContent='➕ Tambah Anak dari: '+parent.n;
  ['fNama','fPasangan','fTmpt','fHP','fAlamat','fCatatan'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('fJK').value=''; document.getElementById('fTgl').value='';
  document.getElementById('fParentInfo').style.display='block';
  document.getElementById('fParentName').textContent=parent.n+(parent.s?' + '+parent.s:'');
  resetPhotoUpload();
  document.getElementById('editModal').classList.add('show');
}

function closeModal(){ document.getElementById('editModal').classList.remove('show'); editingNodeId=null; addingToParentId=null; }

// ── DELETE / MOVE ─────────────────────────────────────────
function deleteNode(id){
  var node=nodeMap[id]; if(!node) return;
  var kids=node.c||[];
  var msg='Hapus "'+node.n+'" dari pohon silsilah?';
  if(kids.length>0) msg+='\n\nPeringatan: '+kids.length+' anak juga akan ikut terhapus!';
  if(!confirm(msg)) return;
  var nodeName=node.n;
  if(node._parent) node._parent.c=node._parent.c.filter(function(c){return c.id!==id;});
  function removeAll(n){delete nodeMap[n.id];var i2=allNodes.findIndex(function(x){return x.id===n.id;});if(i2>-1)allNodes.splice(i2,1);(n.c||[]).forEach(function(c){removeAll(c);});}
  removeAll(node); closeInfo(); layoutTree(); render(); buildSidebar(); buildListView();
  document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');
  apiPost('/api/submit',{tipe:'HAPUS',nama:nodeName,namaAsli:nodeName,catatan:'Hapus node dan '+kids.length+' keturunan'},false)
    .then(function(d){ showToast(d.success?'"'+nodeName+'" dihapus. Admin perlu approve agar permanen.':'❌ Gagal kirim ke server'); })
    .catch(function(e){ showToast('"'+nodeName+'" dihapus dari tampilan. Gagal kirim: '+e.message); });
}

function moveNode(id){
  var node=nodeMap[id]; if(!node) return;
  var newParentName=prompt('Masukkan nama orang tua baru untuk "'+node.n+'":');
  if(!newParentName) return;
  var newParent=allNodes.find(function(n){return n.n.toLowerCase()===newParentName.trim().toLowerCase();});
  if(!newParent){ alert('Nama "'+newParentName+'" tidak ditemukan.'); return; }
  if(newParent.id===id){ alert('Tidak bisa memindahkan ke diri sendiri!'); return; }
  if(node._parent) node._parent.c=node._parent.c.filter(function(c){return c.id!==id;});
  newParent.c.push(node); node._parent=newParent;
  function updateGen(n,gen){n.g=gen;(n.c||[]).forEach(function(c){updateGen(c,gen+1);});}
  updateGen(node,newParent.g+1); layoutTree(); render(); buildSidebar(); showInfo(id);
  showToast('"'+node.n+'" berhasil dipindahkan ke "'+newParent.n+'"');
}

// ── EXPORT CSV ────────────────────────────────────────────
function exportToCSV(){
  var wifes=['Ma Jangkung','Ma Hideung','Ma Aeni'];
  var rows=[['ID','Nama Lengkap','Nama Pasangan','Nama Orang Tua','Generasi','Cabang','JK','Tgl Lahir','Tempat Lahir','HP','Alamat','Catatan','Foto URL']];
  function processNode(node,parentName){
    var cabang=node.g<=4?'Leluhur':(node.w!==null&&node.w!==undefined&&node.w<3?wifes[node.w]:'Lainnya');
    rows.push(['BS-'+String(node.id).padStart(4,'0'),node.n||'',node.s||'',parentName||'',node.g,cabang,node.jk||'',node.tglLahir||'',node.tmptLahir||'',node.hp||'',node.alamat||'',(node.note||'').split(',').join(';'),node.foto||'']);
    (node.c||[]).forEach(function(c){processNode(c,node.n+(node.s?' + '+node.s:''));});
  }
  TREE.ancestors.forEach(function(a){processNode(a,'');});
  processNode(TREE.sebil,TREE.ancestors.length?TREE.ancestors[TREE.ancestors.length-1].n:'');
  var bom='\uFEFF';
  var csv=bom+rows.map(function(r){return r.map(function(cell){var s=String(cell).split('"').join('""');return(s.indexOf(',')>=0||s.indexOf('"')>=0)?'"'+s+'"':s;}).join(',');}).join('\r\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='Silsilah-Bani-Sebil-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('✅ Data '+allNodes.length.toLocaleString('id')+' anggota berhasil di-export!');
}

// ── TREE CONSTANTS ────────────────────────────────────────
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
  function drawNode(node){
    var pos=posMap[node.id];if(!pos)return;
    var col=nColor(node),isHL=hlId===node.id,kids=node.c||[],isAnc=node.g<=4,isColl=collapsed.has(node.id);
    var g=document.createElementNS(ns,'g');g.setAttribute('transform','translate('+pos.x+','+pos.y+')');g.style.cursor='pointer';
    g.addEventListener('click',function(e){e.stopPropagation();if(document.getElementById('relbox').classList.contains('show')&&relActive>0)selectForRelCalc(node);else showInfo(node.id);});
    g.addEventListener('dblclick',function(e){e.stopPropagation();if(kids.length)toggleCollapse(node.id);});
    var sh=document.createElementNS(ns,'rect');sh.setAttribute('x','2');sh.setAttribute('y','3');sh.setAttribute('width',NW);sh.setAttribute('height',NH);sh.setAttribute('rx','11');sh.setAttribute('fill','rgba(26,122,60,0.07)');sh.setAttribute('filter','url(#cardshadow)');g.appendChild(sh);
    var bg=document.createElementNS(ns,'rect');bg.setAttribute('width',NW);bg.setAttribute('height',NH);bg.setAttribute('rx','11');bg.setAttribute('fill',isHL?col+'18':'#ffffff');bg.setAttribute('stroke',isHL?col:col+'45');bg.setAttribute('stroke-width',isHL?'2.5':'1.5');g.appendChild(bg);
    var bar=document.createElementNS(ns,'rect');bar.setAttribute('width','5');bar.setAttribute('height',NH-10);bar.setAttribute('x','0');bar.setAttribute('y','5');bar.setAttribute('rx','2.5');bar.setAttribute('fill',col);g.appendChild(bar);
    if(isHL){var gl=document.createElementNS(ns,'rect');gl.setAttribute('width',NW);gl.setAttribute('height',NH);gl.setAttribute('rx','11');gl.setAttribute('fill','none');gl.setAttribute('stroke',col);gl.setAttribute('stroke-width','2.5');gl.setAttribute('filter','url(#glow)');g.appendChild(gl);}
    var nm=node.n.length>20?node.n.slice(0,19)+'...':node.n;
    var nt=document.createElementNS(ns,'text');nt.setAttribute('x','12');nt.setAttribute('y',node.s?'18':'28');nt.setAttribute('fill','#0d2b18');nt.setAttribute('font-size',isAnc?'12px':'11px');nt.setAttribute('font-weight','700');nt.setAttribute('font-family','Plus Jakarta Sans,Inter,system-ui,sans-serif');nt.textContent=nm;g.appendChild(nt);
    if(node.s){var spStr=node.s.length>22?node.s.slice(0,21)+'...':node.s;var st=document.createElementNS(ns,'text');st.setAttribute('x','12');st.setAttribute('y','33');st.setAttribute('fill','#3d6b4f');st.setAttribute('font-size','10px');st.setAttribute('font-weight','500');st.setAttribute('font-family','Inter,system-ui,sans-serif');st.textContent='+ '+spStr;g.appendChild(st);}
    if(kids.length>0){var cc=kids.length,bw=cc>9?28:22,bx=NW-bw-4,by=NH-16;var br=document.createElementNS(ns,'rect');br.setAttribute('x',bx);br.setAttribute('y',by);br.setAttribute('width',bw);br.setAttribute('height',13);br.setAttribute('rx','6');br.setAttribute('fill',isColl?col:'rgba(26,122,60,0.1)');g.appendChild(br);var bt=document.createElementNS(ns,'text');bt.setAttribute('x',bx+bw/2);bt.setAttribute('y',by+9.5);bt.setAttribute('text-anchor','middle');bt.setAttribute('fill',isColl?'#fff':col);bt.setAttribute('font-size','9px');bt.setAttribute('font-weight','800');bt.setAttribute('font-family','Inter,system-ui,sans-serif');bt.textContent=isColl?'+'+cc:cc;g.appendChild(bt);}
    if(node.foto){try{var defs2=document.createElementNS(ns,'defs');var clip2=document.createElementNS(ns,'clipPath');clip2.setAttribute('id','cp'+node.id);var circ2=document.createElementNS(ns,'circle');circ2.setAttribute('cx','12');circ2.setAttribute('cy','12');circ2.setAttribute('r','11');clip2.appendChild(circ2);defs2.appendChild(clip2);g.appendChild(defs2);var fimg=document.createElementNS(ns,'image');fimg.setAttribute('x',NW-27);fimg.setAttribute('y','3');fimg.setAttribute('width','24');fimg.setAttribute('height','24');fimg.setAttribute('href',node.foto);fimg.setAttribute('clip-path','url(#cp'+node.id+')');fimg.setAttribute('preserveAspectRatio','xMidYMid slice');g.appendChild(fimg);var cborder=document.createElementNS(ns,'circle');cborder.setAttribute('cx',NW-15);cborder.setAttribute('cy','15');cborder.setAttribute('r','11');cborder.setAttribute('fill','none');cborder.setAttribute('stroke',col);cborder.setAttribute('stroke-width','1.5');g.appendChild(cborder);}catch(e){}}
    nodeG.appendChild(g);
    if(!isColl)(node.c||[]).forEach(function(c){drawNode(c);});
  }
  TREE.ancestors.forEach(function(a){drawNode(a);});drawNode(TREE.sebil);mainG.appendChild(nodeG);applyTransform();
}

function applyTransform(){mainG.setAttribute('transform','translate('+vx+','+vy+') scale('+vk+')');}

svg.addEventListener('mousedown',function(e){if(e.button!==0)return;dragging=true;dragSX=e.clientX;dragSY=e.clientY;dragVX=vx;dragVY=vy;svg.style.cursor='grabbing';});
window.addEventListener('mousemove',function(e){if(!dragging)return;vx=dragVX+(e.clientX-dragSX);vy=dragVY+(e.clientY-dragSY);applyTransform();});
window.addEventListener('mouseup',function(){dragging=false;svg.style.cursor='grab';});
svg.addEventListener('wheel',function(e){e.preventDefault();var rect=svg.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;var f=e.deltaY<0?1.15:0.87,nk=Math.max(0.05,Math.min(3,vk*f));vx=mx-(mx-vx)*(nk/vk);vy=my-(my-vy)*(nk/vk);vk=nk;applyTransform();},{passive:false});
var lastTD=null,tSX=0,tSY=0,tVX=0,tVY=0,tPinchMid={x:0,y:0};
svg.addEventListener('touchstart',function(e){if(e.touches.length===1){dragging=true;tSX=e.touches[0].clientX;tSY=e.touches[0].clientY;tVX=vx;tVY=vy;lastTD=null;}else if(e.touches.length===2){dragging=false;var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;lastTD=Math.sqrt(dx*dx+dy*dy);var rect=svg.getBoundingClientRect();tPinchMid={x:(e.touches[0].clientX+e.touches[1].clientX)/2-rect.left,y:(e.touches[0].clientY+e.touches[1].clientY)/2-rect.top};tVX=vx;tVY=vy;}},{passive:true});
svg.addEventListener('touchmove',function(e){e.preventDefault();if(e.touches.length===1&&dragging){vx=tVX+(e.touches[0].clientX-tSX);vy=tVY+(e.touches[0].clientY-tSY);applyTransform();}else if(e.touches.length===2&&lastTD){var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY,dist=Math.sqrt(dx*dx+dy*dy),scale=dist/lastTD,nk=Math.max(0.05,Math.min(3,vk*scale));vx=tPinchMid.x-(tPinchMid.x-tVX)*(nk/vk);vy=tPinchMid.y-(tPinchMid.y-tVY)*(nk/vk);vk=nk;lastTD=dist;tVX=vx;tVY=vy;applyTransform();}},{passive:false});
svg.addEventListener('touchend',function(e){if(e.touches.length===0){dragging=false;lastTD=null;}else if(e.touches.length===1){dragging=true;tSX=e.touches[0].clientX;tSY=e.touches[0].clientY;tVX=vx;tVY=vy;lastTD=null;}},{passive:true});

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
  var h='';
  if(node.foto) h+='<div style="text-align:center;margin-bottom:10px"><img src="'+node.foto+'" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--green);box-shadow:0 4px 12px rgba(26,122,60,0.2)" alt="Foto '+node.n+'"></div>';
  h+='<div class="igb">'+gLabel(node.g)+'</div><div class="iname">'+node.n+'</div>';
  if(node.s) h+='<div class="isp">♥ Pasangan: <span>'+node.s+'</span></div>';
  if(node.note) h+='<div class="inote">📍 '+node.note+'</div>';
  h+='<div class="idv"></div>';
  h+='<div class="ir"><span class="l">Generasi</span><span class="v">'+gLabel(node.g)+'</span></div>';
  if(par){h+='<div class="ir"><span class="l">Orang Tua</span><span class="v">'+par.n+'</span></div>';var sibs=par.c||[],idx2=sibs.findIndex(function(c){return c.id===id;});if(idx2!==-1)h+='<div class="ir"><span class="l">Urutan Anak</span><span class="v">Ke-'+(idx2+1)+' dari '+sibs.length+'</span></div>';}
  h+='<div class="ir"><span class="l">Jumlah Anak</span><span class="v">'+kids.length+' orang</span></div>';
  if(node.w!==null&&node.w!==undefined&&node.g>=5) h+='<div class="ir"><span class="l">Cabang</span><span class="v" style="color:'+WCOL[node.w]+'">'+(window.TREE_WIVES||["Ma Jangkung","Ma Hideung","Ma Aeni"])[node.w]+'</span></div>';
  if(node.jk) h+='<div class="ir"><span class="l">Jenis Kelamin</span><span class="v">'+(node.jk==='L'?'Laki-laki':'Perempuan')+'</span></div>';
  if(node.tglLahir) h+='<div class="ir"><span class="l">Tanggal Lahir</span><span class="v">'+node.tglLahir+'</span></div>';
  if(node.tmptLahir) h+='<div class="ir"><span class="l">Tempat Lahir</span><span class="v">'+node.tmptLahir+'</span></div>';
  if(node.hp) h+='<div class="ir"><span class="l">HP/WA</span><span class="v">'+node.hp+'</span></div>';
  if(node.alamat) h+='<div class="ir"><span class="l">Alamat</span><span class="v">'+node.alamat+'</span></div>';
  if(kids.length>0){h+='<div class="idv"></div><div style="font-size:10px;color:var(--txt3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.4px">Anak-anak ('+kids.length+')</div><div class="icl">';kids.slice(0,15).forEach(function(c,i){h+='<div class="ici" onclick="navigateTo('+c.id+',true)">'+(i+1)+'. '+c.n+(c.s?' + '+c.s:'')+'</div>';});if(kids.length>15)h+='<div style="font-size:10px;color:var(--txt3);padding:3px 8px">...dan '+(kids.length-15)+' lainnya</div>';h+='</div>';}
  h+='<div class="idv"></div><div style="display:flex;gap:6px"><button onclick="openEditNode('+id+')" style="flex:1;background:var(--green-light);border:1.5px solid var(--green-mid);border-radius:8px;color:var(--green);padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">✏️ Update</button><button onclick="openAddChild('+id+')" style="flex:1;background:var(--yellow-light);border:1.5px solid rgba(245,197,24,0.4);border-radius:8px;color:#7a6000;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">➕ Tambah Anak</button></div>';
  if(isAdmin) h+='<div style="display:flex;gap:6px;margin-top:6px"><button onclick="moveNode('+id+')" style="flex:1;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;color:#1d4ed8;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">↔️ Pindahkan</button><button onclick="deleteNode('+id+')" style="flex:1;background:#fef2f2;border:1.5px solid #fecaca;border-radius:8px;color:#dc2626;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">🗑️ Hapus</button></div>';
  document.getElementById('ipc').innerHTML=h;
  document.getElementById('ip').classList.add('show');
  navigateTo(id,false);
}

function closeInfo(){document.getElementById('ip').classList.remove('show');hlId=null;layoutTree();render();}

function navigateTo(id,showPanel){
  var node=nodeMap[id];if(!node)return;
  var cur=node._parent;while(cur){collapsed.delete(cur.id);cur=cur._parent;}
  layoutTree();render();if(showPanel)showInfo(id);
  var pos=posMap[id];if(!pos)return;
  var w=svg.clientWidth,h=svg.clientHeight,tx=w/2-(pos.x+NW/2)*vk,ty=h/2-(pos.y+NH/2)*vk;
  var sx=vx,sy=vy,step=0;
  var anim=setInterval(function(){step++;var p=1-Math.pow(1-step/20,3);vx=sx+(tx-sx)*p;vy=sy+(ty-sy)*p;applyTransform();if(step>=20)clearInterval(anim);},16);
}

var stimer;
document.getElementById('si').addEventListener('input',function(){clearTimeout(stimer);stimer=setTimeout(function(){doSearch(document.getElementById('si').value);},180);});
document.getElementById('si').addEventListener('blur',function(){setTimeout(function(){document.getElementById('sr').classList.remove('show');},200);});
function doSearch(q){var res=document.getElementById('sr');if(!q||q.length<2){res.classList.remove('show');return;}q=q.toLowerCase();var hits=allNodes.filter(function(n){return n.n.toLowerCase().indexOf(q)>=0||(n.s&&n.s.toLowerCase().indexOf(q)>=0);}).slice(0,18);if(!hits.length){res.innerHTML='<div class="sri" style="color:var(--txt3)">Tidak ditemukan</div>';res.classList.add('show');return;}res.innerHTML=hits.map(function(n){return '<div class="sri" onclick="pickSearch('+n.id+')">'+n.n+(n.s?' <span style="color:var(--txt3)">+ '+n.s+'</span>':'')+'<span class="gb">'+gLabel(n.g)+'</span></div>';}).join('');res.classList.add('show');}
function pickSearch(id){document.getElementById('sr').classList.remove('show');document.getElementById('si').value=nodeMap[id].n;if(currentView!=='tree')setView('tree');navigateTo(id,true);}

function buildSidebar(){var bl=document.getElementById('bl');var h='<div class="bi" onclick="navigateTo('+TREE.sebil.id+',true)"><div class="bn"><div class="bd" style="background:#f59e0b"></div>Leluhur & Bapak Sebil</div><div class="bm">Rantai leluhur dari Raden Wirawangsa</div></div>';(TREE.sebil.c||[]).forEach(function(n){var col=nColor(n),dc=countDesc(n);h+='<div class="bi" id="bi'+n.id+'" onclick="focusBranch('+n.id+')"><div class="bn"><div class="bd" style="background:'+col+'"></div>'+n.n+'</div><div class="bm">'+(n.s?'+ '+n.s+' · ':'')+dc+' keturunan</div></div>';});bl.innerHTML=h;}
function countDesc(node){var c=0;var q=[].concat(node.c||[]);while(q.length){var n=q.shift();c++;q=q.concat(n.c||[]);}return c;}
function focusBranch(id){document.querySelectorAll('.bi').forEach(function(el){el.classList.remove('on');});var el=document.getElementById('bi'+id);if(el)el.classList.add('on');collapsed.delete(id);layoutTree();render();navigateTo(id,true);if(window.innerWidth<=768)toggleSide();}
function toggleSide(){sideOpen=!sideOpen;document.getElementById('side').classList.toggle('off',!sideOpen);}

function buildListView(){var byGen={};allNodes.forEach(function(n){if(!byGen[n.g])byGen[n.g]=[];byGen[n.g].push(n);});var h='';Object.keys(byGen).sort(function(a,b){return +a-+b;}).forEach(function(g){var list=byGen[g];h+='<div class="lgs"><div class="lgt">'+gLabel(+g)+' <span class="lgc">'+list.length+' orang</span></div><div class="lgr">'+list.map(function(n){return '<div class="lc" onclick="pickList('+n.id+')"><div class="lcn">'+n.n+'</div>'+(n.s?'<div class="lcs">♥ '+n.s+'</div>':'')+'</div>';}).join('')+'</div></div>';});document.getElementById('lv').innerHTML=h;}
function pickList(id){setView('tree');setTimeout(function(){navigateTo(id,true);},80);}
function setView(v){currentView=v;document.getElementById('cwrap').style.display=v==='tree'?'block':'none';document.getElementById('lv').classList.toggle('show',v==='list');document.getElementById('btree').classList.toggle('on',v==='tree');document.getElementById('blist').classList.toggle('on',v==='list');}

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
function buildRelInfo(d1,d2,lcaNode){
  var n1=relNode1.n,n2=relNode2.n,lcaN=lcaNode.n,rel='',sen='',desc='',path='';
  if(d1===0&&d2===0)return{rel:'Orang yang sama',sen:'',desc:'',path:''};
  if(d1===0){rel=descLabel(d2);desc=n1+' adalah '+ancLabel(d2)+' dari '+n2;sen=n1+' adalah '+ancLabel(d2)+' dari '+n2+'. '+n2+' wajib menghormati '+n1;path=n2+' adalah '+rel+' dari '+n1;}
  else if(d2===0){rel=descLabel(d1);desc=n2+' adalah '+ancLabel(d1)+' dari '+n1;sen=n2+' adalah '+ancLabel(d1)+' dari '+n1+'. '+n1+' wajib menghormati '+n2;path=n1+' adalah '+rel+' dari '+n2;}
  else if(d1===1&&d2===1){rel='Saudara Kandung';desc=n1+' dan '+n2+' adalah saudara kandung';path='Orang tua bersama: '+lcaN;var par=relNode1._parent;if(par&&par.id===(relNode2._parent&&relNode2._parent.id)){var sibs=par.c||[],i1=sibs.findIndex(function(c){return c.id===relNode1.id;}),i2=sibs.findIndex(function(c){return c.id===relNode2.id;});if(i1!==-1&&i2!==-1&&i1!==i2){var older=i1<i2?n1:n2,younger=i1<i2?n2:n1,oi=Math.min(i1,i2),yi=Math.max(i1,i2);sen=older+' lebih tua (anak ke-'+(oi+1)+'). '+younger+' (anak ke-'+(yi+1)+') memanggil: Kang/Aa/Teh/Neng';}else sen='Saudara kandung - urutan berdasarkan posisi di pohon (kiri = lebih tua)';}else sen='Saudara kandung - urutan berdasarkan posisi di pohon';}
  else if((d1===1&&d2===2)||(d1===2&&d2===1)){var unc=d1<d2?n1:n2,nep=d1<d2?n2:n1;rel='Paman/Bibi - Keponakan';desc=unc+' adalah paman/bibi dari '+nep;sen=unc+' adalah paman/bibi. '+nep+' memanggil: Paman/Om/Ua/Mamang (L) atau Bibi/Tante/Ante (P)';path='Kakek/nenek bersama: '+lcaN;}
  else{var minD=Math.min(d1,d2),diff=Math.abs(d1-d2),lvl=minD-1;var sLbls=['','Sepupu 1x','Sepupu 2x','Sepupu 3x','Sepupu 4x','Sepupu 5x','Sepupu 6x'];var gLbls=['','satu','dua','tiga','empat','lima'];var base=sLbls[lvl]||('Sepupu '+lvl+'x');if(diff===0){rel=base;desc=n1+' dan '+n2+' adalah '+rel+' (setingkat generasi)';var a1x=getAncAtLCA(relNode1,lcaNode.id),a2x=getAncAtLCA(relNode2,lcaNode.id);if(a1x&&a2x&&a1x.id!==a2x.id){var lcaKids=lcaNode.c||[],p1=lcaKids.findIndex(function(c){return c.id===a1x.id;}),p2=lcaKids.findIndex(function(c){return c.id===a2x.id;});if(p1!==-1&&p2!==-1){var olderN=p1<p2?n1:n2,youngerN=p1<p2?n2:n1,op=Math.min(p1,p2),yp=Math.max(p1,p2),oa=p1<p2?a1x.n:a2x.n,ya=p1<p2?a2x.n:a1x.n;sen=olderN+' adalah KAKAK SEPUPU (leluhurnya "'+oa+'" adalah anak ke-'+(op+1)+' dari '+lcaN+'). '+youngerN+' adalah ADIK SEPUPU (leluhurnya "'+ya+'" adalah anak ke-'+(yp+1)+' dari '+lcaN+'). '+youngerN+' memanggil '+olderN+' dengan: Kang/Aa/Teh/Neng Sepupu';}else sen='Sepupu setingkat - urutan berdasarkan posisi anak di pohon (kiri = lebih tua)';}else sen='Sepupu setingkat - urutan berdasarkan posisi anak di pohon';}else{rel=base+' beda '+(gLbls[diff]||diff)+' generasi';desc=n1+' dan '+n2+' adalah '+rel;var olderN2=d1<d2?n1:n2,youngerN2=d1<d2?n2:n1;sen=olderN2+' lebih tua '+diff+' generasi - harus dituakan. Dalam adat, '+youngerN2+' memanggil '+olderN2+' dengan sebutan yang lebih hormat';}path='Leluhur bersama: '+lcaN+' ('+d1+' generasi dari '+n1+', '+d2+' generasi dari '+n2+')';}
  return{rel:rel,sen:sen,desc:desc,path:path};
}
function calcRelation(){if(!relNode1||!relNode2){showToast('Pilih dua orang terlebih dahulu');return;}if(relNode1.id===relNode2.id){showResult('Orang yang sama','','Anda memilih orang yang sama','');return;}var lcas=findLCAs(relNode1,relNode2);if(!lcas.length){showResult('Tidak ada hubungan','','Kedua orang tidak memiliki leluhur yang sama','');return;}var info=buildRelInfo(lcas[0].d1,lcas[0].d2,lcas[0].lca);var extraPath=info.path;if(lcas.length>1){extraPath+=' | ADA PERNIKAHAN DALAM KELUARGA - Ada '+lcas.length+' jalur hubungan: ';lcas.forEach(function(lca,i){var r=buildRelInfo(lca.d1,lca.d2,lca.lca);extraPath+=(i+1)+'. '+r.rel+' (via '+lca.lca.n+', jarak '+lca.d1+'+'+lca.d2+'='+lca.total+')'+(i===0?' - TERDEKAT':'')+'. ';});extraPath+='Hubungan nomor 1 adalah yang paling relevan.';}showResult(info.rel+(lcas.length>1?' (terdekat)':''),info.sen,info.desc,extraPath);}
function showResult(main,sen,desc,path){document.getElementById('rel-main').textContent=main;var senEl=document.getElementById('rel-seniority');senEl.textContent=sen;senEl.style.display=sen?'block':'none';document.getElementById('rel-desc').textContent=desc;document.getElementById('rel-path').textContent=path;document.getElementById('relresult').classList.add('show');}

// Refresh tree data from Supabase
function refreshTree(){
  // Clear cache dan reload dari server
  try{ localStorage.removeItem(CACHE_KEY); }catch(e){}
  allNodes=[];nodeMap={};posMap={};collapsed=new Set();hlId=null;maxGen=0;
  showToast('Memuat ulang data dari server...');
  loadTreeData();
}

var toastTimer;
function showToast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},2800);}

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeInfo();closeModal();var rb=document.getElementById('relbox');if(rb&&rb.classList.contains('show'))toggleRelCalc();closeAdminPanel();}
  if(!e.target.matches('input')&&!e.target.matches('textarea')){if(e.key==='+'||e.key==='=')zoomIn();if(e.key==='-')zoomOut();if(e.key==='r'||e.key==='R')resetView();}
});
svg.addEventListener('click',function(e){if(e.target===svg||e.target.tagName==='rect')closeInfo();});
document.getElementById('editModal').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.getElementById('adminModal').addEventListener('click',function(e){if(e.target===this)closeAdminPanel();});

// ── INIT ──────────────────────────────────────────────────
// Load data dari Supabase via API (bukan dari tree.js)
function initApp(treeData){
  // Set global TREE so all existing code works (layoutTree, render, buildSidebar, etc)
  window.TREE = treeData;
  window.TREE_WIVES = treeData.wives || ['Ma Jangkung','Ma Hideung','Ma Aeni'];
  // Build index dari data API
  treeData.ancestors.forEach(function(a){buildIndex(a,null);});
  buildIndex(treeData.sebil,null);
  // Collapse all by default
  allNodes.forEach(function(n){if((n.c||[]).length>0)collapsed.add(n.id);});
  treeData.ancestors.forEach(function(a){collapsed.delete(a.id);});
  collapsed.delete(treeData.sebil.id);
  layoutTree();render();buildSidebar();buildListView();
  document.getElementById('stot').textContent=allNodes.length.toLocaleString('id');
  document.getElementById('sgen').textContent=maxGen+1;
  setTimeout(resetView,100);
  if(sessionStorage.getItem('ikbas_auth')==='admin') initAdminMode();
  if(window.innerWidth<=768){var lc=document.getElementById('legContent'),lt=document.getElementById('legToggle');if(lc&&lt){lc.style.display='none';lt.textContent='▼';}sideOpen=false;document.getElementById('side').classList.add('off');}
  showToast('Selamat datang di Silsilah IKBAS!');
}

// Load tree data — dengan localStorage cache untuk loading instan
var CACHE_KEY = 'ikbas_tree_cache';
var CACHE_TTL = 30 * 60 * 1000; // 30 menit

function loadTreeData(){
  var loadingEl = document.getElementById('app-loading');

  // Cek prefetched data dulu (paling cepat — sudah di-fetch saat landing page)
  if(window._prefetchedTree){
    if(loadingEl) loadingEl.style.display='none';
    window.TREE = window._prefetchedTree;
    initApp(window._prefetchedTree);
    window._prefetchedTree = null;
    fetchAndCacheTree(false); // update cache di background
    return;
  }

  // Cek cache di localStorage
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if(cached){
      var parsed = JSON.parse(cached);
      var age = Date.now() - (parsed.ts || 0);
      if(age < CACHE_TTL && parsed.data && parsed.data.sebil){
        // Cache valid — tampil instan, TIDAK perlu loading
        if(loadingEl) loadingEl.style.display='none';
        window.TREE = parsed.data;
        initApp(parsed.data);
        fetchAndCacheTree(false); // update di background
        return;
      }
    }
  } catch(e){}

  // Tidak ada cache valid — fetch dari server (tampilkan loading)
  if(loadingEl) loadingEl.style.display='flex';
  fetchAndCacheTree(true);
}

function fetchAndCacheTree(showLoading){
  var loadingEl = document.getElementById('app-loading');
  fetch('/api/tree')
    .then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(function(d){
      if(loadingEl && showLoading) loadingEl.style.display='none';
      if(d.success && d.data && d.data.sebil){
        // Simpan ke cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ts: Date.now(), data: d.data}));
        } catch(e){}
        if(showLoading){
          if(loadingEl) loadingEl.style.display='none';
          window.TREE = d.data;
          initApp(d.data);
        } else {
          // Background update — hanya re-render jika jumlah data berubah
          if(d.data.total && d.data.total !== allNodes.length){
            window.TREE = d.data;
            allNodes=[]; nodeMap={}; posMap={}; collapsed=new Set(); hlId=null; maxGen=0;
            initApp(d.data);
            showToast('Data diperbarui dari server');
          }
        }
      } else {
        throw new Error(d.error||'Gagal load data');
      }
    })
    .catch(function(e){
      if(loadingEl && showLoading){
        loadingEl.style.display='none';
        document.getElementById('app').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;background:var(--bg)"><div style="font-size:40px">❌</div><div style="font-size:16px;font-weight:700;color:#dc2626">Gagal memuat data silsilah</div><div style="font-size:12px;color:#6b7280;text-align:center;max-width:300px">'+e.message+'</div><button onclick="location.reload()" style="background:#1a7a3c;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;margin-top:8px">🔄 Coba Lagi</button></div>';
      }
      console.error('fetchAndCacheTree error:', e);
    });
}

// Pre-fetch tree data di background saat halaman dibuka
// Sehingga saat user login, data sudah siap
(function(){
  // Mulai fetch di background segera (sebelum login)
  var cached = null;
  try {
    var c = localStorage.getItem(CACHE_KEY);
    if(c){ var p = JSON.parse(c); if(Date.now() - (p.ts||0) < CACHE_TTL) cached = p.data; }
  } catch(e){}

  if(!cached){
    // Tidak ada cache — pre-fetch di background
    fetch('/api/tree')
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.success && d.data){
          try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(), data:d.data})); }catch(e){}
          window._prefetchedTree = d.data;
        }
      })
      .catch(function(){});
  } else {
    // Ada cache — simpan untuk dipakai langsung
    window._prefetchedTree = cached;
  }

  // Auto-login jika sudah pernah login
  var s = sessionStorage.getItem('ikbas_auth');
  if(s==='admin'||s==='user'){
    isAdmin = (s==='admin');
    document.getElementById('landing').style.display='none';
    document.getElementById('app').classList.add('visible');
    if(isAdmin) initAdminMode();
    loadTreeData();
  }
})();