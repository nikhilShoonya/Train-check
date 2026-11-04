/* Prototype evaluation model. No production security, calendar or delivery claims. */
(() => {
  'use strict';
  const T=TC;
  T.upgrade=state=>{
    for(const key of ['pretests','reviews','audit','reportSchedules'])state[key]??=[];
    state.demoDate??='2026-11-04';
    state.calendar??={weekdays:[1,2,3,4,5],holidays:[],label:'Illustrative Monday–Friday UTC calendar; not Finvasia policy'};
    state.employees.forEach((p,i)=>{p.location??=i%2?'Demo location B':'Demo location A';p.grade??=i%3?'Demo G2':'Demo G1';});
    state.trainings.forEach(t=>{
      t.scheduleMode??='next-working';t.delayDays??=7;t.showExplanations??=false;t.pretestEnabled??=false;t.followups??=[30,60,90];t.itemMinimum??=10;
      t.refresherText??='Review the training material. Follow the documented process, record relevant facts and ask the designated owner when unsure.';
      t.refresherUrl??='';t.trainer??=t.owner;
      t.competencies??=[{id:t.id+'-C1',name:'Applies the documented process',description:'Uses the training’s process accurately in relevant work.'},{id:t.id+'-C2',name:'Recognises and escalates exceptions',description:'Seeks guidance and escalates cases outside their authority.'}];
    });
    state.questions.forEach(q=>{q.competency??=state.trainings.find(t=>t.id===q.training)?.competencies[0]?.name||q.topic;q.explanation??='Use the approved process and seek guidance when required.';q.level??='L2';});
    state.assignments.forEach(a=>{a.assigned??=a.completed?.slice(0,10)||state.demoDate;if(a.completed&&!a.dueAt)a.dueAt=a.completed;});
    return state;
  };
  const seed=T.seed;T.seed=()=>T.upgrade(seed());T.upgrade(T.state);
  const load=T.load;T.load=()=>T.upgrade(load());
  T.demoNow=()=>Date.parse(T.state.demoDate+'T12:00:00Z');
  T.addDays=(date,days)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  T.isWorking=date=>T.state.calendar.weekdays.includes(new Date(date+'T00:00:00Z').getUTCDay())&&!T.state.calendar.holidays.includes(date);
  T.workingDays=(from,to)=>{let n=0,d=from;while(d<to){d=T.addDays(d,1);if(T.isWorking(d))n++;if(n>3660)break;}return n;};
  T.dueDate=(completed,training)=>{
    const day=completed.slice(0,10);if(training.scheduleMode==='same-day')return day;
    if(training.scheduleMode==='delay')return T.addDays(day,training.delayDays);
    let next=day;for(let i=0;i<370;i++){next=T.addDays(next,1);if(T.isWorking(next))return next;}throw Error('The demo calendar has no eligible working day.');
  };
  T.recordCompletion=(a,date)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Enter a valid completion date.');
    if(a.completed)throw Error('Completion is already recorded.');
    const t=T.state.trainings.find(t=>t.id===a.training);a.completed=date+'T00:00:00Z';a.dueAt=T.dueDate(a.completed,t)+'T00:00:00Z';a.due=true;a.scheduleSnapshot={mode:t.scheduleMode,delay:t.delayDays,calendar:structuredClone(T.state.calendar)};
  };
  const history=T.history;T.history=(employee,training)=>history(employee,training).filter(a=>a.kind!=='PRE');
  const queue=T.queue;T.queue=employee=>queue(employee).filter(a=>!a.dueAt||Date.parse(a.dueAt)<=T.demoNow());
  const start=T.start;T.start=(employee,now=Date.now())=>{const a=start(employee,now);if(a.showExplanations===undefined){const t=T.state.trainings.find(t=>t.id===a.training);a.showExplanations=t.showExplanations;a.trainingSnapshot={title:t.name,refresherText:t.refresherText,refresherUrl:t.refresherUrl};T.save();}return a;};
  const finish=T.finish;T.finish=(id,now=Date.now())=>{
    const a=T.state.attempts.find(a=>a.id===id);if(a?.kind==='PRE'){
      if(a.state!=='IN_PROGRESS')return a;let total=0,earned=0;
      a.snapshot.forEach(q=>{total+=q.marks;const selected=a.answers[q.id]||[];if(selected.length===q.correct.length&&q.correct.every(c=>selected.includes(c)))earned+=q.marks;});
      if(total<=0)throw Error('Pre-test marks are invalid.');a.score=earned/total*100;a.status=T.pass(a.score,a.threshold)?'PASSED':'NOT_PASSED';a.state=now>=a.expires?'TIMED_OUT':'SUBMITTED';a.submitted=new Date(now).toISOString();a.topics=[];
      T.state.pretests.push({employee:a.employee,training:a.training,score:a.score,attempt:a.id,date:a.submitted});T.save();return a;
    }
    return finish(id,now);
  };
  T.startPre=(employee,training,now=Date.now())=>{
    const assignment=T.state.assignments.find(a=>a.employee===employee&&a.training===training),t=T.state.trainings.find(t=>t.id===training);
    if(!assignment||assignment.completed||!t.pretestEnabled||!t.active)throw Error('Pre-test must be enabled and taken before training completion.');
    if(T.queue(employee).length)throw Error('Complete your due post-training assessments first.');
    const active=T.state.attempts.find(a=>a.employee===employee&&a.training===training&&a.state==='IN_PROGRESS');if(active)return active;
    if(T.state.pretests.some(p=>p.employee===employee&&p.training===training))throw Error('Pre-test already submitted.');
    const a={id:crypto.randomUUID(),employee,training,kind:'PRE',number:1,threshold:t.threshold,maxAttempts:1,showExplanations:false,state:'IN_PROGRESS',started:now,expires:now+t.minutes*60000,snapshot:structuredClone(T.shuffle(T.pool(t)).slice(0,t.count)).map(q=>({...q,options:T.shuffle(q.options)})),answers:{}};
    T.state.attempts.push(a);T.save();return a;
  };
  T.gain=(pre,post)=>({absolute:post-pre,normalised:pre===100?null:(post-pre)/(100-pre)*100});
  T.reviewTasks=user=>T.scope(user).filter(a=>a.completed).flatMap(a=>{
    const t=T.state.trainings.find(t=>t.id===a.training);
    return t.followups.map(period=>{const due=T.addDays(a.completed.slice(0,10),period),type=user.role==='employee'?'SELF':'MANAGER',review=T.state.reviews.find(r=>r.employee===a.employee&&r.training===a.training&&r.period===period&&r.type===type);return {id:a.id+'|'+period,assignment:a,period,due,type,review,status:review?'SUBMITTED':due>T.state.demoDate?'NOT_DUE':due<T.state.demoDate?'OVERDUE':'PENDING'};});
  });
  T.reviewPair=(employee,training,period,competency)=>{
    const get=type=>T.state.reviews.find(r=>r.employee===employee&&r.training===training&&r.period===period&&r.type===type)?.responses.find(x=>x.competency===competency)?.rating??null;
    const self=get('SELF'),manager=get('MANAGER');return {self,manager,gap:self===null||manager===null?null:manager-self};
  };
  T.submitReview=(user,id,responses)=>{
    if(!['employee','manager'].includes(user.role))throw Error('This role cannot submit a behaviour review.');
    const task=T.reviewTasks(user).find(t=>t.id===id);if(!task||task.status==='NOT_DUE'||task.review)throw Error('This review is not available or is already submitted.');
    const t=T.state.trainings.find(t=>t.id===task.assignment.training);
    if(responses.length!==t.competencies.length||t.competencies.some(c=>!responses.some(r=>r.competency===c.id)))throw Error('Rate every assigned competency.');
    responses.forEach(r=>{if(!Number.isInteger(r.rating)||r.rating<1||r.rating>5||r.example.trim().length<10)throw Error('Every competency requires a rating from 1 to 5 and a specific example of at least 10 characters.');});
    T.state.reviews.push({id:crypto.randomUUID(),employee:task.assignment.employee,training:t.id,period:task.period,type:task.type,reviewer:user.id,responses,date:new Date().toISOString()});T.save();
  };
  T.itemAnalysis=assignments=>{
    const allowed=new Set(assignments.map(a=>a.employee+'|'+a.training)),groups=new Map();
    T.state.attempts.filter(a=>a.kind!=='PRE'&&a.state!=='IN_PROGRESS'&&allowed.has(a.employee+'|'+a.training)).forEach(a=>a.snapshot.forEach(q=>{
      const selected=a.answers[q.id]||[];if(!selected.length)return;const key=q.id+'|'+q.version;
      if(!groups.has(key))groups.set(key,{question:q,training:a.training,total:0,correct:0});const g=groups.get(key);g.total++;if(selected.length===q.correct.length&&q.correct.every(c=>selected.includes(c)))g.correct++;
    }));
    return [...groups.values()].map(g=>{const pct=g.correct/g.total*100,min=T.state.trainings.find(t=>t.id===g.training).itemMinimum;return {...g,pct,incorrect:100-pct,flag:g.total<min?'Insufficient sample':100-pct>70?'Review required':'No flag',minimum:min};});
  };
  T.nps=feedback=>feedback.length?((feedback.filter(f=>f.recommendation>=9).length-feedback.filter(f=>f.recommendation<=6).length)/feedback.length*100):null;
  T.notify=(key,record)=>{if(!T.state.notifications.some(n=>n.key===key))T.state.notifications.push({key,...record,date:new Date().toISOString(),channel:'IN_APP_DEMO',delivery:'Recorded locally; no external delivery'});};
  T.runDemoJobs=()=>{
    T.state.assignments.filter(a=>a.completed&&!T.history(a.employee,a.training).length&&a.dueAt?.slice(0,10)<=T.state.demoDate).forEach(a=>{
      const days=T.workingDays(a.dueAt.slice(0,10),T.state.demoDate);
      for(const [threshold,recipient] of [[2,T.state.employees.find(p=>p.id===a.employee).manager],[5,'H001']])if(days>=threshold)T.notify('pending|'+a.id+'|'+threshold,{employee:a.employee,training:a.training,recipient,text:`Pending assessment escalation after ${threshold} demo working days.`});
    });
    T.accounts.filter(u=>u.role==='manager').forEach(u=>T.reviewTasks(u).filter(t=>t.status==='OVERDUE').forEach(t=>T.notify('review|'+t.id,{employee:t.assignment.employee,training:t.assignment.training,recipient:u.id,text:`${t.period}-day behaviour review is overdue.`})));
    T.save();
  };
  T.fullHeaders=['id','training','topic','competency','type','question','option_a','option_b','option_c','option_d','options_extra','correct','explanation','difficulty','marks','level','language','active'];
  const legacyValidate=T.validateImport;
  T.validateImport=(text,kind)=>{
    const rows=T.parseCSV(text.replace(/^\uFEFF/,''));
    if(kind!=='questions'||!rows[0]?.includes('competency'))return legacyValidate(text,kind);
    const headers=rows[0].map(s=>s.trim());if(T.fullHeaders.some(h=>!headers.includes(h)))throw Error('Use the full question template. Required headers: '+T.fullHeaders.join(', '));
    const seen=new Set();return rows.slice(1).map((cells,i)=>{
      const v=Object.fromEntries(headers.map((h,j)=>[h,cells[j]?.trim()||''])),errors=[];
      for(const key of ['id','training','topic','competency','type','question','option_a','option_b','correct','difficulty','marks','level','language','active'])if(!v[key])errors.push(key+': required');
      if(Object.values(v).some(x=>/^\s*[=+@]/.test(x)))errors.push('formula: use plain values, not formulas');
      if(!T.state.trainings.some(t=>t.id===v.training))errors.push('training: unknown ID');
      if(seen.has(v.id)||T.state.questions.some(q=>q.id===v.id))errors.push('duplicate: record already exists; skipped');seen.add(v.id);
      if(!['single','multiple','boolean','scenario'].includes(v.type))errors.push('type: single, multiple, boolean or scenario');
      const optionTexts=[v.option_a,v.option_b,v.option_c,v.option_d,...(v.options_extra?v.options_extra.split('|'):[])].filter(Boolean),correct=v.correct.split(/[|,]/).map(c=>c.trim().toUpperCase().charCodeAt(0)-65);
      if(optionTexts.length<2||optionTexts.length>12||new Set(optionTexts).size!==optionTexts.length)errors.push('options: provide 2–12 distinct options');
      if(correct.some(n=>!Number.isInteger(n)||n<0||n>=optionTexts.length)||new Set(correct).size!==correct.length)errors.push('correct: letters must refer to distinct existing options');
      if(v.type!=='multiple'&&correct.length!==1)errors.push('correct: exactly one option required');
      if(v.type==='boolean'&&(optionTexts.length!==2||!optionTexts.some(x=>x.toLowerCase()==='true')||!optionTexts.some(x=>x.toLowerCase()==='false')))errors.push('options: True / False requires True and False');
      if(!['Easy','Medium','Hard'].includes(v.difficulty))errors.push('difficulty: Easy, Medium or Hard');
      if(!Number.isFinite(+v.marks)||+v.marks<=0||+v.marks>100)errors.push('marks: use a positive number up to 100');
      if(v.level!=='L2')errors.push('level: objective assessment questions must be L2');
      if(!['English','Hindi','Hinglish'].includes(v.language))errors.push('language: English, Hindi or Hinglish');
      if(!['Active','Inactive'].includes(v.active))errors.push('active: Active or Inactive');
      return {row:i+2,value:v,errors,question:{id:v.id,training:v.training,topic:v.topic,competency:v.competency,type:v.type,text:v.question,options:optionTexts.map((text,j)=>({id:String(j),text})),correct:correct.map(String),explanation:v.explanation,difficulty:v.difficulty,marks:+v.marks,level:v.level,language:v.language,active:v.active==='Active',version:1}};
    });
  };
})();
