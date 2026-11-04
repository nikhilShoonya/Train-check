/* Secure assessment journey: system check → full screen → instructions → live exam → result → L1 feedback.
   Browser-level, best-effort monitoring only. A web page cannot detect or prevent every desktop
   application switch, screenshot, extension, developer tool or second device. Demo policy pending approval. */
(() => {
  'use strict';
  const T=TC,e=T.esc,b=T.button,g=globalThis;

  // Icons used only by this module. Names never override existing icons.
  const icons={wifi:'M2 9a15 15 0 0 1 20 0 M5 13a10 10 0 0 1 14 0 M8.5 16.5a5 5 0 0 1 7 0 M12 20h.01',monitor:'M3 4h18v12H3z M8 20h8 M12 16v4',maximize:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',flag:'M5 21V4 M5 4h11l-2 4 2 4H5',eraser:'M20 20H9L4 15l9-9 7 7-6 7 M9 11l6 6',alert:'M12 3 2 21h20z M12 10v5 M12 18h.01',storage:'M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0z M4 6c0 2 16 2 16 0 M4 12c0 2 16 2 16 0',code:'M8 8l-4 4 4 4 M16 8l4 4-4 4',refresh:'M20 11a8 8 0 1 0-2 6 M20 4v7h-7',back:'M19 12H5 M11 6l-6 6 6 6',x:'M6 6l12 12 M18 6 6 18'};
  const baseIcon=T.icon;T.icon=name=>icons[name]?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name].split(' M').map((p,i)=>`<path d="${i?'M':''}${p}"/>`).join('')}</svg>`:baseIcon(name);
  const ic=T.icon;

  /* ---------- Policy (demo default; requires L&D/Security/HR approval before production) ---------- */
  const DEFAULT_POLICY={violationLimit:3,dedupeMs:2000,requireFullscreen:true,blockCopy:true,blockCut:true,blockPaste:true,blockContextMenu:true,blockSelection:true,blockNavigation:true,warnSeconds:300,criticalSeconds:60};
  T.examPolicy=()=>({...DEFAULT_POLICY,...(T.state.examPolicy||{})});
  const policyOf=a=>({...T.examPolicy(),...(a?.securityPolicy||{})});
  const REASONS={MANUAL:'Submitted by you',TIME_EXPIRED:'Submitted automatically when time ran out',VIOLATION_LIMIT:'Submitted automatically after the security violation limit'};
  const VIOLATIONS={TAB_HIDDEN:'Switched to another tab or minimised the window',FOCUS_LOST:'Moved focus away from the assessment window',FULLSCREEN_EXIT:'Exited full-screen mode',NAVIGATION:'Tried to navigate away from the assessment'};
  T.violationLabel=type=>VIOLATIONS[type]||type;
  T.submissionLabel=a=>a.submissionReason==='VIOLATION_LIMIT'?`Submitted automatically after ${policyOf(a).violationLimit} security violations`:REASONS[a.submissionReason]||'Submitted';

  /* ---------- Browser adapter (replaceable in tests) ---------- */
  const doc=()=>typeof document!=='undefined'?document:null;
  T.examEnv={
    fullscreenElement:()=>doc()?.fullscreenElement||doc()?.webkitFullscreenElement||null,
    fullscreenEnabled:()=>!!(doc()?.fullscreenEnabled||doc()?.webkitFullscreenEnabled),
    requestFullscreen(){const el=doc()?.documentElement,fn=el&&(el.requestFullscreen||el.webkitRequestFullscreen);if(!fn)return Promise.reject(Error('This browser does not support full-screen pages.'));try{return Promise.resolve(fn.call(el,{navigationUI:'hide'}));}catch(error){return Promise.reject(error);}},
    exitFullscreen(){const d=doc(),fn=d&&(d.exitFullscreen||d.webkitExitFullscreen);if(fn&&this.fullscreenElement())try{fn.call(d)?.catch?.(()=>{});}catch{}},
    hidden:()=>!!doc()?.hidden,
    hasFocus:()=>doc()?.hasFocus?doc().hasFocus():true,
    online:()=>typeof navigator==='undefined'||navigator.onLine!==false,
    protocol:()=>typeof location!=='undefined'&&location.protocol||'',
    pageUrl:()=>String(location.href).split('#')[0],
    fetch:(...args)=>g.fetch(...args),
    storage:()=>g.localStorage,
    viewport:()=>({width:g.innerWidth||0,height:g.innerHeight||0,screenWidth:g.screen?.width||0,screenHeight:g.screen?.height||0}),
    userAgent:()=>typeof navigator!=='undefined'&&navigator.userAgent||'',
    missingFeatures:()=>[['Promises',typeof g.Promise==='function'],['Fetch',typeof g.fetch==='function'],['Structured clone',typeof g.structuredClone==='function'],['Secure random IDs',typeof g.crypto?.randomUUID==='function'],['Dialogs',typeof g.HTMLDialogElement==='function']].filter(([,ok])=>!ok).map(([name])=>name)
  };

  /* ---------- Stage A: system compatibility check ---------- */
  const browserName=ua=>{for(const [name,re] of [['Edge',/Edg\/(\d+)/],['Opera',/OPR\/(\d+)/],['Chrome',/Chrome\/(\d+)/],['Firefox',/Firefox\/(\d+)/],['Safari',/Version\/(\d+)[\d.]* .*Safari/]]){const m=ua.match(re);if(m)return {name,version:+m[1]};}return null;};
  T.runSystemCheck=async(env=T.examEnv)=>{
    const policy=T.examPolicy(),checks=[],add=(id,label,status,detail,essential)=>checks.push({id,label,status,detail,essential});
    const missing=env.missingFeatures();
    add('browser','Browser support',missing.length?'fail':'pass',missing.length?'Missing: '+missing.join(', ')+'. Update or change your browser.':'Required browser features are available.',true);
    add('javascript','JavaScript','pass','Enabled. This page is running its scripts.',true);
    const online=env.online();
    add('internet','Internet connection',online?'pass':'fail',online?'The browser reports an active network connection.':'The browser reports that it is offline. Reconnect and retry.',true);
    if(/^https?:$/.test(env.protocol())){
      let ok=false,detail='TrainCheck could not be reached. Check your connection and retry.';
      try{const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),5000):0;const response=await env.fetch(env.pageUrl(),{method:'HEAD',cache:'no-store',signal:controller?.signal});clearTimeout(timer);ok=!!response?.ok;if(!ok)detail='TrainCheck responded with status '+(response?.status??'unknown')+'. Retry shortly.';}catch{}
      add('application','Application connection',ok?'pass':'fail',ok?'TrainCheck responded from this site.':detail,true);
    } else add('application','Application connection','info','Opened as a local file. This prototype has no application server to contact.',false);
    let stored=false;try{const s=env.storage(),key='traincheck-system-check';s.setItem(key,'1');stored=s.getItem(key)==='1';s.removeItem?.(key);}catch{}
    add('storage','Answer saving',stored?'pass':'fail',stored?'Answers can be saved in this browser as you go.':'Browser storage is blocked or full. Allow site storage and retry.',true);
    const full=env.fullscreenEnabled();
    add('fullscreen','Full-screen support',full?'pass':policy.requireFullscreen?'fail':'warn',full?'Full-screen mode is available.':'This browser does not allow full-screen pages. Use a desktop browser such as Chrome, Edge or Firefox.',policy.requireFullscreen);
    const v=env.viewport(),small=v.width<768;
    add('screen','Screen size',v.width<320?'fail':small?'warn':'pass',`Screen ${v.screenWidth} × ${v.screenHeight} · window ${v.width} × ${v.height}${v.width<320?'. The window is too narrow.':small?'. A larger screen is recommended.':''}`,v.width<320);
    const browser=browserName(env.userAgent());
    add('compatibility','Browser compatibility',browser?'pass':'warn',browser?`${browser.name} ${browser.version} detected.`:'Browser not recognised. You can continue if every required check is ready.',false);
    return checks;
  };
  T.systemCheckPassed=checks=>Array.isArray(checks)&&checks.length>0&&checks.every(c=>!c.essential||c.status==='pass');

  /* ---------- Session (in memory; the attempt itself is persisted) ---------- */
  const session=T.examSession={checks:null,pending:null,ack:false,fullscreenError:'',ready:null,saveOk:true};
  const monitor=T.examMonitor={armed:null,incidentOpen:false,returnedAt:null,graceUntil:0,unloading:false};
  const own=id=>T.state.attempts.find(a=>a.id===id&&a.employee===T.user?.id);
  const employeeOnly=()=>{if(T.user?.role!=='employee')throw Error('Only the assigned employee can take this assessment.');};

  T.examStats=a=>{const answered=a.snapshot.filter(q=>a.answers[q.id]?.length).length;return {total:a.snapshot.length,answered,unanswered:a.snapshot.length-answered,marked:a.snapshot.filter(q=>(a.marked||[]).includes(q.id)).length};};
  T.timerState=(remaining,policy=T.examPolicy())=>remaining<=policy.criticalSeconds?'critical':remaining<=policy.warnSeconds?'warning':'normal';
  const clock=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${sec}`:`${String(m).padStart(2,'0')}:${sec}`;};
  const duration=ms=>{const s=Math.round((ms||0)/1000);return Math.floor(s/60)+' min '+String(s%60).padStart(2,'0')+' s';};
  const remainingOf=(a,now=Date.now())=>Math.max(0,Math.ceil((a.expires-now)/1000));
  const isCorrect=(q,answers=[])=>answers.length===q.correct.length&&q.correct.every(c=>answers.includes(c));

  /* ---------- Central, idempotent finalisation ---------- */
  const finishBase=T.finish;
  T.finish=(id,now=Date.now(),reason)=>{
    const a=T.state.attempts.find(x=>x.id===id);
    if(!a)return finishBase(id,now);
    if(a.state!=='IN_PROGRESS')return a; // already final: one authoritative result
    a.submissionReason=now>=a.expires?'TIME_EXPIRED':reason||'MANUAL';
    a.timeTakenMs=Math.max(0,Math.min(now,a.expires)-a.started);
    if(monitor.armed===id){T.disarmExam();T.examEnv.exitFullscreen();}
    const result=finishBase(id,now);
    let earned=0,total=0,correct=0;
    result.snapshot.forEach(q=>{total+=q.marks;if(isCorrect(q,result.answers[q.id]||[])){earned+=q.marks;correct++;}});
    Object.assign(result,{marks:{earned,total},correctCount:correct,answeredCount:T.examStats(result).answered,finalisedCount:(result.finalisedCount||0)+1});
    T.save();return result;
  };

  /* ---------- Answers, review marks and timer ---------- */
  T.examAnswer=(id,qid,values,now=Date.now())=>{
    const a=own(id);if(!a||a.state!=='IN_PROGRESS')throw Error('This attempt has been submitted. No further answers can be saved.');
    if(now>=a.expires){T.finish(a.id,now,'TIME_EXPIRED');throw Error('Time has expired. Your saved answers were submitted.');}
    const q=a.snapshot.find(q=>q.id===qid);if(!q)throw Error('Question unavailable.');
    const allowed=new Set(q.options.map(o=>o.id)),clean=[...new Set(values.map(String))].filter(v=>allowed.has(v));
    if(q.type!=='multiple'&&clean.length>1)throw Error('Select one answer for this question.');
    if(clean.length)a.answers[qid]=clean;else delete a.answers[qid];
    a.savedAt=new Date(now).toISOString();session.saveOk=T.save();return session.saveOk;
  };
  T.examMark=(id,qid)=>{const a=own(id);if(!a||a.state!=='IN_PROGRESS')throw Error('This attempt has been submitted.');if(!a.snapshot.some(q=>q.id===qid))throw Error('Question unavailable.');a.marked??=[];a.marked=a.marked.includes(qid)?a.marked.filter(x=>x!==qid):[...a.marked,qid];session.saveOk=T.save();return a.marked.includes(qid);};

  const announce=text=>{const live=doc()?.querySelector('#exam-live');if(live)live.textContent=text;};
  T.examTick=(now=Date.now())=>{
    if(T.user?.role!=='employee')return null;const a=T.active();if(!a)return null;
    const remaining=remainingOf(a,now);
    if(!remaining){T.finish(a.id,now,'TIME_EXPIRED');if(doc()?.querySelector('#dialog')?.open)T.closeDialog();T.view.result=a.id;T.go('result');T.toast('Time is up. Your saved answers were submitted automatically.');return {remaining:0,state:'expired'};}
    const policy=policyOf(a),state=T.timerState(remaining,policy);a.timerWarnings??={};
    if(state!=='normal'&&!a.timerWarnings[state]){
      a.timerWarnings[state]=true;if(state==='critical')a.timerWarnings.warning=true;T.save();
      const text=state==='critical'?'Less than 1 minute remains. Your saved answers will be submitted automatically when time runs out.':'5 minutes remain. Check any unanswered or marked questions.';
      T.toast(text);announce(text);
    }
    doc()?.querySelectorAll?.('[data-exam-timer]').forEach(el=>{el.textContent=clock(remaining);});
    const timer=doc()?.querySelector?.('.exam-timer');if(timer?.dataset){timer.dataset.state=state;const label=timer.querySelector?.('small');if(label)label.textContent={normal:'remaining',warning:'5 min warning',critical:'under 1 min'}[state];}
    return {remaining,state};
  };
  T.tick=()=>T.examTick();
  if(typeof setInterval==='function')setInterval(()=>T.examTick(),1000);

  /* ---------- Security monitor: one shared handler with incident de-duplication ---------- */
  T.recordViolation=(id,type,now=Date.now())=>{
    const a=T.state.attempts.find(x=>x.id===id);
    if(!a||a.state!=='IN_PROGRESS'||!a.secure||!VIOLATIONS[type])return {counted:false};
    const policy=policyOf(a);a.violations??=[];const last=a.violations.at(-1);
    const sameIncident=last&&(now-last.atMs<policy.dedupeMs||(monitor.armed===id&&monitor.incidentOpen&&(monitor.returnedAt===null||now-monitor.returnedAt<policy.dedupeMs)));
    if(sameIncident){if(!last.signals.includes(type))last.signals.push(type);T.save();return {counted:false,merged:true,count:a.violations.length};}
    const violation={number:a.violations.length+1,type,signals:[type],at:new Date(now).toISOString(),atMs:now,attempt:a.id};
    a.violations.push(violation);
    monitor.incidentOpen=['TAB_HIDDEN','FOCUS_LOST'].includes(type);monitor.returnedAt=null;
    T.save();
    if(violation.number>=policy.violationLimit){T.finish(a.id,now,'VIOLATION_LIMIT');return {counted:true,count:violation.number,violation,final:true};}
    return {counted:true,count:violation.number,violation,final:false};
  };
  // The page is visible and focused again: the incident closes after the de-duplication window.
  T.settleIncident=(now=Date.now())=>{if(monitor.incidentOpen&&monitor.returnedAt===null&&!T.examEnv.hidden()&&T.examEnv.hasFocus())monitor.returnedAt=now;};
  let heartbeat=null;
  T.armExam=id=>{if(monitor.armed===id)return;Object.assign(monitor,{armed:id,incidentOpen:false,returnedAt:null,graceUntil:0,unloading:false});session.ready=id;try{history.pushState({exam:id},'','#assessment');}catch{}
    if(!heartbeat&&typeof setInterval==='function'&&/^https?:$/.test(T.examEnv.protocol()))heartbeat=setInterval(checkApplication,15000);};
  T.disarmExam=()=>{Object.assign(monitor,{armed:null,incidentOpen:false,returnedAt:null,graceUntil:0,unloading:false});if(heartbeat){clearInterval(heartbeat);heartbeat=null;}};

  const showViolation=result=>{
    const a=T.state.attempts.find(x=>x.id===result.violation?.attempt);if(!a)return;
    if(result.final){if(doc()?.querySelector('#dialog')?.open)T.closeDialog();T.view.result=a.id;T.go('result');T.toast('Your assessment was submitted automatically after '+result.count+' security violations.');return;}
    const limit=policyOf(a).violationLimit,v=result.violation,last=v.number===limit-1,fullscreenOn=!!T.examEnv.fullscreenElement();
    T.modal(last?'Final warning':'Security warning',`<div class="violation-alert ${last?'final':''}"><p class="violation-count">${ic('alert')} Violation ${v.number} of ${limit}</p><p><strong>${e(T.violationLabel(v.type))}</strong> at ${e(new Date(v.atMs).toLocaleTimeString())}.</p><p>${last?'One more violation will submit your assessment automatically with the answers saved so far.':'Stay on this tab in full screen until you submit. Each further violation is counted.'}</p><p class="small">Your answers are saved. Violations do not change your score.</p></div><div class="dialog-actions">${b(fullscreenOn?'Continue assessment':ic('maximize')+' Return to full screen','exam-return-fullscreen','','primary')}</div>`);
    announce(`Security warning. Violation ${v.number} of ${limit}.`);
    if(['assessment','review'].includes(T.view.page))T.render();
  };
  // Shared handler for every browser signal. A refresh is a recovery path (BR 6.5), not a violation:
  // the browser's own "Leave site?" prompt blurs the window and may leave full screen, and a real
  // unload hides the page, so those side effects are ignored. Switching tabs while the prompt is open still counts.
  T.examSignal=(type,now=Date.now())=>{if(!monitor.armed||monitor.unloading)return {counted:false};if(now<monitor.graceUntil&&type!=='TAB_HIDDEN')return {counted:false,ignored:'leave-prompt'};const result=T.recordViolation(monitor.armed,type,now);if(result.counted)showViolation(result);return result;};
  T.examLifecycle=(phase,now=Date.now())=>{if(!monitor.armed)return;if(phase==='beforeunload')monitor.graceUntil=now+1500;if(phase==='pagehide')monitor.unloading=true;if(phase==='pageshow')Object.assign(monitor,{unloading:false,graceUntil:0});};
  const signal=type=>T.examSignal(type);
  const deterrents={copy:'blockCopy',cut:'blockCut',paste:'blockPaste',contextmenu:'blockContextMenu',selectstart:'blockSelection',dragstart:'blockSelection'};
  let deterToast=0;
  const deter=(event,name)=>{if(!monitor.armed)return;const a=T.active();if(!policyOf(a)[deterrents[name]])return;if(name==='selectstart'&&event.target?.closest?.('textarea,input'))return;event.preventDefault();if(!['selectstart','dragstart'].includes(name)&&Date.now()-deterToast>3000){deterToast=Date.now();T.toast({copy:'Copying',cut:'Cutting',paste:'Pasting',contextmenu:'The right-click menu'}[name]+' is disabled during the assessment.');}};

  /* ---------- Connection: offline is an interruption, never a violation ---------- */
  let appReachable=true;
  const updateConnectionUI=()=>{const online=T.examEnv.online()&&appReachable,pill=doc()?.querySelector?.('#exam-net'),banner=doc()?.querySelector?.('#exam-offline');if(pill?.classList){pill.classList.toggle('ok',online);pill.classList.toggle('bad',!online);const label=pill.querySelector('span');if(label)label.textContent=online?'Online':T.examEnv.online()?'Server unreachable':'Offline';}if(banner)banner.hidden=online;doc()?.querySelectorAll?.('[data-connection]').forEach(el=>{el.textContent=online?'Online':'Offline · answers saved in this browser';});};
  T.examConnection=(online,now=Date.now())=>{
    const a=T.active();
    if(a&&a.state==='IN_PROGRESS'){a.interruptions??=[];const open=a.interruptions.at(-1);if(!online&&(!open||open.to))a.interruptions.push({from:new Date(now).toISOString()});if(online&&open&&!open.to)open.to=new Date(now).toISOString();session.saveOk=T.save();}
    if(online)appReachable=true;updateConnectionUI();
    if(a&&online)T.toast('Connection restored. You are continuing the same attempt; the timer was not paused.');
    else if(a)T.toast('You are offline. Answers continue to save in this browser and the timer keeps running.');
    return a||null;
  };
  async function checkApplication(){if(!monitor.armed)return;try{const r=await T.examEnv.fetch(T.examEnv.pageUrl(),{method:'HEAD',cache:'no-store'});appReachable=!!r.ok;}catch{appReachable=false;}updateConnectionUI();}

  if(doc()?.addEventListener){
    const d=doc();
    d.addEventListener('visibilitychange',()=>{if(T.examEnv.hidden())signal('TAB_HIDDEN');else T.settleIncident();});
    for(const name of ['fullscreenchange','webkitfullscreenchange'])d.addEventListener(name,()=>{if(!monitor.armed)return;if(!T.examEnv.fullscreenElement()){signal('FULLSCREEN_EXIT');if(monitor.armed&&['assessment','review'].includes(T.view.page)&&!d.querySelector('#dialog')?.open)T.render();}else{T.settleIncident();if(['assessment','review'].includes(T.view.page))T.render();}});
    for(const name of Object.keys(deterrents))d.addEventListener(name,event=>deter(event,name));
  }
  if(typeof window!=='undefined'&&window.addEventListener){
    window.addEventListener('blur',()=>signal('FOCUS_LOST'));
    window.addEventListener('focus',()=>T.settleIncident());
    window.addEventListener('beforeunload',event=>{if(!monitor.armed)return;T.examLifecycle('beforeunload');event.preventDefault();event.returnValue='';});
    window.addEventListener('pagehide',()=>T.examLifecycle('pagehide'));
    window.addEventListener('pageshow',()=>T.examLifecycle('pageshow'));
    window.addEventListener('popstate',()=>{if(!monitor.armed||!policyOf(T.active()).blockNavigation)return;try{history.pushState({exam:monitor.armed},'','#assessment');}catch{}signal('NAVIGATION');});
    window.addEventListener('hashchange',()=>{if(!monitor.armed)return;const page=String(location.hash).slice(1);if(['assessment','review'].includes(page))return;if(policyOf(T.active()).blockNavigation){history.replaceState(null,'','#assessment');T.view.page='assessment';T.render();}signal('NAVIGATION');});
    window.addEventListener('online',()=>T.examConnection(true));
    window.addEventListener('offline',()=>T.examConnection(false));
  }

  /* ---------- Views ---------- */
  const trainingOf=id=>T.state.trainings.find(t=>t.id===id);
  const STEPS=['System check','Full screen','Instructions','Assessment'];
  const stepper=current=>`<ol class="exam-steps" aria-label="Assessment steps">${STEPS.map((label,i)=>`<li class="${i<current?'done':i===current?'current':''}" ${i===current?'aria-current="step"':''}><span class="step-dot">${i<current?ic('check'):i+1}</span><span>${label}${i<current?'<span class="sr-only"> (completed)</span>':''}</span></li>`).join('')}</ol>`;
  const demoReset=()=>`<details class="exam-demo-tools"><summary>Demo testing tools</summary><p>Prototype only. Restores this fictional employee's assessment records so you can test another scenario.</p>${b(ic('refresh')+' Reset demo assessment','exam-reset','','secondary')}</details>`;
  const stageShell=(step,inner)=>T.focusShell(`<div class="exam-stage">${stepper(step)}<section class="exam-stage-card">${inner}</section>${demoReset()}</div>`);
  const STATUS={pass:['Ready','check'],fail:['Action needed','x'],warn:['Advisory','alert'],info:['Not applicable','help']};
  const CHECK_ICONS={browser:'globe',javascript:'code',internet:'wifi',application:'monitor',storage:'storage',fullscreen:'maximize',screen:'monitor',compatibility:'shield'};

  const runChecks=()=>{session.pending=T.runSystemCheck().then(checks=>{session.checks=checks;}).catch(()=>{session.checks=[{id:'browser',label:'Browser support',status:'fail',detail:'The system check could not run in this browser.',essential:true}];}).finally(()=>{session.pending=null;if(T.view.page==='exam-check')T.render();});return session.pending;};
  T.refreshSystemCheck=()=>{session.checks=null;return runChecks();};

  const checkView=()=>{
    if(!session.checks&&!session.pending)runChecks();
    const checks=session.checks,ready=T.systemCheckPassed(checks);
    const rows=checks?checks.map(c=>{const [label,icon]=STATUS[c.status];return `<li class="check-row"><span class="check-icon">${ic(CHECK_ICONS[c.id]||'shield')}</span><div><strong>${e(c.label)}${c.essential?'':' <small>(optional)</small>'}</strong><small>${e(c.detail)}</small></div><span class="check-status ${c.status}">${ic(icon)}${label}</span></li>`;}).join(''):Array.from({length:8},()=>`<li class="check-row loading"><span class="check-icon"></span><div><strong>Checking…</strong><small>&nbsp;</small></div></li>`).join('');
    const failed=checks?.filter(c=>c.essential&&c.status!=='pass')||[];
    return stageShell(0,`<h1 tabindex="-1">System check</h1><p class="lead">Before the timer starts, we confirm that this browser can run the assessment and save your answers.</p><ul class="check-list" aria-busy="${!checks}" aria-live="polite">${rows}</ul>${failed.length?`<div class="notice danger" role="alert">${ic('alert')}<div><strong>${failed.length} required check${failed.length>1?'s':''} need attention.</strong> Fix ${failed.map(c=>e(c.label.toLowerCase())).join(', ')}, then select Retry check.</div></div>`:''}<div class="exam-stage-actions">${b(ic('refresh')+' Retry check','exam-recheck','','secondary')}<button class="btn primary" data-action="exam-continue" ${ready?'':'disabled aria-disabled="true"'}>Continue ${ic('arrow')}</button></div><p class="small">Checks use this browser's own capabilities and a request to this site only. No speed test is run.</p>`);
  };

  const fullscreenView=()=>{
    const a=T.active(),resume=!!a?.secure,on=!!T.examEnv.fullscreenElement(),limit=policyOf(a).violationLimit;
    const lead=resume?`Your <strong>${e(trainingOf(a.training).name)}</strong> attempt is still in progress. The timer kept running and ${clock(remainingOf(a))} remain. Your saved answers are waiting.`:'This assessment must be taken in full-screen mode. Select the button below; your browser may ask you to confirm.';
    return stageShell(resume?3:1,`<div class="fs-visual" aria-hidden="true">${ic('maximize')}</div><h1 tabindex="-1">${resume?'Resume in full screen':'Enable full screen'}</h1><p class="lead">${lead}</p>${session.fullscreenError?`<div class="notice danger" role="alert">${ic('alert')}<div><strong>Full screen did not start.</strong> ${e(session.fullscreenError)}</div></div>`:''}<div class="exam-stage-actions center"><button class="btn primary large" data-action="exam-fullscreen">${ic('maximize')} ${on?'Continue in full screen':resume?'Enter full screen and resume':'Enter full screen'}</button></div><p class="small centered">Leaving full screen during the assessment is recorded as a security violation. ${limit} violations submit the assessment automatically.</p>`);
  };

  const instructionsView=()=>{
    if(!T.systemCheckPassed(session.checks)){T.view.page='exam-check';return checkView();}
    const assignment=T.queue(T.user.id)[0],t=trainingOf(assignment.training),policy=T.examPolicy(),used=T.history(T.user.id,t.id).length;
    const marks=[...new Set(T.state.questions.filter(q=>q.training===t.id&&q.active).map(q=>q.marks))],totalMarks=marks.length===1?t.count*marks[0]:null;
    const facts=[['clipboard','Assessment',e(t.name)],['file','Questions',t.count],['award','Total marks',totalMarks??'Varies by question'],['clock','Duration',t.minutes+' minutes'],['target','Pass mark',t.threshold+'% or higher'],['refresh','Attempt',`${used+1} of ${t.maxAttempts}`]];
    const rules=[
      ['Navigation','Questions appear one at a time. Use Previous, Next or the question navigator. You can change answers until you submit.'],
      ['Mark for review','Flag any question to revisit later. Marking does not affect your score.'],
      ['Saving','Each answer saves in this browser as soon as you select it. A refresh or lost connection does not lose saved answers.'],
      ['Timer','The timer starts when you select Start assessment. It keeps running if you refresh, close the tab or lose connection. When time runs out, saved answers are submitted automatically.'],
      ['Full screen','Stay in full screen until you submit. Questions are hidden while full screen is off.'],
      ['Tabs and windows','Do not switch tabs, open other windows or move focus away from this window.'],
      ['Restricted actions','Copy, cut, paste, the right-click menu and browser back navigation are disabled during the assessment.'],
      ['Violation policy',`Each security event is a violation. Violation 1 shows a warning, violation ${policy.violationLimit-1} a final warning, and violation ${policy.violationLimit} submits the assessment automatically.`],
      ['Automatic submission','The assessment is submitted automatically when time expires or the violation limit is reached. Unanswered questions receive no marks. Violations do not change your score.'],
      ['Monitoring','Browser-level, best-effort monitoring records only the event type and time. No camera, screen recording or keystroke capture is used.']];
    return stageShell(2,`<h1 tabindex="-1">Assessment instructions</h1><p class="lead">Read these rules before you start. The timer begins only when you select Start assessment.</p><div class="instructions-grid"><dl class="instruction-facts">${facts.map(([icon,label,value])=>`<div><dt>${ic(icon)}${label}</dt><dd>${value}</dd></div>`).join('')}</dl><section class="instruction-rules" aria-labelledby="rules-title"><h2 id="rules-title">${ic('shield')} Important rules</h2><ul>${rules.map(([label,text])=>`<li><strong>${label}.</strong> ${text}</li>`).join('')}</ul></section></div><div class="exam-stage-actions split"><label class="ack-line"><input type="checkbox" name="exam-ack" ${session.ack?'checked':''}> I have read and understood the instructions.</label><button class="btn primary large" id="exam-begin" data-action="exam-begin" ${session.ack?'':'disabled'}>Start assessment ${ic('arrow')}</button></div>`);
  };

  const navState=(a,q,i)=>{const answered=!!a.answers[q.id]?.length,marked=(a.marked||[]).includes(q.id);return {answered,marked,cls:[i===T.view.question?'current':'',answered?'answered':'',marked?'marked':''].join(' ').trim(),label:`Question ${i+1}: ${answered?'answered':'not answered'}${marked?', marked for review':''}${i===T.view.question?', current question':''}`};};
  const TYPE_LABEL={single:'Single choice',multiple:'Multiple choice',boolean:'True or false',scenario:'Scenario'};
  const HINT={single:'Select one answer.',multiple:'Select all that apply. Every correct option must be selected to earn the mark.',boolean:'Select True or False.',scenario:'Read the scenario and select the best response.'};

  const examView=a=>{
    const t=trainingOf(a.training),policy=policyOf(a),stats=T.examStats(a),secure=!!a.secure,online=T.examEnv.online()&&appReachable;
    T.view.question=Math.max(0,Math.min(T.view.question,a.snapshot.length-1));
    const i=T.view.question,q=a.snapshot[i],remaining=remainingOf(a),tstate=T.timerState(remaining,policy),fsOn=!!T.examEnv.fullscreenElement(),violations=(a.violations||[]).length,pct=Math.round(stats.answered/stats.total*100);
    const blocked=secure&&policy.requireFullscreen&&!fsOn,marked=(a.marked||[]).includes(q.id),answer=a.answers[q.id]||[],multiple=q.type==='multiple';
    const header=`<header class="exam-header"><div class="exam-brand"><span class="exam-mark">${ic('check')}</span><span>TrainCheck</span><i aria-hidden="true"></i><span class="exam-org">Finvasia</span></div><div class="exam-title"><span class="exam-mode">${ic(secure?'lock':'file')}${secure?'Secure assessment mode':'Pre-test · baseline'}</span><strong>${e(t.name)}</strong></div><ul class="exam-indicators" aria-label="Live status"><li id="exam-net" class="pill ${online?'ok':'bad'}">${ic('wifi')}<span>${online?'Online':'Offline'}</span></li>${secure?`<li class="pill ${fsOn?'ok':'bad'}">${ic('maximize')}<span>Full screen ${fsOn?'on':'off'}</span></li><li class="pill ${violations?violations>=policy.violationLimit-1?'bad':'warn':'ok'}">${ic('shield')}<span>Violations ${violations} / ${policy.violationLimit}</span></li>`:''}</ul><div class="exam-timer" role="timer" aria-label="Time remaining" data-state="${tstate}">${ic('clock')}<span data-exam-timer>${clock(remaining)}</span><small>${{normal:'remaining',warning:'5 min warning',critical:'under 1 min'}[tstate]}</small></div>${b('End test','exam-end','','exam-end-btn')}</header>`;
    const banners=`<div id="exam-offline" class="exam-banner offline" role="status" ${online?'hidden':''}>${ic('wifi')}<span>You're offline. Answers keep saving in this browser and the timer keeps running. The same attempt continues when the connection returns.</span></div>${T.storageError?`<div class="exam-banner danger" role="alert">${ic('alert')}<span>${e(T.storageError)}</span></div>`:''}`;
    const navigator=`<aside class="exam-panel exam-navigator" aria-labelledby="navigator-title"><h2 id="navigator-title">Question navigator</h2><ul class="nav-legend"><li><i class="swatch answered"></i>Answered <b data-count="answered">${stats.answered}</b></li><li><i class="swatch marked"></i>Marked for review <b data-count="marked">${stats.marked}</b></li><li><i class="swatch"></i>Not answered <b data-count="unanswered">${stats.unanswered}</b></li></ul><div class="q-grid">${a.snapshot.map((x,j)=>{const s=navState(a,x,j);return `<button class="q-cell ${s.cls}" data-action="exam-goto" data-value="${j}" data-index="${j}" aria-label="${s.label}" ${j===i?'aria-current="step"':''}>${j+1}</button>`;}).join('')}</div></aside>`;
    let main;
    if(blocked)main=`<section class="question-card blocker" role="alert"><div class="fs-visual" aria-hidden="true">${ic('maximize')}</div><h1 tabindex="-1">Full screen is off</h1><p>Questions are hidden until you return to full screen. The timer is still running and your answers are saved.</p><button class="btn primary large" data-action="exam-return-fullscreen">${ic('maximize')} Return to full screen</button><p class="small">Violations recorded: ${violations} of ${policy.violationLimit}.</p></section>`;
    else if(T.view.page==='review')main=`<section class="question-card review-card"><h1 tabindex="-1">Review &amp; submit</h1><p>${stats.unanswered?`<strong>${stats.unanswered} question${stats.unanswered>1?'s are':' is'} not answered</strong> and will receive no marks.`:'All questions are answered.'} ${stats.marked?`${stats.marked} marked for review.`:''} Select any question to return to it.</p><ul class="review-list">${a.snapshot.map((x,j)=>{const s=navState(a,x,j);return `<li><button data-action="exam-goto" data-value="${j}"><span class="review-num">${j+1}</span><span class="review-text">${e(x.text)}</span><span class="badge ${s.answered?'success':'warning'}">${s.answered?'Answered':'Not answered'}</span>${s.marked?'<span class="badge info">Marked</span>':''}</button></li>`;}).join('')}</ul><div class="q-actions"><div>${b(ic('back')+' Back to question '+(i+1),'exam-goto',i)}</div><div>${b('Submit assessment','exam-end','','primary')}</div></div></section>`;
    else main=`<section class="question-card"><div class="q-head"><span class="q-number">Question ${i+1} of ${stats.total}</span><span><b data-count="percent">${pct}</b>% answered</span></div><div class="q-progress" aria-hidden="true"><span id="exam-bar" style="width:${pct}%"></span></div><div class="q-meta"><span class="chip">${TYPE_LABEL[q.type]||'Single choice'}</span><span class="chip">${q.marks} mark${q.marks===1?'':'s'}</span><span class="chip">${e(q.topic)}</span><span class="chip amber" id="exam-marked-chip" ${marked?'':'hidden'}>${ic('flag')} Marked for review</span></div><h1 tabindex="-1" class="q-text" lang="${q.language==='Hindi'?'hi':'en'}">${e(q.text)}</h1><p class="q-hint">${HINT[q.type]||HINT.single}</p><fieldset class="exam-options"><legend class="sr-only">Answer choices for question ${i+1}</legend>${q.options.map((o,k)=>`<label class="exam-option ${answer.includes(o.id)?'chosen':''}"><input type="${multiple?'checkbox':'radio'}" name="exam-answer" value="${e(o.id)}" data-question="${e(q.id)}" ${answer.includes(o.id)?'checked':''}><span class="opt-letter" aria-hidden="true">${String.fromCharCode(65+k)}</span><span class="opt-text">${e(o.text)}</span></label>`).join('')}</fieldset><div class="q-actions"><div>${b(ic('flag')+(marked?' Unmark review':' Mark for review'),'exam-mark',q.id,'secondary'+(marked?' is-marked':''))}<button class="btn text" id="exam-clear" data-action="exam-clear" data-value="${e(q.id)}" ${answer.length?'':'disabled'}>${ic('eraser')} Clear response</button></div><div><button class="btn secondary" data-action="exam-goto" data-value="${i-1}" ${i===0?'disabled':''}>${ic('back')} Previous</button>${i<stats.total-1?b('Next '+ic('arrow'),'exam-goto',i+1,'primary'):''}${b('Review &amp; submit','exam-review','',i===stats.total-1?'primary':'secondary')}</div></div><p class="save-line" id="exam-save" role="status">${session.saveOk&&!T.storageError?ic('check')+' Answers saved in this browser':ic('alert')+' Your last change could not be saved in this browser'}</p></section>`;
    const status=`<aside class="exam-panel exam-status" aria-labelledby="status-title"><h2 id="status-title">Assessment status</h2><dl class="status-list"><div><dt>Time remaining</dt><dd data-exam-timer>${clock(remaining)}</dd></div><div><dt>Total questions</dt><dd>${stats.total}</dd></div><div><dt>Answered</dt><dd data-count="answered">${stats.answered}</dd></div><div><dt>Not answered</dt><dd data-count="unanswered">${stats.unanswered}</dd></div><div><dt>Marked for review</dt><dd data-count="marked">${stats.marked}</dd></div></dl><h2>Monitoring</h2>${secure?`<dl class="status-list"><div><dt>Full screen</dt><dd class="${fsOn?'ok':'bad'}">${fsOn?'On':'Off'}</dd></div><div><dt>Tab monitoring</dt><dd class="ok">Active</dd></div><div><dt>Focus monitoring</dt><dd class="ok">Active</dd></div><div><dt>Violations</dt><dd class="${violations?'bad':'ok'}">${violations} of ${policy.violationLimit}</dd></div><div><dt>Connection</dt><dd data-connection>${online?'Online':'Offline · answers saved in this browser'}</dd></div></dl><p class="small">Browser-level, best-effort monitoring. Only event type and time are recorded.</p>`:'<p class="small">Pre-tests are a practice baseline and are not monitored.</p>'}<details class="exam-demo-tools"><summary>Demo testing tools</summary><p>Prototype only. Shortens this attempt's stored deadline to test timer warnings and automatic submission.</p>${b('Set 4:55 remaining','exam-demo-time','295')}${b('Set 0:55 remaining','exam-demo-time','55')}${b('Set 0:10 remaining','exam-demo-time','10')}</details></aside>`;
    return `<div class="exam-shell ${secure&&policy.blockSelection?'no-select':''}" data-timer="${tstate}">${header}${banners}<div class="exam-body">${navigator}<main id="main" class="exam-main">${main}</main>${status}</div><div id="exam-live" class="sr-only" aria-live="assertive"></div></div>`;
  };

  // Stage pages render inside the gate; the gate greeting itself is unchanged.
  const gateBase=T.gate;
  T.gate=()=>{
    if(T.view.page==='exam-check')return checkView();
    if(T.view.page==='exam-fullscreen')return fullscreenView();
    if(T.view.page==='exam-instructions')return instructionsView();
    return gateBase();
  };
  T.assessment=()=>{
    const a=T.active();if(!a)return T.gate();
    if(a.secure&&monitor.armed!==a.id&&policyOf(a).requireFullscreen)return fullscreenView(); // refresh/new tab: re-enter full screen to resume
    if(a.secure&&monitor.armed!==a.id)T.armExam(a.id);
    return examView(a);
  };

  /* ---------- Result: submission details on top of the existing result ---------- */
  const resultBase=T.result;
  T.result=()=>{
    let html=resultBase();const a=T.state.attempts.find(x=>x.id===T.view.result&&x.employee===T.user?.id);
    if(!a||a.kind==='PRE'||a.state==='IN_PROGRESS')return html;
    const t=trainingOf(a.training),h=T.history(a.employee,a.training),latest=h.at(-1),stats=T.examStats(a),violations=a.violations||[];
    const marks=a.marks?`${+a.marks.earned.toFixed(2)} / ${+a.marks.total.toFixed(2)}`:'Not recorded';
    const facts=[['Score',marks+' marks'],['Percentage',a.score.toFixed(1)+'%'],['Attempt',`${a.number} of ${a.maxAttempts}`],['Submission',e(T.submissionLabel(a))],['Time taken',a.timeTakenMs===undefined?'Not recorded':duration(a.timeTakenMs)],['Answered',`${stats.answered} of ${stats.total}`],['Correct',a.correctCount===undefined?'Not recorded':`${a.correctCount} of ${stats.total}`],['Latest score',latest?latest.score.toFixed(1)+'%':'—']];
    const summary=`<section class="panel left result-details" aria-labelledby="result-details-title"><h2 id="result-details-title">Submission details</h2>${a.submissionReason==='VIOLATION_LIMIT'?`<div class="notice danger">${ic('alert')}<div>The assessment was submitted automatically after ${violations.length} security violations. Your saved answers were scored normally; violations do not change the score.</div></div>`:''}<dl class="result-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${violations.length?`<details class="violation-log"><summary>Security events recorded (${violations.length})</summary><ol>${violations.map(v=>`<li><span>${e(new Date(v.atMs).toLocaleTimeString())}</span>${e(T.violationLabel(v.type))}${v.signals.length>1?` <small>(${v.signals.length} browser signals, counted once)</small>`:''}</li>`).join('')}</ol></details>`:''}</section>`;
    html=html.replace('<section class="panel left"><h2>Topic performance</h2>',summary+'<section class="panel left"><h2>Topic performance</h2>');
    const feedbackDue=a.number===1&&t?.feedback&&!T.state.feedback.some(f=>f.employee===a.employee&&f.training===a.training);
    if(feedbackDue)html=html.replace(/(data-action="continue" data-value="">)Continue to (?:my workspace|next assessment)/,'$1Continue to feedback');
    return html;
  };

  /* ---------- Level 1 reaction feedback (inline) ---------- */
  const RATINGS=[['relevance','How relevant was the content to your work?','Not relevant','Highly relevant'],['trainer','How effective was the trainer?','Not effective','Very effective'],['logistics','How well organised were the logistics (schedule, venue or platform, materials)?','Poorly organised','Very well organised'],['intent','How likely are you to apply what you learned?','Not likely','Very likely']];
  const scale=(name,label,low,high)=>`<fieldset class="rating-field"><legend>${label} <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></legend><div class="rating-scale">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${name}" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="scale-anchors" aria-hidden="true"><span>1 · ${low}</span><span>5 · ${high}</span></div></fieldset>`;
  T.reaction=()=>{
    if(!T.view.result)T.view.result=T.state.attempts.filter(a=>a.employee===T.user.id&&a.state!=='IN_PROGRESS'&&a.kind!=='PRE').at(-1)?.id;
    const a=own(T.view.result);if(!a||a.state==='IN_PROGRESS')return T.gate();
    const t=trainingOf(a.training),done=T.state.feedback.some(f=>f.employee===a.employee&&f.training===a.training),next=T.queue(T.user.id).length?'Continue to next assessment':'Go to my dashboard';
    if(done||!t.feedback)return T.focusShell(`<section class="gate-panel"><span class="eyebrow">LEVEL 1 · REACTION</span><h1 tabindex="-1">${done?'Feedback already submitted':'Feedback is not enabled'}</h1><p>${e(t.name)}. ${done?'Thank you. Your response is saved and cannot be submitted twice.':'This training does not collect reaction feedback.'}</p>${b(next+' '+ic('arrow'),'next-after-feedback','','primary wide')}</section>`);
    return T.focusShell(`<section class="feedback-card"><span class="eyebrow">LEVEL 1 · REACTION</span><h1 tabindex="-1">Training feedback</h1><p class="lead">${e(t.name)} · Help improve this training. Your answers do not change your assessment score.</p><form id="reaction-form" data-id="${e(a.id)}" class="reaction-form"><p class="form-error" role="alert"></p>${RATINGS.map(r=>scale(...r)).join('')}<fieldset class="rating-field"><legend>How likely are you to recommend this training to a colleague? <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></legend><div class="rating-scale nps">${Array.from({length:11},(_,n)=>`<label><input type="radio" name="recommendation" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="scale-anchors" aria-hidden="true"><span>0 · Not at all likely</span><span>10 · Extremely likely</span></div></fieldset><label class="field">Comments or suggestions (optional)<textarea name="comment" rows="3" maxlength="1000" placeholder="What worked well, and what could be better?"></textarea></label><div class="feedback-actions">${b('Skip feedback','next-after-feedback','','text')}<button class="btn primary large" type="submit">Submit feedback &amp; continue ${ic('arrow')}</button></div></form></section>`);
  };
  T.submitReaction=(attemptId,v,now=Date.now())=>{
    employeeOnly();const a=own(attemptId);if(!a||a.state==='IN_PROGRESS'||a.kind==='PRE')throw Error('Feedback is available after you submit an assessment.');
    const t=trainingOf(a.training);if(!t.feedback)throw Error('Feedback is not enabled for this training.');
    if(T.state.feedback.some(f=>f.employee===a.employee&&f.training===a.training))throw Error('Feedback for this training has already been submitted.');
    const missing=RATINGS.filter(([key])=>!Number.isInteger(+v[key])||!v[key]||+v[key]<1||+v[key]>5).map(([,label])=>label.replace(/\?$/,''));
    if(v.recommendation===undefined||v.recommendation===''||!Number.isInteger(+v.recommendation)||+v.recommendation<0||+v.recommendation>10)missing.push('Recommendation (0–10)');
    if(missing.length)throw Error('Answer every required question: '+missing.join('; ')+'.');
    const comment=String(v.comment||'').trim();if(comment.length>1000)throw Error('Keep comments to 1,000 characters or fewer.');
    const assignment=T.state.assignments.find(x=>x.employee===a.employee&&x.training===a.training);
    const record={employee:a.employee,training:a.training,attempt:a.id,batch:assignment?.batch,relevance:+v.relevance,trainer:+v.trainer,logistics:+v.logistics,intent:+v.intent,recommendation:+v.recommendation,comment,date:new Date(now).toISOString()};
    T.state.feedback.push(record);if(!T.save())throw Error(T.storageError);return record;
  };
  const handleFormBase=T.handleForm;
  T.handleForm=async(el,v,values,id)=>{
    if(el.id==='reaction-form'){T.submitReaction(id,v);T.view.result=null;T.toast('Thank you. Your feedback has been saved.');T.go(T.queue(T.user.id).length?'gate':'overview');return true;}
    return handleFormBase?handleFormBase(el,v,values,id):false;
  };

  /* ---------- Actions ---------- */
  const A=T.actions;
  A.start=()=>{employeeOnly();const a=T.active();session.fullscreenError='';
    if(a){if(!a.secure&&a.kind!=='PRE'){Object.assign(a,{secure:true,securityPolicy:{violationLimit:T.examPolicy().violationLimit,requireFullscreen:T.examPolicy().requireFullscreen,dedupeMs:T.examPolicy().dedupeMs},violations:a.violations||[],marked:a.marked||[],warned:true});T.save();}T.go(policyOf(a).requireFullscreen?'exam-fullscreen':'assessment');return;}
    Object.assign(session,{checks:null,ack:false});T.go('exam-check');};
  A['exam-recheck']=()=>{employeeOnly();T.refreshSystemCheck();T.render();};
  A['exam-continue']=()=>{employeeOnly();if(!T.systemCheckPassed(session.checks))throw Error('Resolve the required checks first.');session.fullscreenError='';T.go(T.examPolicy().requireFullscreen?'exam-fullscreen':'exam-instructions');};
  T.enterExamFullscreen=async()=>{
    session.fullscreenError='';
    try{await T.examEnv.requestFullscreen();}catch(error){session.fullscreenError=error?.name==='NotAllowedError'||error?.name==='TypeError'?'The browser blocked full screen. Allow full screen for this site, then try again.':error?.message||'Full screen is not available in this browser.';}
    if(!session.fullscreenError&&!T.examEnv.fullscreenElement())session.fullscreenError='Full screen did not turn on. Allow full screen for this site, then try again.';
    if(session.fullscreenError){T.render();return false;}
    const a=T.active();
    if(a?.secure){const resumed=monitor.armed!==a.id;T.armExam(a.id);if(doc()?.querySelector('#dialog')?.open)T.closeDialog();T.go(T.view.page==='review'?'review':'assessment');if(resumed)T.toast('Assessment resumed. Your answers and the original deadline were preserved.');}
    else T.go('exam-instructions');
    return true;
  };
  A['exam-fullscreen']=()=>{employeeOnly();return T.enterExamFullscreen();};
  A['exam-return-fullscreen']=()=>{employeeOnly();if(doc()?.querySelector('#dialog')?.open)T.closeDialog();if(policyOf(T.active()).requireFullscreen&&!T.examEnv.fullscreenElement())return T.enterExamFullscreen();T.go(T.view.page==='review'?'review':'assessment');};
  A['exam-begin']=()=>{
    employeeOnly();
    if(!session.ack)throw Error('Confirm that you have read and understood the instructions.');
    if(!T.systemCheckPassed(session.checks)){T.go('exam-check');return;}
    const policy=T.examPolicy();
    if(policy.requireFullscreen&&!T.examEnv.fullscreenElement()){session.fullscreenError='Full screen was turned off before the assessment started. Enter full screen again.';T.go('exam-fullscreen');return;}
    const a=T.start(T.user.id); // resumes an existing attempt instead of creating a second one
    if(!a.secure){Object.assign(a,{secure:true,acknowledgedAt:new Date().toISOString(),securityPolicy:{violationLimit:policy.violationLimit,requireFullscreen:policy.requireFullscreen,dedupeMs:policy.dedupeMs},violations:[],marked:[],warned:true,timerWarnings:{}});T.save();}
    T.view.question=0;session.ack=false;T.armExam(a.id);T.go('assessment');
  };
  const activeOwn=()=>{employeeOnly();const a=T.active();if(!a)throw Error('No assessment is in progress.');return a;};
  A['exam-goto']=value=>{const a=activeOwn();T.view.question=Math.max(0,Math.min(Number(value)||0,a.snapshot.length-1));T.go('assessment');};
  A['exam-review']=()=>{activeOwn();T.go('review');};
  A['exam-mark']=qid=>{const a=activeOwn();const on=T.examMark(a.id,qid);T.render();announce(on?'Marked for review.':'Review mark removed.');};
  A['exam-clear']=qid=>{const a=activeOwn();T.examAnswer(a.id,qid,[]);T.render();announce('Response cleared.');};
  A['exam-end']=()=>{const a=activeOwn(),s=T.examStats(a);T.modal('Submit your assessment?',`<p>${s.answered} of ${s.total} questions answered.${s.unanswered?` <strong>${s.unanswered} unanswered question${s.unanswered>1?'s':''} will receive no marks.</strong>`:''}${s.marked?` ${s.marked} still marked for review.`:''}</p><p>You cannot change your answers after submitting.</p><div class="dialog-actions">${b('Keep working','close')}${b('Submit assessment','exam-submit',a.id,'primary')}</div>`);};
  A['exam-submit']=id=>{employeeOnly();const a=own(id);if(!a)throw Error('Attempt unavailable.');const already=a.state!=='IN_PROGRESS';T.finish(a.id,Date.now(),'MANUAL');if(doc()?.querySelector('#dialog')?.open)T.closeDialog();T.view.result=a.id;T.go('result');if(!already)T.toast('Assessment submitted.');};
  A['exam-demo-time']=seconds=>{const a=activeOwn(),target=Date.now()+Number(seconds)*1000;if(target<a.expires){a.expires=target;a.timerWarnings={};T.save();}T.examTick();T.toast('Demo deadline updated for this attempt only.');};
  A['exam-reset']=()=>{employeeOnly();T.modal('Reset demo assessment?',`<p>This restores <strong>${e(T.user.name)}</strong>'s fictional assessment records: attempts, assignments, feedback, pre-tests and notifications for this demo employee only.</p><p>Other demo users and administrator changes are kept.</p><div class="dialog-actions">${b('Cancel','close')}${b('Reset demo assessment','exam-confirm-reset','','primary')}</div>`);};
  A['exam-confirm-reset']=()=>{
    employeeOnly();const id=T.user.id,fresh=T.seed(),mine=r=>r.employee===id;
    T.disarmExam();T.examEnv.exitFullscreen();
    for(const key of ['attempts','assignments','feedback','notifications','pretests'])if(Array.isArray(T.state[key]))T.state[key]=T.state[key].filter(r=>!mine(r)).concat((fresh[key]||[]).filter(mine));
    Object.assign(session,{checks:null,ack:false,fullscreenError:'',ready:null,saveOk:true});T.save();
    if(doc()?.querySelector('#dialog')?.open)T.closeDialog();T.view.result=null;T.view.question=0;T.go(T.queue(id).length?'gate':'overview');T.toast('Demo assessment records restored for this employee.');
  };
  const logout=A.logout;A.logout=()=>{T.disarmExam();T.examEnv.exitFullscreen();Object.assign(session,{checks:null,ack:false,fullscreenError:'',ready:null});logout();};
  T.gateActions=new Set(['exam-recheck','exam-continue','exam-fullscreen','exam-return-fullscreen','exam-begin','exam-goto','exam-review','exam-mark','exam-clear','exam-end','exam-submit','exam-demo-time','exam-reset','exam-confirm-reset']);

  // Answer selection updates the page in place so keyboard focus stays on the chosen option.
  const refreshQuestion=(a,q)=>{
    const d=doc();if(!d?.querySelectorAll)return;const s=T.examStats(a),pct=Math.round(s.answered/s.total*100),answer=a.answers[q.id]||[];
    d.querySelectorAll('[data-count]').forEach(el=>{el.textContent=el.dataset.count==='percent'?pct:s[el.dataset.count];});
    d.querySelectorAll('.exam-option').forEach(el=>el.classList.toggle('chosen',!!el.querySelector('input')?.checked));
    const i=a.snapshot.indexOf(q),cell=d.querySelector(`.q-cell[data-index="${i}"]`),state=navState(a,q,i);if(cell?.setAttribute){cell.className='q-cell '+state.cls;cell.setAttribute('aria-label',state.label);}
    const bar=d.querySelector('#exam-bar');if(bar?.style)bar.style.width=pct+'%';
    const clear=d.querySelector('#exam-clear');if(clear)clear.disabled=!answer.length;
    const saved=d.querySelector('#exam-save');if(saved)saved.innerHTML=session.saveOk?ic('check')+' Answers saved in this browser':ic('alert')+' '+e(T.storageError||'Your last change could not be saved in this browser');
  };
  if(doc()?.addEventListener)doc().addEventListener('change',event=>{
    const el=event.target;
    if(el.name==='exam-ack'){session.ack=!!el.checked;const begin=doc().querySelector('#exam-begin');if(begin)begin.disabled=!session.ack;return;}
    if(el.name!=='exam-answer')return;
    const a=T.active();if(!a)return;const q=a.snapshot.find(x=>x.id===el.dataset?.question);if(!q)return;
    const values=q.type==='multiple'?(a.answers[q.id]||[]).filter(v=>v!==el.value).concat(el.checked?[el.value]:[]):el.checked?[el.value]:[];
    try{T.examAnswer(a.id,q.id,values);refreshQuestion(a,q);}catch(error){T.toast(error.message);if(a.state!=='IN_PROGRESS'){T.view.result=a.id;T.go('result');}}
  });
  // Single initial render, after every script has registered its views.
  if(doc()?.querySelector)T.render();
})();
