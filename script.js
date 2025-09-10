// =====عنصر های اصلی =====
const wrap = document.getElementById('game');  
const bin = document.getElementById('bin');
const msg = document.getElementById('message');
const levelEl = document.getElementById('level');
const recycledEl = document.getElementById('recycled');
const paw = document.getElementById('paw');

// ===== انواع آشغال‌ها =====
const trashTypes = ["🍌","🍕","💩","🥑","🤡","🍟","🥤","🧃","🍫","🧦"];

// ===== وضعیت بازی =====
let level = 1;
let trashCount = 3;
let recycled = 0;  
let activeTrash = new Set();
let velocities = new Map();
let dragging = null;
let pointerOffset = {x:0, y:0};
let mouse = {x: window.innerWidth/2, y: window.innerHeight/2};
let speedScale = 1;           // مقیاس سرعت آشغال‌ها

// ===== صداها =====
let bgAudio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"); // آهنگ بک گراند
bgAudio.loop = true; 
let started = false;          // بررسی اینکه آیا آهنگ شروع شده یا خیر

// ===== پخش صدای گرفتن آشغال =====
function playCatch(){ 
  const catchAudio = new Audio("https://freesound.org/data/previews/66/66717_931655-lq.mp3");
  catchAudio.volume = 0.3; 
  catchAudio.play(); 
}

// ===== شروع بازی و آهنگ با اینتراکشن کاربر =====
function userStart(){
  if(!started){ 
    bgAudio.play();
    started = true;
    document.getElementById('tips').style.display='none'; // مخفی کردن نکات
  }
}
// فعال‌سازی با کلیک یا لمس کردن
window.addEventListener('pointerdown', userStart, {once:false});
window.addEventListener('touchstart', userStart, {once:false});

// ===== فانکشن های کمکی =====
function rand(min,max){ return Math.random()*(max-min)+min; }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function binRect(){ return bin.getBoundingClientRect(); }
function isOverBin(el){ 
  const t = el.getBoundingClientRect(); 
  const b = binRect(); 
  return !(t.right<b.left || t.left>b.right || t.bottom<b.top || t.top>b.bottom); 
}

// ===== بروز کردن موقعیت ماوس یا لمس =====
function updateMouse(e){ 
  if(e.touches){ // اگر صفحه لمسی باشه
    mouse.x = e.touches[0].clientX; 
    mouse.y = e.touches[0].clientY; 
  } else {     // اگر ماوس باشه
    mouse.x = e.clientX; 
    mouse.y = e.clientY; 
  } 
}
window.addEventListener('mousemove', updateMouse);
window.addEventListener('touchmove', updateMouse);

// ===== درگ و دراپ آشغال =====
function startDrag(e){
  e.preventDefault();
  dragging = e.currentTarget;
  let clientX = e.clientX, clientY = e.clientY;
  if(e.touches){
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  const r = dragging.getBoundingClientRect();
  pointerOffset.x = clientX - r.left;
  pointerOffset.y = clientY - r.top;
  velocities.set(dragging, {vx:0, vy:0}); // متوقف شدن حرکت ایموجی زمان درگ کردن
  if(e.pointerId) dragging.setPointerCapture(e.pointerId);
}

function dragMove(e){
  if(dragging){
    e.preventDefault();
    let clientX=e.clientX, clientY=e.clientY;
    if(e.touches){ clientX=e.touches[0].clientX; clientY=e.touches[0].clientY; }
    const a = wrap.getBoundingClientRect();
    const nx = clamp(clientX-a.left-pointerOffset.x,0,a.width-dragging.offsetWidth);
    const ny = clamp(clientY-a.top-pointerOffset.y,0,a.height-dragging.offsetHeight);
    dragging.style.left = nx+'px';
    dragging.style.top = ny+'px';
  }
}

function endDrag(e){
  if(dragging){
    e.preventDefault();
    if(e.pointerId) dragging.releasePointerCapture(e.pointerId);
    if(isOverBin(dragging)) recycle(dragging); 
    dragging = null;
  }
}

// اضافه کردن درگ و لمس هر آشغال
function attachDragEvents(span){
  span.addEventListener('pointerdown', startDrag);
  span.addEventListener('pointermove', dragMove);
  span.addEventListener('pointerup', endDrag);
  span.addEventListener('touchstart', startDrag,{passive:false});
  span.addEventListener('touchmove', dragMove,{passive:false});
  span.addEventListener('touchend', endDrag);
}

// ===== ایجاد آشغال جدید =====
function createTrash(num){
  const area = wrap.getBoundingClientRect();
  const created = [];
  for(let i=0;i<num;i++){
    const span=document.createElement('span');
    span.className='trash wiggle';
    span.textContent=choice(trashTypes);
    const baseSize=clamp(64-level*6,28,56);
    const size=rand(baseSize*0.8,baseSize*1.15);
    span.style.fontSize=size+"px"; span.style.width=size+"px"; span.style.height=size+"px";

    let x=rand(area.left+20,area.right-20-size);
    let y=rand(area.top+100,area.bottom-150-size);
    const b=binRect();
    if(Math.hypot((x+size/2)-(b.left+b.width/2),(y+size/2)-(b.top+b.height/2))<200){x=area.left+40;y=area.top+140;}
    span.style.left=(x-area.left)+'px'; span.style.top=(y-area.top)+'px';

    const vx=rand(-0.6,0.6)*speedScale; const vy=rand(-0.6,0.6)*speedScale;
    velocities.set(span,{vx,vy});

    attachDragEvents(span);
    span.addEventListener('click',()=>{span.style.transform='scale(1.18)'; setTimeout(()=>span.style.transform='',120);});

    wrap.appendChild(span); activeTrash.add(span); created.push(span);
  }
  return created;
}

// ===== بازیافت آشغال =====
function recycle(el){
  if(!activeTrash.has(el)) return;
  activeTrash.delete(el); el.remove();
  recycled++; recycledEl.textContent=recycled;
  playCatch(); bin.classList.add('bump'); setTimeout(()=>bin.classList.remove('bump'),130);
  if(activeTrash.size===0){
    level++; speedScale*=1.08; trashCount+=2; levelEl.textContent=level;
    showMessage("Level up! New trash incoming...",1200); 
    setTimeout(()=>createTrash(trashCount),600);
  } else {
    showMessage(["Nice toss!","Squeaky clean!","Yay!","Crunch!","Recycling win! "][Math.floor(Math.random()*5)],700);
  }
}

// ===== نمایش پیام کوتاه =====
function showMessage(text,ms=1000){
  msg.textContent=text;
  clearTimeout(showMessage._t);
  showMessage._t=setTimeout(()=>msg.textContent='',ms);
}

// ===== حرکت آشغال =====
function update(dt){
  const area=wrap.getBoundingClientRect();
  activeTrash.forEach(el=>{
    const v=velocities.get(el)||{vx:0,vy:0};
    const r=el.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const dx=cx-mouse.x, dy=cy-mouse.y;
    const dist=Math.hypot(dx,dy);
    const fearRadius=140-Math.min(level*5,60);
    if(dist<fearRadius){ 
      const f=(fearRadius-dist)/fearRadius; 
      v.vx+=(dx/dist)*0.6*f*speedScale; 
      v.vy+=(dy/dist)*0.6*f*speedScale; 
    }
    v.vx+=rand(-0.03,0.03); v.vy+=rand(-0.03,0.03);
    const maxV=1.8*speedScale; v.vx=clamp(v.vx,-maxV,maxV); v.vy=clamp(v.vy,-maxV,maxV); 
    v.vx*=0.98; v.vy*=0.98;

    let nx=r.left+v.vx, ny=r.top+v.vy;
    const minX=area.left, maxX=area.right-r.width, minY=area.top+90, maxY=area.bottom-r.height-130;
    if(nx<minX){nx=minX; v.vx*=-0.8;} if(nx>maxX){nx=maxX; v.vx*=-0.8;}
    if(ny<minY){ny=minY; v.vy*=-0.8;} if(ny>maxY){ny=maxY; v.vy*=-0.8;}
    el.style.left=(nx-area.left)+'px'; el.style.top=(ny-area.top)+'px';
    velocities.set(el,v);
  });
}
let last=performance.now();
function loop(t){
  const dt=(t-last)/16.67; last=t; 
  if(!dragging) update(dt); 
  requestAnimationFrame(loop); 
}

// ===== هرج و مرج پتوسط پنجه گربه =====
function chaos(){
  paw.classList.add('show'); 
  setTimeout(()=>paw.classList.remove('show'),600);
  const a=wrap.getBoundingClientRect();
  activeTrash.forEach(el=>{
    const size=el.getBoundingClientRect();
    const nx=rand(0,a.width-size.width), ny=rand(90,a.height-size.height-130);
    el.style.left=nx+'px'; el.style.top=ny+'px';
    velocities.set(el,{vx:rand(-1,1),vy:rand(-1,1)});
  });
  scheduleChaos();
}
function scheduleChaos(){
  const next=rand(7000,12000); 
  clearTimeout(scheduleChaos._t); 
  scheduleChaos._t=setTimeout(chaos,next);
}

// ===== راه‌اندازی اولیه بازی =====
function init(){
  level=1; trashCount=3; recycled=0; speedScale=1;
  levelEl.textContent=level; recycledEl.textContent=recycled;
  showMessage('Catch trash, drag to the bin!');
  [...activeTrash].forEach(el=>el.remove()); 
  activeTrash.clear(); velocities.clear();
  createTrash(trashCount); 
  scheduleChaos(); 
  requestAnimationFrame(loop);
}

// شروع بازی
init(); 
