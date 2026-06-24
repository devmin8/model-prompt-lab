import * as THREE from "three";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const canvas = $("#scene");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071827);
scene.fog = new THREE.FogExp2(0x071827, .0055);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 500);
camera.position.set(0, 67, 80);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0xc8e9ff, 0x10230c, 1.7));
const moon = new THREE.DirectionalLight(0xffffff, 2.4);
moon.position.set(-15, 45, 20); moon.castShadow = true;
moon.shadow.mapSize.set(2048,2048); moon.shadow.camera.left=-80;moon.shadow.camera.right=80;moon.shadow.camera.top=55;moon.shadow.camera.bottom=-55;
scene.add(moon);

const mat = (color, rough=.72, metal=.04) => new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const field = new THREE.Group(); scene.add(field);
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(110,70), mat(0x357f22));
pitch.rotation.x=-Math.PI/2; pitch.receiveShadow=true; field.add(pitch);
for(let x=-55;x<55;x+=10){const stripe=new THREE.Mesh(new THREE.PlaneGeometry(10,70),mat((Math.floor((x+55)/10)%2)?0x398926:0x2f7620));stripe.rotation.x=-Math.PI/2;stripe.position.set(x+.01,.012,0);field.add(stripe)}
const lineMat = new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.92});
function line(points, loop=false){const g=new THREE.BufferGeometry().setFromPoints(points.map(([x,z])=>new THREE.Vector3(x,.05,z)));const l=loop?new THREE.LineLoop(g,lineMat):new THREE.Line(g,lineMat);field.add(l)}
line([[-55,-35],[55,-35],[55,35],[-55,35]],true); line([[0,-35],[0,35]]);
const circlePts=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;circlePts.push([Math.cos(a)*9.15,Math.sin(a)*9.15])}line(circlePts,true);
for(const side of [-1,1]){const x=side*55;line([[x,-20],[x-side*16.5,-20],[x-side*16.5,20],[x,20]]);line([[x,-9],[x-side*5.5,-9],[x-side*5.5,9],[x,9]])}

function goal(x){
  const g=new THREE.Group(), post=mat(0xf5f5f5,.3,.2), net=new THREE.LineBasicMaterial({color:0xdbe9ef,transparent:true,opacity:.35});
  const box=(w,h,d,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),post);m.position.set(0,y,z);g.add(m)};
  box(.25,5,.25,2.5,-8);box(.25,5,.25,2.5,8);box(.25,.25,16,5,0);
  for(let z=-8;z<=8;z+=2){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,z),new THREE.Vector3(x<0?-3:3,0,z),new THREE.Vector3(x<0?-3:3,5,z),new THREE.Vector3(0,5,z)]);g.add(new THREE.Line(geo,net))}
  for(let y=0;y<=5;y+=1){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,y,-8),new THREE.Vector3(x<0?-3:3,y,-8),new THREE.Vector3(x<0?-3:3,y,8),new THREE.Vector3(0,y,8)]);g.add(new THREE.Line(geo,net))}
  g.position.x=x;field.add(g)
}
goal(-55);goal(55);
for(const z of [-38,38])for(let x=-50;x<=50;x+=20){const b=new THREE.Mesh(new THREE.BoxGeometry(18,1.7,.8),mat(x%40?0x08141c:0x0645a0,.5,.2));b.position.set(x,.85,z);field.add(b)}
for(const x of [-52,52])for(const z of [-38,38]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.2,.35,30,8),mat(0x5e6e75,.4,.5));pole.position.set(x,15,z);field.add(pole);const lights=new THREE.PointLight(0xd7efff,70,115,1.5);lights.position.set(x,29,z);scene.add(lights);const panel=new THREE.Mesh(new THREE.BoxGeometry(7,3,.5),new THREE.MeshBasicMaterial({color:0xeaf8ff}));panel.position.set(x,29,z);panel.lookAt(0,0,0);field.add(panel)}

let homeColor=0x1656d9, awayColor=0xe63946;
const players=[];
function player(team,num,x,z,color,role="out"){
  const g=new THREE.Group();g.userData={team,num,base:new THREE.Vector3(x,0,z),target:new THREE.Vector3(x,0,z),role};
  const skin=mat(0x9d674c), kit=mat(color), shorts=mat(role==="ref"?0x050505:team==="home"?0xf2f4f8:0xffffff);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.7,.92,2.2,10),kit);torso.position.y=2.65;torso.castShadow=true;g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.52,12,10),skin);head.position.y=4.25;head.castShadow=true;g.add(head);
  const hips=new THREE.Mesh(new THREE.BoxGeometry(1.35,.75,.8),shorts);hips.position.y=1.35;g.add(hips);
  for(const sx of [-.42,.42]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.17,.15,1.35,8),skin);leg.position.set(sx,.45,0);g.add(leg)}
  g.position.set(x,0,z);scene.add(g);players.push(g);return g
}
function buildTeams(){
  players.forEach(p=>scene.remove(p));players.length=0;
  const home=[[1,-50,0],[2,-34,-21],[4,-35,-7],[5,-35,9],[3,-34,23],[6,-12,-17],[8,-10,8],[7,8,-23],[10,7,0],[11,8,22],[9,28,2]];
  const away=[[1,50,0],[2,34,22],[4,35,8],[5,35,-8],[3,34,-22],[6,13,17],[8,11,-7],[7,-7,23],[10,-6,0],[11,-7,-22],[9,-27,-2]];
  home.forEach(([n,x,z],i)=>player("home",n,x,z,i===0?0x20b76b:homeColor,i===0?"gk":"out"));
  away.forEach(([n,x,z],i)=>player("away",n,x,z,i===0?0xf2ca19:awayColor,i===0?"gk":"out"));
  player("ref",0,0,8,0x090909,"ref");
}
buildTeams();
const ball=new THREE.Mesh(new THREE.SphereGeometry(.48,16,12),mat(0xfafafa,.45));ball.castShadow=true;ball.position.set(0,.5,0);scene.add(ball);

const events=[
  {m:6,type:"save",team:"away",text:"What a save! Riverside's keeper claws away Reed's curling effort."},
  {m:12,type:"goal",team:"home",player:"9 ELI TURNER",num:"9",assist:"ASSIST: 10 M. REED",text:"GOAL! Turner meets Reed's pass and sweeps it into the far corner."},
  {m:24,type:"yellow",team:"away",player:"4 D. MORRIS",text:"Morris is booked for a late challenge in midfield."},
  {m:31,type:"corner",team:"away",text:"Corner to Riverside after a brave block from Northbank's captain."},
  {m:39,type:"goal",team:"away",player:"11 LEO SANTOS",num:"11",assist:"ASSIST: 7 K. ADAMS",text:"GOAL! Santos rises highest at the corner and powers home the equaliser."},
  {m:45,type:"half",text:"HALF TIME — a breathless first half ends level."},
  {m:52,type:"foul",team:"home",text:"Free kick Riverside. A mistimed tackle stops a dangerous break."},
  {m:58,type:"goal",team:"home",player:"10 MARCUS REED",num:"10",assist:"ASSIST: 8 O. CLARKE",text:"GOAL! Reed races onto Clarke's pass and drills it low beyond the keeper."},
  {m:67,type:"yellow",team:"away",player:"4 D. MORRIS",text:"A second yellow for Morris — Riverside are down to ten!"},
  {m:68,type:"red",team:"away",player:"4 D. MORRIS",text:"RED CARD! Morris is dismissed after his second booking."},
  {m:76,type:"save",team:"home",text:"Outstanding reaction save! Northbank survive a fierce close-range strike."},
  {m:84,type:"goal",team:"away",player:"7 KAI ADAMS",num:"7",assist:"ASSIST: 10 A. DIAZ",text:"GOAL! Ten-man Riverside level it with a brilliant counterattack."},
  {m:90,type:"penalty",team:"home",text:"PENALTY! Reed is clipped as he cuts inside. One last chance."},
  {m:90.5,type:"goal",team:"home",player:"10 MARCUS REED",num:"10",assist:"PENALTY",text:"GOAL! Reed sends the goalkeeper the wrong way. Ice-cold from the spot."},
  {m:91.5,type:"full",text:"FULL TIME — Northbank win a five-goal classic under the lights!"}
];
let elapsed=0,speed=1,playing=false,last=performance.now(),eventIndex=0,scores={home:0,away:0},goalTimer=0,flashTimer=0,statusTimer=0;
const eventEls=[];
events.filter(e=>["goal","yellow","red"].includes(e.type)).forEach(e=>{const marker=document.createElement("span");marker.className=`event-marker ${e.type==="yellow"?"card":e.type==="red"?"red":""}`;marker.style.left=`${Math.min(e.m/91.5*100,100)}%`;marker.textContent=e.type==="goal"?"⚽":"";marker.title=`${e.m}′ ${e.text}`;$("#timeline").append(marker);eventEls.push(marker)});
function setCommentary(e){$("#tickerMinute").textContent=`${Math.floor(e.m)}′`;$("#commentary").textContent=e.text}
function status(text){$("#statusPill").textContent=text;$("#statusPill").classList.add("show");statusTimer=2.5}
function showGoal(e){
  $("#scorerName").textContent=e.player.split(" ").slice(1).join(" ");$("#scorerNumber").textContent=e.num;$("#portraitNumber").textContent=e.num;$("#goalMinute").textContent=`${Math.floor(e.m)}′`;$("#assistText").textContent=e.assist;$("#goalCrest").textContent=e.team==="home"?$("#homeName").textContent[0]:"R";$("#goalCard").classList.add("show");goalTimer=6;
}
function showCard(e,red=false){$("#cardFlash").classList.toggle("red",red);$("#cardType").textContent=red?"RED CARD":e.m===67?"SECOND YELLOW":"YELLOW CARD";$("#cardPlayer").textContent=e.player;$("#cardFlash").classList.add("show");flashTimer=4}
function trigger(e){
  setCommentary(e);
  if(e.type==="goal"){scores[e.team]++;$(`#${e.team}Score`).textContent=scores[e.team];showGoal(e);status("GOAL");scatter(e.team)}
  if(e.type==="yellow")showCard(e);
  if(e.type==="red"){showCard(e,true);players.find(p=>p.userData.team==="away"&&p.userData.num===4).visible=false}
  if(e.type==="half"){status("HALF TIME");$("#phase").textContent="HALF TIME";setPhase("half");playing=false;setTimeout(()=>{if(elapsed<100){playing=true;last=performance.now();status("SECOND HALF")}},2400)}
  if(e.type==="corner")status("CORNER");
  if(e.type==="foul")status("FREE KICK");
  if(e.type==="penalty")status("PENALTY");
  if(e.type==="save")status("GREAT SAVE");
  if(e.type==="full"){playing=false;$("#phase").textContent="FULL TIME";setPhase("full");$("#finalHome").textContent=scores.home;$("#finalAway").textContent=scores.away;$("#fullTime").classList.add("show")}
}
function scatter(team){players.filter(p=>p.userData.team===team&&p.userData.role==="out").forEach((p,i)=>p.userData.target.set(p.position.x+(team==="home"?6:-6),0,p.position.z+(i-5)*.45))}
function setPhase(p){$$(".phases span").forEach(x=>x.classList.toggle("active",x.dataset.phase===p))}
function reset(){
  elapsed=0;eventIndex=0;scores={home:0,away:0};$("#homeScore").textContent=0;$("#awayScore").textContent=0;$("#goalCard").classList.remove("show");$("#cardFlash").classList.remove("show","red");$("#fullTime").classList.remove("show");$("#phase").textContent="FIRST HALF";setPhase("first");players.forEach(p=>{p.visible=true;p.position.copy(p.userData.base);p.userData.target.copy(p.userData.base)});ball.position.set(0,.5,0);$("#commentary").textContent="The teams emerge under the lights. Everything is set at Pitchside Stadium.";$("#tickerMinute").textContent="00′";playing=true;last=performance.now();status("KICK OFF")
}
function animateMatch(minute,dt){
  const cycle=minute*.11;
  players.forEach((p,i)=>{
    if(!p.visible)return;
    const idle=p.userData.role==="gk"?.6:p.userData.role==="ref"?2.2:3.4;
    if(Math.floor(minute*2+i)%17===0){p.userData.target.x=THREE.MathUtils.clamp(p.userData.base.x+Math.sin(cycle+i)*idle,-49,49);p.userData.target.z=THREE.MathUtils.clamp(p.userData.base.z+Math.cos(cycle*.8+i)*idle,-31,31)}
    p.position.lerp(p.userData.target,Math.min(1,dt*1.8));
    if(p.userData.role==="out"&&p.position.distanceTo(ball.position)<7)p.lookAt(ball.position.x,p.position.y,ball.position.z);
  });
  let targetX=Math.sin(minute*.17)*43,targetZ=Math.sin(minute*.31)*25;
  const next=events[eventIndex];
  if(next&&next.m-minute<2.4){
    if(next.type==="goal"){targetX=next.team==="home"?56:-56;targetZ=Math.sin(minute*3)*4}
    if(next.type==="corner"){targetX=next.team==="away"?-52:52;targetZ=32}
    if(next.type==="penalty"){targetX=38;targetZ=0}
  }
  ball.position.x=THREE.MathUtils.lerp(ball.position.x,targetX,Math.min(1,dt*.75));
  ball.position.z=THREE.MathUtils.lerp(ball.position.z,targetZ,Math.min(1,dt*.75));
  ball.position.y=.5+Math.abs(Math.sin(minute*2.7))*.34;
  ball.rotation.x+=dt*4;ball.rotation.z+=dt*3;
  const camX=ball.position.x*.19;camera.position.x=THREE.MathUtils.lerp(camera.position.x,camX,dt*.45);camera.lookAt(camera.position.x*.25,0,0);
}
function updateUI(minute){
  const display=Math.min(minute,90);const mm=Math.floor(display),ss=Math.floor((display-mm)*60);$("#clock").textContent=`${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;$("#timelineProgress").style.width=`${Math.min(minute/91.5*100,100)}%`;
  if(minute>=45&&minute<46){$("#phase").textContent="HALF TIME";setPhase("half")}else if(minute>=46&&minute<91.5){$("#phase").textContent="SECOND HALF";setPhase("second")}else if(minute<45){$("#phase").textContent="FIRST HALF";setPhase("first")}
}
function loop(now){
  requestAnimationFrame(loop);const raw=Math.min((now-last)/1000,.1);last=now;
  if(playing){elapsed+=raw*speed;const minute=elapsed/180*91.5;while(eventIndex<events.length&&minute>=events[eventIndex].m)trigger(events[eventIndex++]);animateMatch(minute,raw*speed);updateUI(minute)}
  if(goalTimer>0&&(goalTimer-=raw)<=0)$("#goalCard").classList.remove("show");
  if(flashTimer>0&&(flashTimer-=raw)<=0)$("#cardFlash").classList.remove("show");
  if(statusTimer>0&&(statusTimer-=raw)<=0)$("#statusPill").classList.remove("show");
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);

$("#kickoffBtn").addEventListener("click",()=>{
  const hn=$("#homeInput").value.trim()||"Northbank",an=$("#awayInput").value.trim()||"Riverside";
  homeColor=parseInt($("#homeColor").value.slice(1),16);awayColor=parseInt($("#awayColor").value.slice(1),16);
  document.documentElement.style.setProperty("--home",$("#homeColor").value);document.documentElement.style.setProperty("--away",$("#awayColor").value);
  $("#homeName").textContent=hn.toUpperCase();$("#awayName").textContent=an.toUpperCase();$$(".crest-home").forEach(x=>x.textContent=hn[0].toUpperCase());$$(".crest-away").forEach(x=>x.textContent=an[0].toUpperCase());
  buildTeams();$("#setup").classList.add("hidden");reset();
});
$$("[data-action]").forEach(b=>b.addEventListener("click",()=>{const a=b.dataset.action;if(a==="pause"){playing=false;status("PAUSED")}if(a==="resume"&&elapsed<180){playing=true;last=performance.now();status("LIVE")}if(a==="restart")reset();if(a==="new"){$("#setup").classList.remove("hidden");playing=false;$("#fullTime").classList.remove("show")}}));
$$("[data-speed]").forEach(b=>b.addEventListener("click",()=>{speed=+b.dataset.speed;$$("[data-speed]").forEach(x=>x.classList.toggle("active",x===b));status(`${speed}× SPEED`)}));
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
