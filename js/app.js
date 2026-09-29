const $=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL=["#4f46e5","#0f9d7a","#e0781f","#c026d3","#0891b2","#dc2626"];
// >>> EDIT THESE DEFAULTS (shown to your teacher). url = your Google Apps Script Web App URL <<<
const DEFAULT={name:'Your Name',roll:'Roll No.',course:'B.Tech CSE • AI Study Hub Project',url:''};
const TOOLS=[["badge","Resume","AI Resume Builder","ATS-friendly resume from your details","jsPDF","form handling · prompt design · AI API integration"],
["edit_note","Notes Gen","Notes Generator","Turn raw text into structured Markdown notes","marked.js","summarization prompts · Markdown rendering"],
["slideshow","Slides","AI Slide Deck Generator","Topic → slides, export a real .pptx","PptxGenJS","JSON parsing · dynamic DOM · file export"],
["account_tree","Mind Map","Syllabus Mind Map","Zoom, pan, collapse; click a node for AI detail","markmap.js","hierarchical data · visualization"],
["table_chart","Sheets","Google Sheets Backend","Read/write a live sheet via Apps Script + AI insight","Apps Script","REST · fetch() · Sheets as free backend"],
["quiz","Quiz AI","AI Quiz Generator","MCQs with instant feedback and final score","JSON","structured AI output · stateful UI"],
["smart_toy","Doubt Tutor","Doubt-Solving Tutor","Chat tutor that remembers the conversation","Chat","conversation state · chat UI"],
["style","Flashcards","3D Flashcards","Flip cards for quick revision","CSS 3D","CSS animation · AI-generated data"],
["calendar_clock","Planner","Study Planner","Colour-coded timetable up to exam day","Planner","scheduling data → grid UI"],
["document_scanner","Notes OCR","Notes from Photo","Tesseract OCR + AI summary","OCR + AI","OCR · summarization"]];
TOOLS.forEach((t,i)=>{const b=document.createElement('button');b.className='tab';b.id='nb'+(i+1);b.innerHTML=`<span class="material-symbols-outlined">${t[0]}</span><span>${t[1]}</span>`;b.onclick=()=>show(i+1);$('nav').appendChild(b);
 const s=$('t'+(i+1));s.insertAdjacentHTML('afterbegin',`<div class="th"><div class="ic c${i%4}"><span class="material-symbols-outlined">${t[0]}</span></div><div class="tt"><h2>${t[2]}</h2><p>${t[3]}</p></div><span class="bdg">${t[4]}</span></div>`);s.insertAdjacentHTML('beforeend',`<div class="goal">Skills: ${t[5]}</div>`)});
function show(i){for(let k=1;k<=10;k++){$('t'+k).classList.toggle('on',k==i);$('nb'+k).classList.toggle('on',k==i)}$('nb'+i).scrollIntoView({inline:'center',block:'nearest'});location.hash='t'+i}
show(+(location.hash.slice(2))||1);
// ---------- settings ----------
const MODELS={gemini:'gemini-2.5-flash',openai:'gpt-4o-mini',anthropic:'claude-haiku-4-5-20251001'};
const cfg=()=>{const s=JSON.parse(localStorage.getItem('cfg')||'{}'),o={...DEFAULT};for(const k in s)if(s[k])o[k]=s[k];return o};
function defModel(){$('k_m').value=MODELS[$('k_p').value]}
function saveCfg(){localStorage.setItem('cfg',JSON.stringify({prov:$('k_p').value,model:$('k_m').value,key:$('k_k').value.trim(),url:$('k_u').value.trim(),name:$('k_a').value.trim(),roll:$('k_b').value.trim(),course:$('k_c').value.trim()}));$('modal').classList.remove('on');init();loadRows()}
function init(){const c=cfg();$('k_p').value=c.prov||'gemini';$('k_m').value=c.model||MODELS[$('k_p').value];$('k_k').value=c.key||'';$('k_u').value=c.url||'';$('k_a').value=c.name;$('k_b').value=c.roll;$('k_c').value=c.course;
 $('mode').textContent=c.key?'● Live AI · '+$('k_p').value:'⚡ Demo Mode';document.querySelectorAll('.uname').forEach(e=>e.textContent=c.name);document.querySelectorAll('.uroll').forEach(e=>e.textContent=c.roll);document.querySelectorAll('.ucourse').forEach(e=>e.textContent=c.course)}
init();
// ---------- AI layer ----------
async function post(url,headers,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||j.error||'API error '+r.status);return j}
async function ask(tool,prompt,o={}){
 const c=cfg();
 if(!c.key){await sleep(900);return DEMO[tool]}
 const msgs=(o.messages||[{role:'user',content:prompt}]).map(m=>({...m}));
 if(o.json)msgs[msgs.length-1].content+='\n\nReturn ONLY valid JSON. No code fences, no commentary.';
 const sys=o.system||'';let t;
 if(c.prov=='gemini'){const b={contents:msgs.map(m=>({role:m.role=='user'?'user':'model',parts:[{text:m.content}]}))};if(sys)b.systemInstruction={parts:[{text:sys}]};if(o.json)b.generationConfig={responseMimeType:'application/json'};
  t=(await post(`https://generativelanguage.googleapis.com/v1beta/models/${c.model}:generateContent?key=${c.key}`,{},b)).candidates?.[0]?.content?.parts?.[0]?.text}
 else if(c.prov=='openai'){t=(await post('https://api.openai.com/v1/chat/completions',{Authorization:'Bearer '+c.key},{model:c.model,messages:sys?[{role:'system',content:sys},...msgs]:msgs})).choices[0].message.content}
 else{t=(await post('https://api.anthropic.com/v1/messages',{'x-api-key':c.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},{model:c.model,max_tokens:2000,system:sys||undefined,messages:msgs})).content[0].text}
 if(!o.json)return t;
 return JSON.parse(t.replace(/^```(?:json)?|```$/gm,'').trim());
}
async function go(btn,out,fn){const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Thinking…'}out.innerHTML='<span class="msg">Working…</span>';try{await fn()}catch(e){out.innerHTML='<span class="err">⚠ '+esc(e.message)+'</span>'}if(btn){btn.disabled=false;btn.textContent=old}}
const md=t=>marked.parse(t);
// ---------- export helpers ----------
const cp=id=>{navigator.clipboard.writeText($(id).innerText)};
function save(name,txt,type='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;a.click()}
const txt=(n,id)=>save(n,$(id).innerText);
function pdf(name,id){const t=$(id).innerText;if(!t.trim())return alert('Generate something first');const d=new jspdf.jsPDF(),L=d.splitTextToSize(t,180);let y=15;L.forEach(l=>{if(y>280){d.addPage();y=15}d.text(l,15,y);y+=6});d.save(name)}
// ---------- 1 Resume / 2 Notes ----------
const resume=b=>go(b,$('r_out'),async()=>{$('r_out').innerHTML=md(await ask('resume',`Write a professional ATS-friendly resume in Markdown. Don't invent facts.\nName:${r_n.value}\nContact:${r_c.value}\nObjective:${r_o.value}\nEducation:${r_e.value}\nSkills:${r_s.value}\nExperience:${r_x.value}`))});
const notes=b=>go(b,$('n_out'),async()=>{$('n_out').innerHTML=md(await ask('notes','Convert this text into short bullet-point study notes with markdown headings:\n'+n_in.value))});
// ---------- 3 Slides ----------
let SL=[],si=0;
const slides=b=>go(b,$('p_out'),async()=>{SL=await ask('slides',`Create 6 slides on "${p_in.value}". JSON: [{"title":"","bullets":["","",""]}] with 3-4 bullets each.`,{json:true});si=0;$('p_nav').style.display='block';drawSl()});
function drawSl(){const s=SL[si];$('p_out').innerHTML=`<div class="slide"><h3>${esc(s.title)}</h3><ul>${s.bullets.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></div>`;$('p_c').textContent=`Slide ${si+1} / ${SL.length}`}
const sl=d=>{si=(si+d+SL.length)%SL.length;drawSl()};
function pptx(){if(!SL.length)return alert('Generate slides first');const p=new PptxGenJS();SL.forEach(s=>{const x=p.addSlide();x.background={color:'4F46E5'};x.addText(s.title,{x:.5,y:.4,w:9,h:1,fontSize:32,bold:true,color:'FFFFFF'});x.addText(s.bullets.map(t=>({text:t,options:{bullet:true,breakLine:true}})),{x:.7,y:1.6,w:8.6,h:3.5,fontSize:20,color:'FFFFFF'})});p.writeFile({fileName:(p_in.value||'slides')+'.pptx'})}
// ---------- 4 Mind map ----------
let MM,TR;
const mind=b=>go(b,$('m_det'),async()=>{const t=await ask('mind','Convert this syllabus into a nested Markdown outline (# main topic, ## units, ### sub-topics, - key points):\n'+m_in.value);TR=TR||new markmap.Transformer();const {root}=TR.transform(t.replace(/^```\w*|```$/gm,''));$('mm').innerHTML='';MM=markmap.Markmap.create('#mm',{colorFreezeLevel:2},root);$('m_det').innerHTML='<span class="msg">Click a node to get AI details.</span>'});
$('mm').addEventListener('click',e=>{const f=e.target.closest('foreignObject');const t=f?.textContent.trim();if(t)go(null,$('m_det'),async()=>{$('m_det').innerHTML='<b>'+esc(t)+'</b>'+md(await ask('detail',`Explain "${t}" in 4 short bullet points for a student.`))})});
// ---------- 5 Sheets ----------
let rows=JSON.parse(localStorage.getItem('rows')||'[["Student","Subject","Marks"],["Aarav","Maths",82],["Diya","Physics",74],["Kabir","Maths",91]]');
function drawT(){$('s_tb').innerHTML='<table>'+rows.map((r,i)=>'<tr>'+r.map(c=>`<${i?'td':'th'}>${esc(c)}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</table>'}
async function loadRows(){const u=cfg().url;$('s_st').textContent=u?'Connected to Google Sheet':'Demo data (add Web App URL in Settings)';if(u){try{rows=await (await fetch(u)).json()}catch(e){$('s_st').textContent='⚠ Could not read sheet: '+e.message}}drawT()}
async function addRow(b){const r=[s_n.value,s_s.value,s_m.value];if(!r[0])return;const u=cfg().url;if(u){await fetch(u,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({name:r[0],subject:r[1],marks:r[2]})});await sleep(1200);await loadRows()}else{rows.push(r);localStorage.setItem('rows',JSON.stringify(rows));drawT()}s_n.value=s_s.value=s_m.value=''}
const insight=b=>go(b,$('s_ai'),async()=>{$('s_ai').innerHTML=md(await ask('insight','Give a 3-bullet insight (trends, top/low performers) on this marks data:\n'+JSON.stringify(rows)))});
loadRows();
// ---------- 6 Quiz ----------
const quiz=b=>go(b,$('q_out'),async()=>{const qs=await ask('quiz',`Make 5 MCQs from: ${q_in.value}. JSON: [{"q":"","options":["","","",""],"answer":0}] where answer is the index of the correct option.`,{json:true});let sc=0,n=0;const o=$('q_out');o.innerHTML='';qs.forEach((q,i)=>{const d=document.createElement('div');d.innerHTML=`<b>${i+1}. ${esc(q.q)}</b>`;q.options.forEach((t,j)=>{const x=document.createElement('button');x.className='opt';x.textContent=t;x.onclick=()=>{if(d.dataset.done)return;d.dataset.done=1;if(j==q.answer){sc++;x.classList.add('ok')}else{x.classList.add('no');d.children[q.answer+1].classList.add('ok')}if(++n==qs.length)o.insertAdjacentHTML('beforeend',`<h2>🎉 Final score: ${sc} / ${qs.length}</h2>`)};d.appendChild(x)});o.appendChild(d)})});
// ---------- 7 Chat ----------
let hist=[];
async function chat(){const m=c_in.value.trim();if(!m)return;c_in.value='';bub('u',m);hist.push({role:'user',content:m});const b=bub('a','…');try{const r=await ask('chat',m,{messages:hist,system:`You are a helpful tutor for ${c_sub.value||'any subject'}. Explain simply with examples.`});b.innerHTML=md(r);hist.push({role:'assistant',content:r})}catch(e){b.textContent='⚠ '+e.message;hist.pop()}}
function bub(c,t){const d=document.createElement('div');d.className='bub '+c;d.textContent=t;$('c_box').appendChild(d);$('c_box').scrollTop=1e9;return d}
// ---------- 8 Flashcards ----------
let FC=[],fi=0;
const cards=b=>go(b,$('f_out'),async()=>{FC=await ask('cards',`Make 8 flashcards from: ${f_in.value}. JSON: [{"question":"","answer":""}]`,{json:true});fi=0;$('f_nav').style.display='block';drawF()});
function drawF(){const c=FC[fi];$('f_out').innerHTML=`<div class="fc" onclick="this.classList.toggle('f')"><div><span>${esc(c.question)}</span><span>${esc(c.answer)}</span></div></div>`;$('f_c').textContent=`${fi+1} / ${FC.length} · click card to flip`}
const fcNext=d=>{fi=(fi+d+FC.length)%FC.length;drawF()};const shuf=()=>{FC.sort(()=>Math.random()-.5);fi=0;drawF()};
// ---------- 9 Planner ----------
const plan=b=>go(b,$('pl_out'),async()=>{const p=await ask('plan',`Create a balanced day-wise study plan starting ${new Date().toDateString()} until ${pl_d.value||'7 days later'} (max 7 days). Subjects: ${pl_s.value}. Hours/day: ${pl_h.value}. JSON: [{"day":"","slots":[{"time":"","subject":""}]}]. Vary the balance each run.`,{json:true});const subs=[...new Set(p.flatMap(d=>d.slots.map(s=>s.subject)))];
$('pl_out').innerHTML='<table><tr><th>Day</th><th>Schedule</th></tr>'+p.map(d=>`<tr><td><b>${esc(d.day)}</b></td><td>${d.slots.map(s=>`<span class="tag" style="background:${COL[subs.indexOf(s.subject)%6]}">${esc(s.time)} · ${esc(s.subject)}</span>`).join('')}</td></tr>`).join('')+'</table>'});
// ---------- 10 OCR ----------
const ocr=b=>go(b,$('o_out'),async()=>{const f=$('o_f').files[0];if(!f)throw new Error('Choose an image first');const r=await Tesseract.recognize(f,'eng');$('o_t').value=r.data.text;$('o_out').innerHTML='<span class="msg">Text extracted. Fix any errors, then press Summarize.</span>'});
const osum=b=>go(b,$('o_out'),async()=>{$('o_out').innerHTML='<div class="row"><div><b>Original</b><p>'+esc($('o_t').value).replace(/\n/g,'<br>')+'</p></div><div><b>Summary</b>'+md(await ask('osum','Summarize these notes into key points:\n'+$('o_t').value))+'</div></div>'});
// ---------- Demo data (used when no API key is set) ----------
const DEMO={
resume:"# Riya Sharma\nriya@email.com | +91 90000 00000\n\n## Objective\nMotivated B.Tech CSE student seeking a software internship to apply strong programming skills.\n\n## Education\n- B.Tech Computer Science, 2nd Year — CGPA 8.4\n\n## Skills\n- Python, HTML/CSS/JavaScript, SQL\n\n## Experience\n- Built a college event website\n- Hackathon finalist",
notes:"# Photosynthesis\n## Key Idea\n- Plants convert light energy into chemical energy\n## Inputs\n- Sunlight, water, carbon dioxide\n## Outputs\n- Glucose and oxygen",
slides:[{title:"What is Climate Change?",bullets:["Long-term shift in temperatures","Driven mainly by greenhouse gases","Accelerated since the Industrial Revolution"]},{title:"Causes",bullets:["Burning fossil fuels","Deforestation","Industrial agriculture"]},{title:"Impacts",bullets:["Rising sea levels","Extreme weather","Loss of biodiversity"]},{title:"Solutions",bullets:["Renewable energy","Reforestation","Sustainable transport"]}],
mind:"# Data Structures\n## Unit 1\n### Arrays\n### Linked Lists\n### Stacks\n## Unit 2\n### Trees\n### Graphs\n## Unit 3\n### Sorting\n### Searching",
detail:"- A core topic in the syllabus\n- Learn the definition first\n- Practise with small examples\n- Know common applications",
insight:"- Average marks are strong (~82)\n- **Kabir** leads in Maths\n- Physics scores trail slightly; add practice",
quiz:[{q:"Which planet is closest to the Sun?",options:["Venus","Mercury","Earth","Mars"],answer:1},{q:"Which is the largest planet?",options:["Jupiter","Saturn","Neptune","Earth"],answer:0},{q:"Earth's natural satellite is?",options:["Phobos","Titan","Moon","Europa"],answer:2}],
chat:"Great question! Think of it like this: start with the basic idea, then try a simple example. (Demo mode — add an API key in Settings for real answers.)",
cards:[{question:"Powerhouse of the cell?",answer:"Mitochondria"},{question:"What carries genetic information?",answer:"DNA"},{question:"Basic unit of life?",answer:"The cell"}],
plan:[{day:"Day 1",slots:[{time:"6–8 PM",subject:"Maths"},{time:"8–10 PM",subject:"Physics"}]},{day:"Day 2",slots:[{time:"6–8 PM",subject:"Chemistry"},{time:"8–10 PM",subject:"Maths"}]},{day:"Day 3",slots:[{time:"6–8 PM",subject:"Physics"},{time:"8–10 PM",subject:"Chemistry"}]}],
osum:"- Key points condensed from your notes\n- Verify OCR text before summarizing"};
