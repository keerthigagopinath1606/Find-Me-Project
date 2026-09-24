/* FIND-ME V13 — Investigation Intelligence + Explainable AI + Motion UI */
(function () {
  const app = window.findMeApp;
  if (!app) return;
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pct = (v) => v == null || v === '' ? '—' : `${Number(v).toFixed(2)}%`;
  const tokenFetch = async (url, options={}) => { const res=await fetch(url,options); const data=await res.json().catch(()=>({})); if(!res.ok||data.success===false) throw new Error(data.message||'Request failed.'); return data; };
  const toast=(m,t='success')=>app.showToast?app.showToast(m,t):alert(m);

  function modalShell(){
    document.getElementById('findme-v11-modal')?.remove();
    const el=document.createElement('div');
    el.id='findme-v11-modal';
    el.innerHTML=`
      <div class="fmv11-backdrop"></div>
      <section class="fmv11-shell" role="dialog" aria-modal="true"
        aria-label="Find-Me Advanced Investigation Intelligence">

        <header class="fmv11-header fmv12-hero">
          <div>
            <div class="fmv11-eyebrow">FIND-ME V18</div>
            <h1>🧠 Advanced Investigation Intelligence</h1>
            <p>Evidence-led investigation workspace — AI recommends, authorized officers decide.</p>
          </div>
          <button class="fmv11-close" id="fmv11-close" aria-label="Close">×</button>
        </header>

        <nav class="fmv18-main-tabs" aria-label="Investigation sections">
          <button class="active" data-main-tab="investigation">🔎 Investigation</button>
          <button data-main-tab="cctv">📹 CCTV & Movement</button>
          <button data-main-tab="security">🛡️ Security & AI</button>
        </nav>

        <main class="fmv11-body">

          <section class="fmv18-main-panel" data-main-panel="investigation">
            <div class="fmv18-subnav">
              <button class="active" data-tab="workspace">Case Investigation</button>
              <button data-tab="candidates">Candidate Comparison</button>
            </div>

            <div class="fmv11-tab" data-panel="workspace">
              <div class="fmv11-toolbar">
                <label>Case <select id="fmv11-case"></select></label>
                <button id="fmv11-refresh">↻ Refresh</button>
              </div>
              <div id="fmv11-workspace-content">
                <div class="fmv11-empty">Select a case to load investigation intelligence.</div>
              </div>
            </div>

            <div class="fmv11-tab" data-panel="candidates" hidden>
              <div class="fmv11-toolbar">
                <label>Video Search <select id="fmv11-search"></select></label>
                <button id="fmv11-compare">Compare</button>
              </div>
              <div id="fmv11-candidates-content">
                <div class="fmv11-empty">Select a video search.</div>
              </div>
            </div>
          </section>

          <section class="fmv18-main-panel" data-main-panel="cctv" hidden>
            <div class="fmv18-subnav">
              <button class="active" data-tab="cameras">CCTV Network</button>
            </div>
            <div class="fmv11-tab" data-panel="cameras">
              <div class="fmv11-section-head">
                <div>
                  <h2>📡 CCTV Camera Network</h2>
                  <p>Camera registry used for contextual search and movement reconstruction.</p>
                </div>
                <button id="fmv11-add-camera">+ Add Camera</button>
              </div>
              <div id="fmv11-cameras-content"></div>
            </div>
          </section>

          <section class="fmv18-main-panel" data-main-panel="security" hidden>
            <div class="fmv18-subnav">
              <button class="active" data-tab="security">Security & Privacy</button>
              <button data-tab="evaluation">AI Evaluation</button>
            </div>

            <div class="fmv11-tab" data-panel="security">
              <div id="fmv11-security-content"></div>
            </div>

            <div class="fmv11-tab" data-panel="evaluation" hidden>
              <div id="fmv11-evaluation-content"></div>
            </div>
          </section>

        </main>
      </section>`;

    document.body.appendChild(el);

    el.querySelector('#fmv11-close').onclick=()=>el.remove();
    el.querySelector('.fmv11-backdrop').onclick=()=>el.remove();

    el.querySelectorAll('[data-main-tab]').forEach(btn=>{
      btn.onclick=()=>switchMainTab(btn.dataset.mainTab);
    });

    el.querySelectorAll('[data-tab]').forEach(btn=>{
      btn.onclick=()=>switchSubTab(btn.dataset.tab);
    });

    requestAnimationFrame(()=>{
      el.classList.add('fmv18-modal-enter');
    });

    return el;
  }

  function switchMainTab(group){
    const root=document.getElementById('findme-v11-modal');
    if(!root)return;

    root.querySelectorAll('[data-main-tab]').forEach(x=>{
      x.classList.toggle('active',x.dataset.mainTab===group);
    });

    root.querySelectorAll('[data-main-panel]').forEach(x=>{
      x.hidden=x.dataset.mainPanel!==group;
    });

    const first = root.querySelector(
      `[data-main-panel="${group}"] [data-tab]`
    );
    if(first) switchSubTab(first.dataset.tab);
  }

  function switchSubTab(tab){
    const root=document.getElementById('findme-v11-modal');
    if(!root)return;

    const panel = root.querySelector(`[data-panel="${tab}"]`);
    const group = panel?.closest('[data-main-panel]');

    if(group){
      root.querySelectorAll(
        `[data-main-panel="${group.dataset.mainPanel}"] [data-tab]`
      ).forEach(x=>{
        x.classList.toggle('active',x.dataset.tab===tab);
      });

      group.querySelectorAll('.fmv11-tab').forEach(x=>{
        x.hidden=x.dataset.panel!==tab;
      });
    }

    if(tab==='cameras')loadCameras();
    if(tab==='security')loadSecurity();
    if(tab==='evaluation')loadEvaluation();

    const visible = panel?.querySelector(
      '.fmv11-card,.fmv11-camera,.fmv11-kpis,.fmv11-section-head'
    );
    if(visible){
      visible.classList.remove('fmv18-subpanel-enter');
      void visible.offsetWidth;
      visible.classList.add('fmv18-subpanel-enter');
    }
  }

  async function loadCases(preferredCaseId){const root=document.getElementById('findme-v11-modal');if(!root)return;const select=root.querySelector('#fmv11-case');try{const data=await tokenFetch('/api/v11/case-index');const cases=data.cases||[];select.innerHTML=cases.map(c=>{const activity=c.has_ai_activity?` · 🧠 ${c.ai_observations} obs · ${c.ai_searches} search${c.ai_searches===1?'':'es'}`:'';const priority=c.priority?`#${c.priority} `:'';return `<option value="${esc(c.complaint_id)}">${priority}${esc(c.complaint_id)} — ${esc(c.name)}${activity}</option>`;}).join('') || '<option value="">No cases available</option>';const preferred=preferredCaseId&&cases.some(c=>c.complaint_id===preferredCaseId)?preferredCaseId:(cases[0]?.complaint_id||'');if(preferred)select.value=preferred;if(preferred)await loadWorkspace(preferred);}catch(e){select.innerHTML='<option>Unable to load cases</option>';}select.onchange=()=>loadWorkspace(select.value);root.querySelector('#fmv11-refresh').onclick=()=>loadWorkspace(select.value);}
  async function loadWorkspace(caseId){const box=document.querySelector('#fmv11-workspace-content');if(!box||!caseId)return;box.innerHTML='<div class="fmv11-loading fmv12-processing">🧠 Reconstructing investigation workspace…</div>';try{const d=await tokenFetch(`/api/v11/investigation/${encodeURIComponent(caseId)}`);renderWorkspace(box,d.workspace);loadSearches();}catch(e){box.innerHTML=`<div class="fmv11-error">${esc(e.message)}</div>`;}}
  function scoreBar(label,value,extra=''){const n=Math.max(0,Math.min(100,Number(value||0)));return `<div class="fmv11-score"><div><span>${esc(label)}</span><strong>${pct(value)}</strong></div><div class="fmv11-track"><i style="width:${n}%;--fmv12-target:${n}%"></i></div>${extra?`<small class="fmv12-score-note">${esc(extra)}</small>`:''}</div>`;}
  function explainAge(bd){const age=bd?.estimated_video_age;const score=bd?.age_compatibility;if(age==null)return 'Age model unavailable or not reliable; age clue is neutral/supporting only.';return `AI estimated age ${Number(age).toFixed(0)} years. This is an uncertain CCTV estimate; age is supporting evidence only (compatibility ${pct(score)}).`;}
  function renderWorkspace(box,w){
    const p=w.person,movement=w.movement||[],matches=w.matches||[],obs=w.observations||[],evidence=w.evidence||[],alerts=w.alerts||[];
    const best=[...matches].sort((a,b)=>(b.overall_score||0)-(a.overall_score||0))[0];
    const bestObs=[...obs].sort((a,b)=>(b.overall_score||0)-(a.overall_score||0))[0];
    const bd=best?.breakdown||bestObs?.analysis||{};
    const bestEvidence=best?.evidence||bestObs?.evidence;
    box.innerHTML=`
      <div class="fmv11-kpis fmv12-reveal"><div><small>Case</small><b>${esc(w.case.complaint_id)}</b></div><div><small>AI observations</small><b>${obs.length}</b></div><div><small>Evidence files</small><b>${evidence.length}</b></div><div><small>Alerts</small><b>${alerts.length}</b></div></div>
      <article class="fmv11-card fmv19-history-card">
        <div class="fmv11-section-head"><div><h2>🕘 AI Investigation History</h2><p>Saved AI searches remain available after the AI Identification window is closed. Each row represents one video investigation, not a confirmed identity.</p></div></div>
        <div class="fmv19-history-list">${(()=>{const groups={};obs.forEach(o=>{const k=o.search_id||'Unknown search';(groups[k]??=[]).push(o);});matches.forEach(m=>{const k=m.search_id||'Unknown search';(groups[k]??=[]);});const rows=Object.entries(groups);return rows.length?rows.slice(0,20).map(([sid,items])=>{const bestItem=[...items].sort((a,b)=>(b.overall_score||0)-(a.overall_score||0))[0];const m=matches.find(x=>x.search_id===sid);const score=bestItem?.overall_score??m?.overall_score;const face=bestItem?.face_score??m?.face_score;const searchInfo=bestItem?.search_id||sid;return `<div class="fmv19-history-row"><div class="fmv19-history-main"><strong>${esc(searchInfo)}</strong><span>${esc(bestItem?.analysis?.camera_location||m?.camera_location||'CCTV investigation')} · ${items.length} observation${items.length===1?'':'s'}</span></div><div class="fmv19-history-metrics"><b>Face ${pct(face)}</b><b>Overall ${pct(score)}</b><span>${bestItem?.passed_gate||m?'🟡 Officer review':'🟠 Analyzed candidate'}</span></div><button type="button" data-history-search="${esc(sid)}">View details</button></div>`;}).join(''):'<div class="fmv11-empty">No saved AI investigation is linked to this case yet.</div>';})()}</div>
      </article>
      <div class="fmv11-grid2"><article class="fmv11-card fmv12-card"><h2>👤 Person Profile</h2><div class="fmv11-profile"><div><b>${esc(p.name)}</b><span>${esc(p.id)}</span></div><div>Last seen: <strong>${esc(p.last_seen_location||'—')}</strong></div><div>${esc(p.last_seen_date||'')} ${esc(p.last_seen_time||'')}</div><div>Clothing: ${esc(p.clothing||'—')}</div><div>Accessories: ${esc(p.accessories||'—')}</div><div>Privacy: <span class="fmv11-badge">${esc(p.privacy_level||'RESTRICTED')}</span></div></div><div class="fmv11-actions"><button id="fmv11-appearance-btn">+ Appearance / Sighting Note</button></div></article>
      <article class="fmv11-card fmv12-card"><h2>🧠 Best AI Evidence</h2>${bestObs||best?`${scoreBar('Face similarity',best?.face_score??bestObs.face_score,`Face clue — not identity proof`)}${scoreBar('Face quality',bestObs?.face_quality_score??bd.face_quality?.score,`Quality affects how much confidence an officer should place in the frame`)}${scoreBar('Clothing',best?.clothing_score??bestObs.clothing_score,`Supporting appearance clue`)}${scoreBar('Age compatibility',best?.age_score??bestObs.age_score,explainAge(bd))}${scoreBar('Location relevance',best?.location_score??bestObs.location_score,bd.location_context||'Movement context; different location is not automatic rejection')}${scoreBar('Time relevance',best?.time_score??bestObs.time_score,'Context clue')}${scoreBar('Overall candidate score',best?.overall_score??bestObs.overall_score,'Combined ranking score')}
      <div class="fmv12-explain"><b>🔎 Why did the AI give this result?</b><p>${esc(bd.location_context||'The candidate was selected because it had the strongest combined evidence among analyzed candidates.')}</p><p>${esc(bd.clothing_context||'Clothing is supporting evidence only; clothing can change.')}</p><p>${esc(explainAge(bd))}</p><p><strong>Human review:</strong> the AI recommends a candidate; it does not confirm identity.</p></div>`:'<div class="fmv11-empty">No AI candidate has been recorded for this case yet.</div>'}</article></div>
      <article class="fmv11-card fmv19-how"><h2>🧭 How CCTV Movement Is Calculated</h2><div class="fmv19-how-grid"><div><span>1</span><b>Last-known location</b><small>Registered case location and time.</small></div><div><span>2</span><b>CCTV observation</b><small>Camera location, capture date/time and video-relative frame time.</small></div><div><span>3</span><b>Distance context</b><small>Known city coordinates use the Haversine distance formula.</small></div><div><span>4</span><b>Location relevance</b><small>Distance contributes to the 15% location clue; it does not prove a route.</small></div></div><div class="fmv19-disclaimer">⚠️ <b>Important:</b> Find-Me currently reconstructs evidence from known locations and grouped CCTV observations. It does <b>not</b> claim to track a person's continuous route between cameras.</div></article>
      <article class="fmv11-card fmv12-card"><div class="fmv11-section-head"><div><h2>🗺️ Movement Reconstruction</h2><p>Grouped by CCTV search so several frames from one video do not look like separate real-world sightings.</p></div></div><div class="fmv11-timeline">${movement.length?movement.map((m,i)=>`<div class="fmv11-event fmv12-event"><span>${i+1}</span><div><b>${esc(m.source)}</b><strong>${esc(m.location||'Location unavailable')}</strong><small>${esc(m.date||'')} ${esc(m.time||'')}${m.score!=null?` · Best AI ${pct(m.score)}`:''}</small>${m.description?`<p>${esc(m.description)}</p>`:''}${m.observations?.length?`<div class="fmv12-mini-observations">${m.observations.slice(0,6).map(o=>`<span>Frame ${o.frame} · ${Number(o.timestamp_seconds||0).toFixed(1)}s · ${pct(o.overall_score)}</span>`).join('')}</div>`:''}</div></div>`).join(''):'<div class="fmv11-empty">No movement events recorded.</div>'}</div></article>
      <article class="fmv11-card fmv12-card"><div class="fmv11-section-head"><div><h2>📸 Evidence Gallery</h2><p>Persistent evidence from the strongest analyzed candidate observation, including below-gate candidates.</p></div></div><div class="fmv11-gallery">${evidence.length?evidence.slice(0,24).map(e=>`<figure class="fmv12-evidence"><img src="${esc(e.path||'')}" alt="Evidence"><figcaption><b>${esc(e.type)}</b><small>${esc(e.integrity_status||'UNKNOWN')} · ${esc(e.sha256||'hash pending')}</small><small>${esc(e.notes||'')}</small><button data-verify-evidence="${e.id}">Verify integrity</button></figcaption></figure>`).join(''):'<div class="fmv11-empty">No persistent evidence files recorded yet.</div>'}</div></article>
      <article class="fmv11-card fmv12-card"><h2>👀 Observation History</h2><p class="fmv12-help">Each card is one analyzed video frame. Multiple cards can belong to one candidate and one CCTV search.</p><div class="fmv11-observations">${obs.length?obs.slice(-40).reverse().map(o=>{const a=o.analysis||{};return `<div class="fmv11-observation fmv12-observation"><b>${esc(o.search_id)}</b><span>Frame ${esc(o.frame)} · ${Number(o.timestamp_seconds||0).toFixed(1)}s</span>${scoreBar('Overall',o.overall_score)}<small>Face ${pct(o.face_score)} · Quality ${pct(o.face_quality_score)} · ${o.passed_gate?'🟢 Gate passed':'🟡 Below gate'}</small>${a.estimated_video_age!=null?`<small>AI age estimate: ${Number(a.estimated_video_age).toFixed(0)} years · uncertain CCTV clue</small>`:''}</div>`}).join(''):'<div class="fmv11-empty">No candidate observations recorded.</div>'}</div></article>
      <article class="fmv11-card fmv12-card"><h2>🔐 Human Review & Alert State</h2><div class="fmv12-human">AI recommends. <strong>Officer decides.</strong></div>${alerts.length?alerts.map(a=>`<div class="fmv11-alert-row"><b>${esc(a.alert_id)}</b><span>${esc(a.severity)} · ${esc(a.status)}</span><strong>${pct(a.overall_score)}</strong></div>`).join(''):'<div class="fmv11-note">No emergency alert generated for this case because the analyzed candidate evidence did not cross the configured gate.</div>'}</article>`;
    box.querySelectorAll('[data-history-search]').forEach(btn=>btn.onclick=()=>{const searchId=btn.dataset.historySearch;const sub=document.querySelector('#fmv11-search');if(sub){sub.value=searchId;switchMainTab('investigation');switchSubTab('candidates');document.querySelector('#fmv11-compare')?.click();}});
    box.querySelectorAll('[data-verify-evidence]').forEach(btn=>btn.onclick=async()=>{try{const d=await tokenFetch(`/api/v11/evidence/${btn.dataset.verifyEvidence}/verify`,{method:'POST'});toast(`Evidence integrity: ${d.status}`,d.verified?'success':'error');loadWorkspace(w.case.complaint_id);}catch(e){toast(e.message,'error');}});
    box.querySelector('#fmv11-appearance-btn').onclick=()=>addAppearance(w.case.complaint_id);
  }
  async function addAppearance(caseId){const clothing=prompt('Observed clothing / appearance:','');if(clothing===null)return;const accessories=prompt('Accessories (backpack, cap, glasses, etc.):','');const location=prompt('Observation location:','');try{await tokenFetch(`/api/v11/appearance/${encodeURIComponent(caseId)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clothing,accessories,location,source:'Officer observation'})});toast('Appearance history updated.');loadWorkspace(caseId);}catch(e){toast(e.message,'error');}}
  async function loadSearches(){const root=document.getElementById('findme-v11-modal');if(!root)return;try{const d=await tokenFetch('/api/v11/video-searches');const searches=d.searches||[];const select=root.querySelector('#fmv11-search');select.innerHTML=searches.length?searches.map(x=>`<option value="${esc(x.search_id||x.id)}">${esc(x.search_id||x.id)}</option>`).join(''):'<option value="">Recent searches appear after an AI run</option>';}catch(e){}root.querySelector('#fmv11-compare').onclick=async()=>{const id=root.querySelector('#fmv11-search').value;if(!id)return;const box=root.querySelector('#fmv11-candidates-content');box.innerHTML='<div class="fmv11-loading fmv12-processing">🔎 Comparing candidates…</div>';try{const d=await tokenFetch(`/api/v11/candidate-compare?search_id=${encodeURIComponent(id)}`);renderCandidates(box,d.candidates||[]);}catch(e){box.innerHTML=`<div class="fmv11-error">${esc(e.message)}</div>`;}};}
  function renderCandidates(box,rows){if(!rows.length){box.innerHTML='<div class="fmv11-empty">No candidate comparison data for this search.</div>';return;}box.innerHTML=`<div class="fmv12-legend"><b>How to read this:</b> Face is the primary clue. Clothing, age, location and time are supporting context. A high score still requires officer review.</div><div class="fmv11-compare-table"><div class="fmv11-compare-head"><b>Candidate</b><b>Face</b><b>Clothing</b><b>Age</b><b>Location</b><b>Time</b><b>Overall</b><b>Observations</b></div>${rows.map(r=>`<div class="fmv11-compare-row"><strong>${esc(r.name)}</strong><span>${pct(r.face_score)}</span><span>${pct(r.clothing_score)}</span><span>${pct(r.age_score)}</span><span>${pct(r.location_score)}</span><span>${pct(r.time_score)}</span><strong>${pct(r.overall_score)}</strong><span>${esc(r.observations)}</span></div>`).join('')}</div>`;}
  async function loadCameras(){const box=document.querySelector('#fmv11-cameras-content');if(!box)return;box.innerHTML='<div class="fmv11-loading fmv12-processing">📡 Loading camera network…</div>';try{const d=await tokenFetch('/api/v11/cameras');box.innerHTML=`<div class="fmv11-camera-grid">${(d.cameras||[]).map(c=>`<div class="fmv11-camera fmv12-card"><div><b>${esc(c.camera_id)}</b><span class="fmv11-online">${esc(c.status)}</span></div><h3>${esc(c.name)}</h3><p>${esc(c.location)}</p><small>${esc(c.zone||'')} · ${esc(c.source_type||'')}</small><div class="fmv11-coords">${c.latitude??'—'}, ${c.longitude??'—'}</div></div>`).join('')}</div>`;}catch(e){box.innerHTML=`<div class="fmv11-error">${esc(e.message)}</div>`;}document.querySelector('#fmv11-add-camera').onclick=async()=>{const name=prompt('Camera name:','New CCTV Camera');if(!name)return;const location=prompt('Location:','');if(!location)return;try{await tokenFetch('/api/v11/cameras',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,location})});toast('Camera added.');loadCameras();}catch(e){toast(e.message,'error');}};}
  async function loadSecurity(){const box=document.querySelector('#fmv11-security-content');if(!box)return;box.innerHTML='<div class="fmv11-loading fmv12-processing">🔐 Loading security center…</div>';try{const d=await tokenFetch('/api/v11/security-center');const s=d.security;box.innerHTML=`<div class="fmv11-section-head"><div><h2>🔐 Security & Privacy Center</h2><p>Operational controls and evidence-access visibility.</p></div></div><div class="fmv11-kpis"><div><small>Evidence</small><b>${s.evidence_integrity.total}</b></div><div><small>Integrity verified</small><b>${s.evidence_integrity.verified}</b></div><div><small>Integrity failed</small><b>${s.evidence_integrity.failed}</b></div><div><small>Audit events shown</small><b>${s.audit_logs.length}</b></div></div><div class="fmv11-security-grid">${s.controls.map(c=>`<div><b>✓ ${esc(c.name)}</b><span>${esc(c.status)}</span></div>`).join('')}</div><h3>Recent Audit Trail</h3><div class="fmv11-audit">${s.audit_logs.slice(0,30).map(x=>`<div><b>${esc(x.action)}</b><span>${esc(x.description||'')}</span><small>${esc(x.created_at||'')} · ${esc(x.ip||'')}</small></div>`).join('')}</div><div class="fmv11-privacy"><b>Privacy-by-design rules</b><p>Evidence is intended for authorized officer access, sensitive actions are logged, and AI output remains a candidate recommendation rather than an identity confirmation.</p></div>`;}catch(e){box.innerHTML=`<div class="fmv11-error">${esc(e.message)}</div>`;}}
  async function loadEvaluation(){const box=document.querySelector('#fmv11-evaluation-content');if(!box)return;box.innerHTML='<div class="fmv11-loading fmv12-processing">📊 Loading measured prototype activity…</div>';try{const d=await tokenFetch('/api/v11/evaluation');const e=d.evaluation;box.innerHTML=`<div class="fmv11-section-head"><div><h2>📊 AI Evaluation Dashboard</h2><p>These are observed prototype activity metrics, not accuracy claims.</p></div></div><div class="fmv11-kpis"><div><small>Video searches</small><b>${e.video_searches}</b></div><div><small>Observations</small><b>${e.observations}</b></div><div><small>Possible-match records</small><b>${e.possible_match_records}</b></div><div><small>Alerts generated</small><b>${e.alerts_generated}</b></div></div><div class="fmv11-grid2"><article class="fmv11-card">${scoreBar('Observed gate-pass rate',e.gate_pass_rate)}${scoreBar('Average candidate score',e.avg_candidate_score)}</article><article class="fmv11-card"><h3>What these numbers mean</h3><p>${esc(e.measured_note)}</p><p><b>Average candidate score is not AI accuracy.</b> Accuracy requires a labeled test set with true/false positives and negatives.</p></article></div>`;}catch(e){box.innerHTML=`<div class="fmv11-error">${esc(e.message)}</div>`;}}
  function open(caseId){if(!app.requireAdministrator||!app.requireAdministrator())return;const root=modalShell();loadCases(caseId);}
  window.FindMeV11={open};
  function injectCard(){if(!app.currentRole||app.currentRole!=='administrator')return;const host=document.querySelector('.fm-command-grid,.fm-command-cards,.findme-command-grid');if(!host||host.querySelector('[data-fm-v11-open]'))return;const card=document.createElement('button');card.type='button';card.className='fm-command-card fmv12-command';card.dataset.fmV11Open='true';card.innerHTML='<b>🧠</b><strong>Advanced Intelligence</strong><small>Movement, evidence, explainable AI, security and measured evaluation.</small><em>V12 investigation tools</em>';card.onclick=open;host.appendChild(card);}
  const observer=new MutationObserver(injectCard);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest('[data-fm-v11-open]'))open();});setTimeout(injectCard,1200);
})();
