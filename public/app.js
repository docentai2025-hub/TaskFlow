'use strict';
const $ = id => document.getElementById(id);
let tasks = [];
let currentUser = null;
let authMode = 'login';
let currentFilter = 'all';
let editingTaskId = null;
let toastTimeout;

async function request(url, options={}) {
  const headers = options.body ? {'Content-Type':'application/json'} : {};
  let response;
  try { response = await fetch(url, {credentials:'same-origin', ...options, headers:{...headers,...options.headers}}); }
  catch { throw new Error('Cannot connect to the server. Please check that it is running.'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function toast(message, error=false) {
  clearTimeout(toastTimeout);
  $('toast').textContent = message;
  $('toast').classList.toggle('error',error);
  $('toast').classList.remove('hidden');
  toastTimeout = setTimeout(()=>$('toast').classList.add('hidden'),3500);
}
function showScreen(loggedIn) {
  $('loading').classList.add('hidden');
  $('auth-screen').classList.toggle('hidden',loggedIn);
  $('app-screen').classList.toggle('hidden',!loggedIn);
}
function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === 'register';
  $('tab-login').classList.toggle('selected',!registering);
  $('tab-register').classList.toggle('selected',registering);
  $('tab-login').setAttribute('aria-selected',String(!registering));
  $('tab-register').setAttribute('aria-selected',String(registering));
  $('name-group').classList.toggle('hidden',!registering);
  $('name').required = registering;
  $('password').autocomplete = registering ? 'new-password':'current-password';
  $('auth-title').textContent = registering ? 'Create your account':'Welcome back';
  $('auth-subtitle').textContent = registering ? 'Start organizing your college tasks.':'Sign in to see your tasks.';
  $('auth-submit').textContent = registering ? 'Create account':'Log in';
}
async function signIn(event) {
  event.preventDefault();
  const payload = {email:$('email').value.trim(), password:$('password').value};
  if (authMode === 'register') payload.name = $('name').value.trim();
  const submit = $('auth-submit');
  submit.disabled = true;
  try {
    const result = await request(`/api/auth/${authMode === 'register' ? 'register':'login'}`, {method:'POST',body:JSON.stringify(payload)});
    $('auth-form').reset();
    await initializeUser(result.user);
    toast('Welcome to TaskFlow!');
  } catch(e) { toast(e.message,true); }
  finally { submit.disabled = false; }
}
async function initializeUser(user) {
  currentUser=user;
  $('sidebar-name').textContent=user.name;
  $('avatar').textContent=(user.name[0]||'S').toUpperCase();
  $('welcome-title').textContent=`Hello, ${user.name.split(' ')[0]} 👋`;
  $('today-text').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  showScreen(true);
  await loadTasks();
}
async function loadTasks() {
  try {tasks=(await request('/api/tasks')).tasks;renderTasks();}
  catch(e) {toast(e.message,true);}
}
function taskCounts() {
  return {total:tasks.length,pending:tasks.filter(x=>x.status==='pending').length,
    progress:tasks.filter(x=>x.status==='in_progress').length,
    completed:tasks.filter(x=>x.status==='completed').length};
}
function formatDate(value) {
  if (!value) return '';
  const [year,month,day]=value.split('-').map(Number);
  return new Date(year,month-1,day).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
}
function isOverdue(value,status) {
  if(!value || status==='completed') return false;
  const now=new Date();
  const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  return value<today;
}
function el(tag,className,text) {
  const n=document.createElement(tag);
  if(className)n.className=className;
  if(text!==undefined)n.textContent=text;
  return n;
}
function renderTasks() {
  const counts=taskCounts();
  $('count-total').textContent=counts.total;
  $('count-pending').textContent=counts.pending;
  $('count-progress').textContent=counts.progress;
  $('count-completed').textContent=counts.completed;
  $('task-summary').textContent=`${counts.total} task${counts.total===1?'':'s'}`;
  let visible=tasks.filter(t => currentFilter==='all' || (currentFilter==='active' ? t.status!=='completed':t.status==='completed'));
  const q=$('task-search').value.toLowerCase().trim();
  if(q)visible=visible.filter(t=>(t.title+' '+t.description).toLowerCase().includes(q));
  const container=$('task-list');
  container.replaceChildren();
  $('empty-state').classList.toggle('hidden',visible.length!==0);
  $('empty-note').textContent=tasks.length===0?'Create your first task to get started.':'Try another search or filter.';
  $('empty-add').classList.toggle('hidden',tasks.length>0);
  for(const task of visible) {
    const row=el('article','task-row');
    const check=el('button',`task-complete${task.status==='completed'?' done':''}`,task.status==='completed'?'✓':'');
    check.type='button';check.setAttribute('aria-label',task.status==='completed'?'Mark task as pending':'Mark task as complete');
    check.onclick=()=>updateTask(task,{status:task.status==='completed'?'pending':'completed'});
    const body=el('div','task-body');
    body.append(el('h3',`task-title${task.status==='completed'?' done':''}`,task.title));
    if(task.description)body.append(el('p','task-desc',task.description));
    const meta=el('div','task-meta');
    meta.append(el('span',`tag tag-${task.priority}`,`${task.priority} priority`));
    meta.append(el('span','status',task.status==='in_progress'?'◐ In progress':task.status==='completed'?'✓ Completed':'◷ Pending'));
    if(task.due_date)meta.append(el('span',`due${isOverdue(task.due_date,task.status)?' overdue':''}`,`${isOverdue(task.due_date,task.status)?'Overdue · ':'Due · '}${formatDate(task.due_date)}`));
    body.append(meta);
    const actions=el('div','task-actions');
    const edit=el('button','action-button','Edit');edit.type='button';edit.onclick=()=>openTaskModal(task);
    const del=el('button','action-button danger','Delete');del.type='button';del.onclick=()=>deleteTask(task);
    actions.append(edit,del);
    row.append(check,body,actions);container.append(row);
  }
}
function openTaskModal(task=null) {
  editingTaskId=task?task.id:null;
  $('modal-title').textContent=task?'Edit task':'Create a task';
  $('save-task').textContent=task?'Save changes':'Save task';
  $('task-form').reset();
  if(task) {
    $('task-title').value=task.title;
    $('task-description').value=task.description;
    $('task-priority').value=task.priority;
    $('task-status').value=task.status;
    $('task-date').value=task.due_date||'';
  }
  $('modal').classList.remove('hidden');
  $('task-title').focus();
}
function closeTaskModal(){ $('modal').classList.add('hidden');editingTaskId=null; }
async function saveTask(event) {
  event.preventDefault();
  const task={title:$('task-title').value.trim(),description:$('task-description').value.trim(),priority:$('task-priority').value,status:$('task-status').value,due_date:$('task-date').value||null};
  const wasEdit=editingTaskId!==null;
  $('save-task').disabled=true;
  try {
    await request(wasEdit?`/api/tasks/${editingTaskId}`:'/api/tasks',{method:wasEdit?'PUT':'POST',body:JSON.stringify(task)});
    closeTaskModal();await loadTasks();toast(wasEdit?'Task updated.':'Task created.');
  } catch(e){toast(e.message,true);}
  finally {$('save-task').disabled=false;}
}
async function updateTask(oldTask,update) {
  try {
    await request(`/api/tasks/${oldTask.id}`,{method:'PUT',body:JSON.stringify({...oldTask,...update})});
    await loadTasks();toast('Task status updated.');
  } catch(e){toast(e.message,true);}
}
async function deleteTask(task) {
  if(!confirm(`Delete "${task.title}"?`))return;
  try {await request(`/api/tasks/${task.id}`,{method:'DELETE'});await loadTasks();toast('Task deleted.');}
  catch(e){toast(e.message,true);}
}
async function logout() {
  try {await request('/api/auth/logout',{method:'POST'});} catch(e){toast(e.message,true);return;}
  tasks=[];currentUser=null;showScreen(false);setAuthMode('login');
}

$('tab-login').onclick=()=>setAuthMode('login');
$('tab-register').onclick=()=>setAuthMode('register');
$('auth-form').onsubmit=signIn;
$('logout-btn').onclick=logout;
$('open-add').onclick=()=>openTaskModal();
$('empty-add').onclick=()=>openTaskModal();
$('task-form').onsubmit=saveTask;
$('close-modal').onclick=closeTaskModal;
$('cancel-modal').onclick=closeTaskModal;
$('modal').onclick=e=>{if(e.target===$('modal'))closeTaskModal();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').classList.contains('hidden'))closeTaskModal();});
$('task-search').oninput=renderTasks;
for(const button of document.querySelectorAll('[data-filter]')) {
  button.onclick=()=>{currentFilter=button.dataset.filter;for(const b of document.querySelectorAll('[data-filter]'))b.classList.toggle('active',b===button);renderTasks();};
}
(async()=>{
  try {const {user}=await request('/api/auth/me');await initializeUser(user);}
  catch {showScreen(false);}
})();
