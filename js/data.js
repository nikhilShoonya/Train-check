/* Synthetic fixtures and browser-only domain simulation. Never use for real assessments. */
(() => {
  'use strict';
  const TC = globalThis.TC = {};
  TC.key = 'traincheck-prototype-v1';
  TC.roles = {employee:'Employee', manager:'Manager', admin:'L&D Admin', hr:'HR / Leadership'};
  TC.accounts = [
    {id:'E001', name:'Aarav Mehta', role:'employee', email:'employee@traincheck.demo'},
    {id:'E002', name:'Isha Rao', role:'employee', email:'clear@traincheck.demo'},
    {id:'M001', name:'Neha Kapoor', role:'manager', email:'manager@traincheck.demo'},
    {id:'M002', name:'Kabir Das', role:'manager', email:'manager2@traincheck.demo'},
    {id:'A001', name:'Riya Anand', role:'admin', email:'admin@traincheck.demo'},
    {id:'H001', name:'Dev Malhotra', role:'hr', email:'hr@traincheck.demo'}
  ];
  const names = ['Aarav Mehta','Isha Rao','Rohan Sen','Maya Shah','Vikram Sethi','Tara Nair','Arjun Roy','Sara Jain','Neil Bose','Anika Sood'];
  const banks = [
    [
      ['Identity checks','A customer submits incomplete identity documents. What should you do?','Follow the verification checklist and request missing information','Skip the missing fields','Approve based on a verbal promise','Use another customer’s record'],
      ['Risk awareness','You notice unusual account activity. What is the appropriate next step?','Escalate through the designated internal process','Ignore it until the customer complains','Discuss the customer on social media','Promise that no review will occur'],
      ['Data handling','Which approach protects customer information?','Use approved systems and authorised access','Share documents in personal chat','Save documents on a shared public drive','Reuse customer passwords'],
      ['Identity checks','Why should verification steps be documented?','To keep a traceable record of the checks performed','To replace all future checks','To guarantee a risk-free account','To avoid internal review'],
      ['Risk awareness','A colleague asks you to bypass a required check. What should you do?','Follow the approved process and raise the concern','Bypass it for a colleague','Delete the checklist','Let the customer decide'],
      ['Data handling','Who should access a customer verification file?','Only authorised people with a work-related need','Every employee','Anyone with the link','All customers'],
      ['Identity checks','A document conflicts with information in an application. What is appropriate?','Clarify the discrepancy using the approved process','Choose whichever value looks better','Change the document yourself','Ignore the discrepancy'],
      ['Risk awareness','What does a risk indicator mean?','It calls for review under the applicable process','It proves wrongdoing','It permits public disclosure','It removes the need for documentation'],
      ['Data handling','Which is a safe way to share a case with an authorised reviewer?','Use the approved secure channel','Use a public file link','Use a personal email address','Post it in an open group'],
      ['Identity checks','What should you do when unsure about a verification requirement?','Consult the approved guidance or designated support','Invent a new requirement','Skip verification','Copy an unrelated case']
    ],
    [
      ['Communication','A customer is upset about a delay. What should you do first?','Listen and acknowledge the concern','Interrupt with a sales pitch','Promise an unverified resolution time','End the conversation'],
      ['Resolution','What makes a useful case note?','A factual summary and agreed next steps','Personal judgements','Only the customer’s name','An invented resolution'],
      ['Communication','How should you explain an unfamiliar product term?','Use plain language and check understanding','Use more jargon','Avoid answering','Assume understanding'],
      ['Resolution','You cannot resolve a request within your authority. What next?','Escalate with relevant context','Promise an exception','Close it as resolved','Share it publicly'],
      ['Privacy','Before discussing account-specific details, you should:','Complete the approved identity checks','Ask for the customer’s password','Skip checks for urgent calls','Read details to anyone who calls'],
      ['Communication','Which response sets a clear expectation?','Explain the next step and confirmed follow-up process','Guarantee an outcome you cannot control','Say nothing can be done','Give an invented deadline'],
      ['Resolution','How should a recurring issue be handled?','Document it and raise it through the improvement process','Hide the pattern','Delete earlier complaints','Blame the customer'],
      ['Privacy','Which information belongs in a routine case note?','Only information needed to resolve the case','Full passwords','Unrelated personal details','Private opinions about colleagues'],
      ['Communication','What is active listening?','Clarifying and summarising the customer’s concern','Preparing an answer without listening','Repeating a script regardless of context','Interrupting frequently'],
      ['Resolution','Before closing a case, what should you verify?','The resolution and follow-up are accurately recorded','The case count is high','No one will review it','The customer never contacts us again']
    ],
    [
      ['Phishing','An unexpected email requests your password. What should you do?','Report it through the approved security channel','Reply with the password','Forward it to customers','Click every link'],
      ['Access','How should you protect a work account?','Use approved authentication and keep credentials private','Share credentials with the team','Use a public password list','Disable all security checks'],
      ['Data safety','You receive a suspicious attachment. What is appropriate?','Avoid opening it and report it','Run it to see what happens','Upload it to an open group','Disable protection first'],
      ['Access','You leave your workstation briefly. What should you do?','Lock the screen','Leave customer files open','Give someone your password','Turn off audit logging'],
      ['Phishing','Which detail can indicate a suspicious link?','An unexpected destination or misleading domain','A familiar topic alone','A short message alone','A weekday delivery'],
      ['Data safety','Where should work documents be stored?','In approved work storage','On any public sharing site','In a personal social account','On an unknown USB drive'],
      ['Access','An unknown caller asks for a one-time code. What should you do?','Do not share it and follow reporting guidance','Read it aloud','Send a screenshot','Approve every prompt'],
      ['Phishing','A message creates urgency to bypass a normal process. What next?','Verify using a known trusted channel','Follow it immediately','Share account details','Ignore all future messages'],
      ['Data safety','You suspect that work data was exposed. What should you do?','Report promptly using the incident process','Delete all evidence','Wait indefinitely','Discuss details publicly'],
      ['Access','Why are individual accounts useful?','They support appropriate access and accountability','They allow passwords to be shared','They remove the need for permissions','They guarantee no mistakes']
    ]
  ];
  TC.seed = () => {
    const trainings = ['KYC & AML Compliance','Customer Handling','Cybersecurity Awareness'].map((name,i)=>({id:'T00'+(i+1), name, category:['Compliance','Customer experience','Information security'][i], description:['Recognise risk indicators and follow a consistent customer verification process.','Build clear conversations, protect privacy and resolve customer concerns.','Recognise threats and protect customer and company information.'][i], owner:'Riya Anand', count:10, minutes:15, threshold:70, maxAttempts:3, active:true, feedback:true, random:true, schedule:'Next eligible demo login'}));
    const employees = names.map((name,i)=>({id:'E'+String(i+1).padStart(3,'0'),name,department:i<5?'Operations':'Customer Experience',manager:i<5?'M001':'M002'}));
    const questions = banks.flatMap((bank,t)=>bank.map((r,i)=>({id:`Q${t+1}${String(i+1).padStart(2,'0')}`,training:trainings[t].id,topic:r[0],text:r[1],options:r.slice(2).map((text,j)=>({id:String(j),text})),correct:['0'],type:'single',marks:1,difficulty:i<4?'Easy':i<8?'Medium':'Hard',language:'English',active:true,version:1})));
    // Include all supported response patterns without adding dependencies.
    Object.assign(questions[8],{type:'boolean',text:'Customer verification records should be shared only through approved secure channels.',options:[{id:'0',text:'True'},{id:'1',text:'False'}],correct:['0']});
    Object.assign(questions[18],{type:'multiple',text:'Which actions support a clear customer conversation? Select all that apply.',options:[{id:'0',text:'Listen without interrupting'},{id:'1',text:'Clarify the customer’s concern'},{id:'2',text:'Promise an unverified deadline'},{id:'3',text:'Ignore the question'}],correct:['0','1']});
    questions[28].type='scenario';
    const assignments = employees.flatMap((e,i)=>trainings.slice(0,i===0?2:3).map((t,j)=>({id:`EN-${e.id}-${t.id}`,employee:e.id,training:t.id,batch:'November pilot',completed:'2026-11-0'+(j+1)+'T04:00:00Z',due:true,retake:false,ack:false})));
    const attempts=[];
    employees.slice(1).forEach((e,i)=>trainings.forEach((t,j)=>{
      if((i+j)%4===2)return;
      const scores=(i===2&&j===0)?[40,50,60]:[(i+j)%4===0?60:80+(i%3)*10];
      scores.forEach((score,n)=>attempts.push({id:`SEED-${e.id}-${t.id}-${n}`,employee:e.id,training:t.id,score,status:score>=70?'PASSED':'NOT_PASSED',state:'SUBMITTED',submitted:'2026-11-03T08:00:00Z',threshold:70,maxAttempts:3,number:n+1,topics:[],snapshot:[],answers:{}}));
    }));
    assignments.forEach(a=>{const h=attempts.filter(x=>x.employee===a.employee&&x.training===a.training);if(h.length){a.due=false;a.retake=!h.some(x=>x.status==='PASSED')&&h.length<3;}});
    // Clear-account fixture has no blocking work.
    assignments.filter(a=>a.employee==='E002').forEach(a=>{a.due=false;});
    return {version:1,trainings,employees,questions,assignments,attempts,feedback:[],observations:[],notifications:[],batches:[{id:'B001',name:'November pilot',training:'T001',trainer:'Riya Anand',date:'2026-11-01'}],kpis:[{training:'T001',name:'Verification rework rate',unit:'%',before:8.2,after:5.6,direction:'Lower is better',owner:'Demo Operations owner',source:'Synthetic quality-review fixture',beforePeriod:'1–30 September 2026',afterPeriod:'1–31 October 2026',cohort:'November pilot (illustrative comparison only)'}]};
  };
  TC.load = () => {try {const raw=localStorage.getItem(TC.key); if(!raw)return TC.seed();const s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.attempts)||!Array.isArray(s.questions)||!Array.isArray(s.assignments)||!Array.isArray(s.trainings)||!Array.isArray(s.employees))throw Error();return s;}catch {TC.storageError='Saved demo data could not be read. A fresh in-memory demo is shown; reset demo data to replace the saved copy.';return TC.seed();}};
  TC.save = () => {try{localStorage.setItem(TC.key,JSON.stringify(TC.state));TC.storageError='';return true;}catch{TC.storageError='Browser storage is unavailable or full. Changes remain in this tab only; do not close it.';return false;}};
  TC.state=TC.load();
  TC.history = (employee,training)=>TC.state.attempts.filter(a=>a.employee===employee&&a.training===training&&a.state!=='IN_PROGRESS');
  TC.status = a => {const h=TC.history(a.employee,a.training);if(h.some(x=>x.status==='PASSED'))return 'PASSED';if(h.length)return h.length>=h.at(-1).maxAttempts?'NEEDS_RETRAINING':'NOT_PASSED';return 'PENDING';};
  TC.queue = employee => TC.state.assignments.filter(a=>a.employee===employee&&a.due&&a.completed&&!['PASSED','NEEDS_RETRAINING'].includes(TC.status(a))).sort((a,b)=>a.completed.localeCompare(b.completed)||a.id.localeCompare(b.id));
  TC.scope = user => TC.state.assignments.filter(a=>user.role==='employee'?a.employee===user.id:user.role==='manager'?TC.state.employees.find(e=>e.id===a.employee)?.manager===user.id:true);
  TC.pass = (score,threshold)=>score>=threshold;
  TC.pool = training => {
    const eligible=TC.state.questions.filter(q=>q.training===training.id&&q.active);
    if(eligible.length<training.count)throw Error('There are not enough active questions. The L&D administrator must update the question bank.');
    if(eligible.some(q=>!Number.isFinite(q.marks)||q.marks<=0||!q.correct.length||q.correct.some(id=>!q.options.some(o=>o.id===id))))throw Error('The question pool contains invalid marks or answers. Ask L&D to correct it.');
    if(training.mix){if(Object.values(training.mix).reduce((a,b)=>a+b,0)!==training.count)throw Error('Difficulty counts must total the questions per attempt.');for(const [difficulty,count] of Object.entries(training.mix)){if(!Number.isInteger(count)||count<0||eligible.filter(q=>q.difficulty===difficulty).length<count)throw Error('Not enough active '+difficulty+' questions for this difficulty mix.');}}
    return eligible;
  };
  TC.shuffle = list => {const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  TC.start = (employee,now=Date.now()) => {
    const assignment=TC.queue(employee)[0];if(!assignment)throw Error('No assessment is due.');
    const active=TC.state.attempts.find(a=>a.employee===employee&&a.training===assignment.training&&a.state==='IN_PROGRESS');if(active)return active;
    const t=TC.state.trainings.find(t=>t.id===assignment.training),history=TC.history(employee,t.id);
    if(!t.active||history.length>=t.maxAttempts)throw Error('This assessment is unavailable. Contact the demo L&D administrator.');
    let pool=TC.pool(t);
    if(t.mix)pool=Object.entries(t.mix).flatMap(([difficulty,count])=>TC.shuffle(pool.filter(q=>q.difficulty===difficulty)).slice(0,count));
    if(t.random)pool=TC.shuffle(pool);
    const snapshot=structuredClone(pool.slice(0,t.count)).map(q=>({...q,options:t.random?TC.shuffle(q.options):q.options}));
    const a={id:crypto.randomUUID(),employee,training:t.id,state:'IN_PROGRESS',number:history.length+1,threshold:t.threshold,maxAttempts:t.maxAttempts,started:now,expires:now+t.minutes*60000,snapshot,answers:{}};
    TC.state.attempts.push(a);TC.save();return a;
  };
  TC.finish = (id,now=Date.now()) => {
    const a=TC.state.attempts.find(a=>a.id===id);if(!a)throw Error('Attempt not found.');if(a.state!=='IN_PROGRESS')return a;
    let earned=0,total=0;const topics={};
    a.snapshot.forEach(q=>{const answers=a.answers[q.id]||[];const ok=answers.length===q.correct.length&&q.correct.every(c=>answers.includes(c));total+=q.marks;earned+=ok?q.marks:0;topics[q.topic]??={earned:0,total:0};topics[q.topic].total+=q.marks;topics[q.topic].earned+=ok?q.marks:0;});
    a.score=total?earned/total*100:0;a.status=TC.pass(a.score,a.threshold)?'PASSED':'NOT_PASSED';a.state=now>=a.expires?'TIMED_OUT':'SUBMITTED';a.submitted=new Date(now).toISOString();a.topics=Object.entries(topics).map(([name,v])=>({name,score:v.earned/v.total*100}));
    const en=TC.state.assignments.find(x=>x.employee===a.employee&&x.training===a.training);en.due=false;en.retake=a.status==='NOT_PASSED'&&a.number<a.maxAttempts;en.ack=false;
    if(a.status==='NOT_PASSED'&&a.number>=a.maxAttempts)TC.state.notifications.push({employee:a.employee,training:a.training,text:'Needs Re-training. Demo notification recorded for manager and HR/L&D.',date:a.submitted});
    TC.save();return a;
  };
  TC.loginRetakes = employee => {TC.state.assignments.filter(a=>a.employee===employee&&a.retake&&a.ack).forEach(a=>a.due=true);TC.save();};
  TC.csv = rows => rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
  TC.parseCSV = text => {const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}else value+=c;}if(quoted)throw Error('Unclosed quoted field. Check your CSV.');row.push(value);if(row.some(v=>v.trim()))rows.push(row);return rows;};
  TC.validateImport = (text,kind) => {
    const rows=TC.parseCSV(text.replace(/^\uFEFF/,''));const expected=kind==='questions'?['id','training','topic','question','option_a','option_b','correct']:['employee','training','completion_date'];
    if(!rows.length||expected.some((h,i)=>rows[0][i]?.trim()!==h))throw Error('Expected headers: '+expected.join(', '));
    const seen=new Set();return rows.slice(1).map((cells,i)=>{const value=Object.fromEntries(expected.map((h,j)=>[h,cells[j]?.trim()||'']));const errors=[];
      expected.forEach(h=>{if(!value[h])errors.push(h+': required');if(/^\s*[=+@]/.test(value[h]))errors.push(h+': formulas are not allowed');});
      if(!TC.state.trainings.some(t=>t.id===value.training))errors.push('training: use an existing training ID');
      const key=kind==='questions'?value.id:value.employee+'-'+value.training;
      if(seen.has(key)||(kind==='questions'?TC.state.questions.some(q=>q.id===value.id):TC.state.assignments.some(a=>a.employee===value.employee&&a.training===value.training&&a.completed)))errors.push('duplicate: record already exists; skipped');seen.add(key);
      if(kind==='questions'&&!['A','B'].includes(value.correct))errors.push('correct: enter A or B');
      if(kind!=='questions'){if(!TC.state.employees.some(e=>e.id===value.employee))errors.push('employee: unknown employee ID');if(!/^\d{4}-\d{2}-\d{2}$/.test(value.completion_date)||Number.isNaN(Date.parse(value.completion_date))||new Date(value.completion_date).toISOString().slice(0,10)!==value.completion_date)errors.push('completion_date: use a valid YYYY-MM-DD date');}
      return {row:i+2,value,errors};
    });
  };
})();
