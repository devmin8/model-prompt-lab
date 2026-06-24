import * as THREE from "three";

const $ = (s) => document.querySelector(s);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071522);
scene.fog = new THREE.FogExp2(0x071522, .011);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 300);
camera.position.set(0, 48, 53);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
$("#scene").appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x99cfff, 0x102710, 1.65));
const moon = new THREE.DirectionalLight(0xffffff, 2.4);
moon.position.set(-25, 55, 25); moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048); moon.shadow.camera.left = -70; moon.shadow.camera.right = 70;
moon.shadow.camera.top = 45; moon.shadow.camera.bottom = -45; scene.add(moon);

const pitch = new THREE.Group();
for (let i = 0; i < 12; i++) {
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(10, 72), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2c7a31 : 0x338638, roughness: .94 }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(-55 + i * 10, 0, 0); strip.receiveShadow = true; pitch.add(strip);
}
scene.add(pitch);
const lineMat = new THREE.LineBasicMaterial({ color: 0xf3f6e8 });
function line(points, loop = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(points.map(([x,z]) => new THREE.Vector3(x,.035,z)));
  pitch.add(new (loop ? THREE.LineLoop : THREE.Line)(geo, lineMat));
}
line([[-60,-36],[60,-36],[60,36],[-60,36]],true); line([[0,-36],[0,36]]);
const circle = new THREE.EllipseCurve(0,0,9.15,9.15,0,Math.PI*2).getPoints(80).map(p=>new THREE.Vector3(p.x,.04,p.y));
pitch.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle),lineMat));
line([[-60,-20],[-44,-20],[-44,20],[-60,20]]);line([[60,-20],[44,-20],[44,20],[60,20]]);
line([[-60,-9],[-54,-9],[-54,9],[-60,9]]);line([[60,-9],[54,-9],[54,9],[60,9]]);
for(const x of [-49,49]){const spot=new THREE.Mesh(new THREE.CircleGeometry(.28,16),new THREE.MeshBasicMaterial({color:0xffffff}));spot.rotation.x=-Math.PI/2;spot.position.set(x,.05,0);pitch.add(spot)}

function goal(x, flip) {
  const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf5f5ee, metalness:.2 });
  const postGeo = new THREE.CylinderGeometry(.12,.12,4.8,10);
  for(const z of [-7.3,7.3]){const p=new THREE.Mesh(postGeo,white);p.position.set(x,2.4,z);g.add(p)}
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,14.6,10),white);bar.rotation.x=Math.PI/2;bar.position.set(x,4.8,0);g.add(bar);
  const net=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3,4.8,14.6)),new THREE.LineBasicMaterial({color:0xcfe5e9,transparent:true,opacity:.35}));
  net.position.set(x+(flip?-1.5:1.5),2.4,0);g.add(net);scene.add(g);
} goal(-60,true);goal(60,false);

const boardMat = new THREE.MeshStandardMaterial({color:0x071a29,emissive:0x062238,emissiveIntensity:.6});
for(const z of [-38.5,38.5]){const b=new THREE.Mesh(new THREE.BoxGeometry(124,1.5,.35),boardMat);b.position.set(0,.75,z);scene.add(b)}
for(const x of [-62,62]){const b=new THREE.Mesh(new THREE.BoxGeometry(.35,1.5,74),boardMat);b.position.set(x,.75,0);scene.add(b)}

function floodlight(x,z){const g=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,31,8),new THREE.MeshStandardMaterial({color:0x53616a}));pole.position.y=15.5;g.add(pole);const panel=new THREE.Mesh(new THREE.BoxGeometry(8,4,.5),new THREE.MeshStandardMaterial({color:0xe9f4ff,emissive:0xffffff,emissiveIntensity:4}));panel.position.y=31;g.add(panel);g.position.set(x,0,z);scene.add(g)}
floodlight(-52,-43);floodlight(52,-43);floodlight(-52,43);floodlight(52,43);

let homeColor = 0x1557d6, awayColor = 0xd51f35;
const players = [], basePositions = [
  [-53,0],[-40,-20],[-40,-7],[-40,9],[-40,22],[-20,-22],[-20,-7],[-20,10],[-5,-18],[-7,16],[-12,0],
  [53,0],[40,20],[40,7],[40,-9],[40,-22],[20,22],[20,7],[20,-10],[5,18],[7,-16],[12,0]
];
function footballer(index,pos) {
  const group=new THREE.Group(), isHome=index<11, isGK=index===0||index===11;
  const kit=isGK?(isHome?0x22c66d:0xf2cf18):(isHome?homeColor:awayColor);
  const shirt=new THREE.MeshStandardMaterial({color:kit,roughness:.65}), skin=new THREE.MeshStandardMaterial({color:[0x8b593c,0xd29a71,0x5c3626,0xe0ae87][index%4]});
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.47,.62,1.55,10),shirt);torso.position.y=2.25;torso.castShadow=true;group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.35,12,10),skin);head.position.y=3.35;head.castShadow=true;group.add(head);
  for(const sx of [-.28,.28]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.13,.12,1.25,7),new THREE.MeshStandardMaterial({color:isHome?0xf3f4f5:0xf0f0f0}));leg.position.set(sx,.82,0);leg.castShadow=true;group.add(leg)}
  group.position.set(pos[0],0,pos[1]);group.userData={index,base:new THREE.Vector3(pos[0],0,pos[1]),target:new THREE.Vector3(pos[0],0,pos[1]),phase:index*.7};scene.add(group);players.push(group);
}
basePositions.forEach((p,i)=>footballer(i,p));
const referee=footballer(22,[0,6]);players[22].children[0].material=new THREE.MeshStandardMaterial({color:0x17191c});
const ball=new THREE.Mesh(new THREE.SphereGeometry(.37,18,14),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45}));
ball.castShadow=true;ball.position.set(0,.4,0);scene.add(ball);

const events=[
  {m:8,t:"save",txt:"Brilliant reaction save! Vale claws Morgan's curling effort away.",who:9},
  {m:14,t:"yellow",txt:"Yellow card for R. Cole after a late challenge in midfield.",who:17},
  {m:18,t:"goal",side:0,scorer:"10 JAMIE REYES",num:"10",assist:"ASSIST: 8 A. MORGAN",txt:"GOAL! Reyes meets Morgan's pass and sweeps it into the far corner.",who:10,score:[1,0]},
  {m:27,t:"corner",txt:"Corner to Riverton. Kovač swings it dangerously toward the six-yard box.",who:19},
  {m:34,t:"goal",side:1,scorer:"9 ELIAS KOVAČ",num:"9",assist:"ASSIST: 11 L. SANTOS",txt:"GOAL! Kovač powers a header beyond Vale. Riverton are level.",who:21,score:[1,1]},
  {m:41,t:"yellow",txt:"A second caution for R. Cole — it turns red. Riverton are down to ten.",who:17,red:true},
  {m:45,t:"half",txt:"Half time. A breathless opening half ends all square.",score:[1,1]},
  {m:52,t:"save",txt:"Hale stands tall and blocks Reyes from point-blank range.",who:10},
  {m:61,t:"goal",side:0,scorer:"7 NOAH WILLIAMS",num:"7",assist:"ASSIST: 10 J. REYES",txt:"GOAL! Williams races onto a perfectly weighted pass and finds the net.",who:8,score:[2,1]},
  {m:72,t:"penalty",txt:"Penalty to Riverton! Santos is clipped as he cuts across the defender.",who:20},
  {m:74,t:"goal",side:1,scorer:"11 LEO SANTOS",num:"11",assist:"PENALTY",txt:"GOAL! Santos sends Vale the wrong way from the spot.",who:20,score:[2,2]},
  {m:83,t:"yellow",txt:"Yellow card for D. Okafor for stopping a promising attack.",who:3},
  {m:88,t:"goal",side:0,scorer:"10 JAMIE REYES",num:"10",assist:"ASSIST: 7 N. WILLIAMS",txt:"GOAL! Reyes strikes late — a composed finish into the bottom corner!",who:10,score:[3,2]},
  {m:90,t:"full",txt:"Full time! Northstar edge a five-goal thriller under the lights.",score:[3,2]}
];
events.forEach((e,i)=>{if(e.t==="goal"||e.t==="yellow"){const d=document.createElement("span");d.className=`event-dot ${e.t==="yellow"?"card":""} ${e.red?"red":""}`;d.style.left=`${e.m/90*100}%`;d.textContent=e.t==="goal"?"⚽":"";d.dataset.event=i;$("#timeline").appendChild(d)}});

let running=false, elapsed=0, speed=1, nextEvent=0, last=performance.now(), ballMove=null, hideGoalTimer=0;
function setComment(min,text){$("#commentMinute").textContent=`${min}'`;$("#commentText").textContent=text}
function flash(text){const p=$("#statusPill");p.textContent=text;p.classList.add("show");setTimeout(()=>p.classList.remove("show"),1500)}
function moveBall(to,duration=1.4){ballMove={from:ball.position.clone(),to:new THREE.Vector3(to.x,.4,to.z),start:elapsed,duration};}
function triggerEvent(e,i){
  setComment(e.m,e.txt);document.querySelector(`[data-event="${i}"]`)?.classList.add("active");
  if(e.score){$("#homeScore").textContent=e.score[0];$("#awayScore").textContent=e.score[1]}
  if(e.who!=null){const p=players[e.who];moveBall(p.position,1.1);p.userData.target=p.userData.base.clone().add(new THREE.Vector3((e.side===0?1:-1)*8,0,(i%2?1:-1)*5))}
  if(e.t==="goal"){
    $("#goalPlayer").textContent=e.scorer;$("#goalNumber").textContent=e.num;$("#goalMinute").textContent=`${e.m}'`;$("#goalAssist").textContent=e.assist;
    $("#goalCrest").textContent=e.side?$("#awayCrest").textContent:$("#homeCrest").textContent;
    $(".goal-head").style.background=`linear-gradient(110deg, ${e.side?"var(--away)":"var(--home)"}, #071a30)`;
    $("#goalMinute").style.background=e.side?"var(--away)":"var(--home)";$("#goalCard").classList.add("show");hideGoalTimer=elapsed+5;
    flash("GOAL"); moveBall({x:e.side?-60.8:60.8,z:(i%3-1)*4},1.3);
  } else if(e.t==="half"){flash("HALF TIME");}
  else if(e.t==="full"){finish();}
  else flash(e.t==="yellow"?(e.red?"RED CARD":"YELLOW CARD"):e.t.toUpperCase());
}
function finish(){running=false;$("#phase").textContent="FULL TIME";$("#clock").textContent="90:00";$("#ftScore").textContent=`${$("#homeScore").textContent} – ${$("#awayScore").textContent}`;$("#ftHome").textContent=$("#homeName").textContent;$("#ftAway").textContent=$("#awayName").textContent;$("#fulltime").classList.add("show");$("#moments").innerHTML=events.filter(e=>e.t==="goal").map(e=>`<div class="moment"><span>${e.m}'</span><span>⚽</span><b>${e.scorer.slice(3)}</b><em>${e.score[0]}–${e.score[1]}</em></div>`).join("")}
function resetMatch(){
  elapsed=0;nextEvent=0;running=true;ball.position.set(0,.4,0);ballMove=null;$("#homeScore").textContent=0;$("#awayScore").textContent=0;$("#goalCard").classList.remove("show");$("#fulltime").classList.remove("show");document.querySelectorAll(".event-dot").forEach(d=>d.classList.remove("active"));players.forEach(p=>p.position.copy(p.userData.base));setComment(0,`${$("#homeName").textContent} kick us off under the floodlights.`);flash("KICK OFF")
}
function update(dt){
  if(!running)return;
  elapsed+=dt*speed;const matchMinute=Math.min(90,elapsed/1.82);
  $("#clock").textContent=`${String(Math.floor(matchMinute)).padStart(2,"0")}:${String(Math.floor(matchMinute%1*60)).padStart(2,"0")}`;
  $("#phase").textContent=matchMinute<45?"FIRST HALF":matchMinute<90?"SECOND HALF":"FULL TIME";$("#progress").style.width=`${matchMinute/90*100}%`;
  while(nextEvent<events.length&&matchMinute>=events[nextEvent].m){triggerEvent(events[nextEvent],nextEvent);nextEvent++}
  if(hideGoalTimer&&elapsed>hideGoalTimer){$("#goalCard").classList.remove("show");hideGoalTimer=0}
  if(ballMove){const t=Math.min(1,(elapsed-ballMove.start)/ballMove.duration),s=t*t*(3-2*t);ball.position.lerpVectors(ballMove.from,ballMove.to,s);ball.position.y=.4+Math.sin(t*Math.PI)*2.2;ball.rotation.z+=dt*8;if(t>=1)ballMove=null}
  players.forEach((p,i)=>{const target=p.userData.target,dist=p.position.distanceTo(target);if(dist>.1){p.position.lerp(target,Math.min(1,dt*speed*1.5));p.rotation.y=Math.atan2(target.x-p.position.x,target.z-p.position.z);p.position.y=Math.abs(Math.sin(elapsed*8+p.userData.phase))*.08}else if(Math.random()<.003){p.userData.target=p.userData.base.clone().add(new THREE.Vector3((Math.random()-.5)*4,0,(Math.random()-.5)*4))}});
  const camTargetX=THREE.MathUtils.clamp(ball.position.x*.23,-12,12);camera.position.x=THREE.MathUtils.lerp(camera.position.x,camTargetX,dt*.5);camera.lookAt(camera.position.x*.35,0,ball.position.z*.12);
}
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera)}requestAnimationFrame(animate);

$("#startBtn").onclick=()=>{
  const hn=$("#homeInput").value.trim()||"Northstar",an=$("#awayInput").value.trim()||"Riverton";
  homeColor=parseInt($("#homeColor").value.slice(1),16);awayColor=parseInt($("#awayColor").value.slice(1),16);
  document.documentElement.style.setProperty("--home",$("#homeColor").value);document.documentElement.style.setProperty("--away",$("#awayColor").value);
  $("#homeName").textContent=hn.toUpperCase();$("#awayName").textContent=an.toUpperCase();$("#homeCrest").textContent=hn[0].toUpperCase();$("#awayCrest").textContent=an[0].toUpperCase();
  $("#ftHome").textContent=hn.toUpperCase();$("#ftAway").textContent=an.toUpperCase();
  players.slice(0,11).forEach((p,i)=>{if(i!==0)p.children[0].material.color.set(homeColor)});players.slice(11,22).forEach((p,i)=>{if(i!==0)p.children[0].material.color.set(awayColor)});
  $("#setup").classList.add("hide");resetMatch();
};
$("#pauseBtn").onclick=()=>{running=false;flash("PAUSED")};$("#resumeBtn").onclick=()=>{if(elapsed<164)running=true;flash("LIVE")};$("#restartBtn").onclick=resetMatch;
function newMatch(){$("#setup").classList.remove("hide");$("#fulltime").classList.remove("show");running=false}
$("#newBtn").onclick=newMatch;$("#ftNewBtn").onclick=newMatch;
document.querySelectorAll(".speed-btn").forEach(b=>b.onclick=()=>{speed=+b.dataset.speed;document.querySelectorAll(".speed-btn").forEach(x=>x.classList.toggle("active",x===b));flash(`${speed}X SPEED`)});
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
