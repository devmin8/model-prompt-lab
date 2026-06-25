import * as THREE from 'three';

/* =========================================================
   Pitchside — broadcast-style 3D football match simulator
   Single-module build. Vanilla ES modules + Three.js (CDN).
   ========================================================= */

/* ---------- State ---------- */
const state = {
  paused: false,
  speed: 1,
  simT: 0,            // seconds within current match
  matchStarted: false,
  matchOver: false,
  home: { name:'RED FC', color:'#e23c3c', score:0 },
  away: { name:'BLUE UNITED', color:'#3c6eff', score:0 },
  beatIndex: 0,
  ball: new THREE.Vector3(0,0,0),
  ballVel: new THREE.Vector3(),
};

const FIELD = { w: 105, h: 68, // length x width (FIFA-ish, in meters, scaled)
                goalW: 7.32, goalH: 2.44, pen: 11 };
// We use x = along length (goals at ±w/2), z = across width.

/* ---------- Renderer / Scene / Camera ---------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e16);
scene.fog = new THREE.Fog(0x0a0e16, 140, 320);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth/window.innerHeight, 0.1, 600);
const camTarget = new THREE.Vector3(0, 1.5, 0);
const camPos = new THREE.Vector3(0, 38, 60);
camera.position.copy(camPos);
camera.lookAt(camTarget);

/* ---------- Lights ---------- */
const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x2a3018, 0.65);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(40, 80, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 200;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x404a5a, 0.4));

/* ---------- Pitch ---------- */
function makePitch() {
  const grp = new THREE.Group();

  // striped grass
  const stripes = 14;
  for (let i=0;i<stripes;i++){
    const geo = new THREE.PlaneGeometry(FIELD.w/stripes, FIELD.h);
    const mat = new THREE.MeshStandardMaterial({
      color: i%2===0 ? 0x2e7d32 : 0x246a28,
      roughness:0.95, metalness:0.0 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI/2;
    m.position.set(-FIELD.w/2 + (i+0.5)*(FIELD.w/stripes), 0, 0);
    m.receiveShadow = true;
    grp.add(m);
  }
  // Surround (dark)
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0,1,4),
    new THREE.MeshBasicMaterial({color:0x0c1410})
  );
  // use a large dark plane beneath
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 160),
    new THREE.MeshStandardMaterial({color:0x12180e, roughness:1})
  );
  base.rotation.x = -Math.PI/2;
  base.position.y = -0.02;
  base.receiveShadow = true;
  grp.add(base);

  grp.add(makeLines());
  grp.add(makeGoals());
  grp.add(makeAdBoards());
  grp.add(makeFloodlights());
  return grp;
}

function makeLines() {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color:0xffffff });
  const y = 0.02;
  function line(pts){ g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    pts.map(p=>new THREE.Vector3(p[0],y,p[1]))), mat)); }
  const hw=FIELD.w/2, hh=FIELD.h/2;
  // outer rectangle
  line([[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh],[-hw,-hh]]);
  // halfway line
  line([[0,-hh],[0,hh]]);
  // center circle
  const circle=[];
  for(let a=0;a<=64;a++){const t=a/64*Math.PI*2;circle.push([Math.cos(t)*9.15, Math.sin(t)*9.15]);}
  line(circle);
  // penalty boxes
  const pbW=16.5, pbH=40.3;
  line([[-hw,-pbH/2],[-hw+pbW,-pbH/2],[-hw+pbW,pbH/2],[-hw,pbH/2]]);
  line([[hw,-pbH/2],[hw-pbW,-pbH/2],[hw-pbW,pbH/2],[hw,pbH/2]]);
  // goal area
  const gaW=5.5, gaH=18.32;
  line([[-hw,-gaH/2],[-hw+gaW,-gaH/2],[-hw+gaW,gaH/2],[-hw,gaH/2]]);
  line([[hw,-gaH/2],[hw-gaW,-gaH/2],[-hw+0,gaH/2],[hw,gaH/2]]); // approx second
  // penalty spots
  const spot = (x)=>{ const s=new THREE.Mesh(new THREE.CircleGeometry(0.3,16),
      new THREE.MeshBasicMaterial({color:0xffffff})); s.rotation.x=-Math.PI/2; s.position.set(x,y,0); g.add(s); };
  spot(-hw+11); spot(hw-11);
  return g;
}

function makeGoals() {
  const g = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.4});
  const postR = 0.06;
  function goal(xSign) {
    const gg = new THREE.Group();
    const w = FIELD.goalW/2, h = FIELD.goalH;
    const x = xSign*(FIELD.w/2);
    // posts
    const postGeo = new THREE.CylinderGeometry(postR, postR, h, 8);
    const pL = new THREE.Mesh(postGeo, postGeo); // reuse
    const mkPost=(px)=>{ const c=pL.clone(); c.material=postMat; c.position.set(px, h/2, 0); return c; };
    gg.add(mkPost(x)); gg.add(mkPost(x));
    const left = mkPost(x); left.position.z = -w; gg.add(left);
    const right = mkPost(x); right.position.z = w; gg.add(right);
    // crossbar
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, w*2, 8), postMat);
    bar.rotation.x = Math.PI/2;
    bar.position.set(x, h, 0);
    gg.add(bar);
    // net (semi-transparent)
    const netMat = new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.18, side:THREE.DoubleSide, wireframe:true});
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.6, h), netMat);
    back.rotation.y = Math.PI/2;
    back.rotation.x = -Math.PI/2;
    back.position.set(x + xSign*0.8, h/2, 0);
    // simpler: use box net
    const netGeo = new THREE.BoxGeometry(1.6, h, w*2);
    const net = new THREE.Mesh(netGeo, new THREE.MeshBasicMaterial({color:0xdfeaff, transparent:true, opacity:0.12, side:THREE.DoubleSide, wireframe:true}));
    net.position.set(x + xSign*0.8, h/2, 0);
    gg.add(net);
    return gg;
  }
  g.add(goal(-1)); g.add(goal(1));
  return g;
}

function makeAdBoards() {
  const g = new THREE.Group();
  const colors = [0x11186610 & 0, 0x0e2a44, 0x441a0e, 0x1a0e44];
  const labels = ['PITCHSIDE', 'SKYLINE', 'ATLAS AIR', 'NEXUS', 'VOLT'];
  const matBase = new THREE.MeshStandardMaterial({color:0x0e1a2a, roughness:0.6, emissive:0x0a2030, emissiveIntensity:0.4});
  for (let i=0;i<14;i++){
    const m = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 0.3), matBase.clone());
    m.material.color.setHex([0x10243a,0x2a1320,0x13230f,0x2a1f0a][i%4]);
    const side = i<7 ? -1 : 1;
    const t = (i%7)/6 - 0.5;
    m.position.set(t*90, 0.55, side*(FIELD.h/2 + 3));
    g.add(m);
  }
  return g;
}

function makeFloodlights() {
  const g = new THREE.Group();
  const positions = [[-60,-50],[60,-50],[-60,50],[60,50]];
  for (const [x,z] of positions) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,28,8),
      new THREE.MeshStandardMaterial({color:0x2a2f36, roughness:0.7, metalness:0.6}));
    pole.position.set(x, 14, z);
    g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 1),
      new THREE.MeshStandardMaterial({color:0x1a1d22, emissive:0xfff4cc, emissiveIntensity:0.6}));
    head.position.set(x*0.97, 28, z*0.97);
    head.lookAt(0, 0, 0);
    g.add(head);
    const sp = new THREE.SpotLight(0xfff2cc, 0.8, 200, Math.PI/5, 0.4, 1);
    sp.position.set(x*0.97, 28, z*0.97);
    sp.target.position.set(0,0,0);
    g.add(sp); g.add(sp.target);
  }
  return g;
}

scene.add(makePitch());

/* ---------- Ball ---------- */
const ball = new THREE.Group();
const ballMesh = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.22, 2),
  new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.5, emissive:0x222222})
);
ballMesh.castShadow = true;
ball.add(ballMesh);
// pentagon patches via small black dots
const patchMat = new THREE.MeshBasicMaterial({color:0x111111});
for (let i=0;i<12;i++){
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.05,6), patchMat);
  const v = new THREE.Vector3().randomDirection().multiplyScalar(0.22);
  d.position.copy(v);
  d.lookAt(v.clone().multiplyScalar(2));
  ballMesh.add(d);
}
scene.add(ball);
const BALL_R = 0.22;

/* ---------- Players ---------- */
function buildPlayer(kitColor, isGK=false, isRef=false) {
  const g = new THREE.Group();
  const skin = 0xd9a679;
  const kitCol = isRef ? 0x111111 : (isGK ? 0x22cc55 : kitColor);
  const shortCol = isRef ? 0x222222 : 0x101418;
  const sockCol = kitCol;

  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.45, 4, 10),
    new THREE.MeshStandardMaterial({color:kitCol, roughness:0.7}));
  torso.position.y = 1.15; torso.castShadow = true;
  g.add(torso);
  // shorts
  const shorts = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.18, 4, 8),
    new THREE.MeshStandardMaterial({color:shortCol, roughness:0.8}));
  shorts.position.y = 0.72;
  g.add(shorts);
  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({color:skin, roughness:0.6}));
  head.position.y = 1.68;
  g.add(head);
  // arms
  const armMat = new THREE.MeshStandardMaterial({color:kitCol, roughness:0.7});
  const armGeo = new THREE.CapsuleGeometry(0.08, 0.42, 4, 6);
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.36, 1.18, 0); armL.rotation.z = 0.25;
  const armR = armL.clone(); armR.position.x = 0.36; armR.rotation.z = -0.25;
  g.add(armL, armR);
  // legs
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.5, 4, 6);
  const legMat = new THREE.MeshStandardMaterial({color:sockCol, roughness:0.8});
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.32, 0);
  const legR = legL.clone(); legR.position.x = 0.13;
  g.add(legL, legR);
  // feet
  const footGeo = new THREE.BoxGeometry(0.16, 0.08, 0.28);
  const footMat = new THREE.MeshStandardMaterial({color:0x101418, roughness:0.9});
  const footL = new THREE.Mesh(footGeo, footMat);
  footL.position.set(-0.13, 0.04, 0.05);
  const footR = footL.clone(); footR.position.x = 0.13;
  g.add(footL, footR);

  g.userData = { torso, head, armL, armR, legL, legR, footL, footR };
  return g;
}

const players = []; // {group, team:'home'|'away'|'ref', pos, target, idleT, kit}

function setupPlayers() {
  // clear
  for (const p of players) scene.remove(p.group);
  players.length = 0;

  const hw = FIELD.w/2, hh = FIELD.h/2;

  // Home (attacks +x goal)
  const homePositions = [
    // GK
    [-hw+2.5, 0],
    // defenders
    [-hw+18, -22],[-hw+18,-8],[-hw+18,8],[-hw+18,22],
    // midfield
    [-hw+38, -20],[-hw+38,-7],[-hw+38,7],[-hw+38,20],
    // forwards
    [-hw+60, -10],[-hw+60, 10],
  ];
  homePositions.forEach((p,i)=>{
    const isGK = i===0;
    const g = buildPlayer(state.home.color, isGK, false);
    g.position.set(p[0], 0, p[1]);
    g.rotation.y = Math.PI/2;
    scene.add(g);
    players.push({group:g, team:'home', isGK, pos:new THREE.Vector3(p[0],0,p[1]),
      home:new THREE.Vector3(p[0],0,p[1]), idleT:Math.random()*Math.PI*2, kit:state.home.color,
      number: isGK?1:(i<5?2+i-1:(i<9?6+i-5:9+i-9)) });
  });

  // Away (attacks -x goal)
  const awayPositions = homePositions.map(p=>[-p[0], -p[1]]);
  awayPositions.forEach((p,i)=>{
    const isGK = i===0;
    const g = buildPlayer(state.away.color, isGK, false);
    g.position.set(p[0], 0, p[1]);
    g.rotation.y = -Math.PI/2;
    scene.add(g);
    players.push({group:g, team:'away', isGK, pos:new THREE.Vector3(p[0],0,p[1]),
      home:new THREE.Vector3(p[0],0,p[1]), idleT:Math.random()*Math.PI*2, kit:state.away.color,
      number: isGK?1:(i<5?2+i-1:(i<9?6+i-5:9+i-9)) });
  });

  // referee
  const ref = buildPlayer(0x000000, false, true);
  ref.position.set(0, 0, -12);
  scene.add(ref);
  players.push({group:ref, team:'ref', isGK:false, pos:new THREE.Vector3(0,0,-12),
    home:new THREE.Vector3(0,0,-12), idleT:0, kit:0x000000, number:0});
}

setupPlayers();

/* ---------- Match script (beats) ----------
   Each beat:
     { t, dur, type, team, ballPath:[[x,z]...], actorIdx (relative idx 0-10), data }
   Match clock: half=70 sim seconds → maps to 45 match-min.
*/
const HALF_SIM = 70;
function matchMinute(simT){
  if (simT < HALF_SIM) return simT/HALF_SIM*45;
  if (simT < HALF_SIM+10) return 45;        // HT
  return 45 + ((simT-HALF_SIM-10)/HALF_SIM)*45;
}
function phaseOf(simT){
  if (simT<HALF_SIM) return '1ST HALF';
  if (simT<HALF_SIM+10) return 'HALF TIME';
  if (simT<HALF_SIM*2+10) return '2ND HALF';
  return 'FULL TIME';
}

const hw=FIELD.w/2, hh=FIELD.h/2;
const GOAL_X = hw-0.3;        // net line for goals
const beats = [
  // 1st half kickoff
  { t:0, dur:6, type:'kickoff', team:'home', ballPath:[[0,0],[-15,-3],[-30,5],[-44,8]] },
  // pass around box then goal (home)
  { t:6, dur:8, type:'goal', team:'home', scorer:{idx:10,num:9,name:'MARSHALL'}, assist:{num:10,name:'OKAFOR'},
    ballPath:[[-44,8],[-50,-3],[hw-2,2],[hw+0.5,2]] , min:8 },
  // restart kickoff -> away
  { t:14, dur:8, type:'kickoff', team:'away', ballPath:[[0,0],[18,4],[34,-6],[48,-2]] },
  // shot saved
  { t:22, dur:8, type:'save', team:'away', ballPath:[[48,-2],[55,4],[hw-12,3],[hw-16,-4]] },
  // foul + yellow
  { t:30, dur:8, type:'yellow', team:'home', card:{num:4,name:'VOSS'},
    ballPath:[[hw-16,-4],[10,-8],[-5,0],[-20,10]] },
  // build-up + goal #2 (home)
  { t:38, dur:10, type:'goal', team:'home', scorer:{idx:7,num:8,name:'DIAS'}, assist:{num:7,name:'LUKIC'},
    ballPath:[[-20,10],[-35,8],[-50,5],[hw-1.5,-3],[hw+0.5,-3]], min:27 },
  // play out to halftime
  { t:48, dur:22, type:'play', ballPath:[[0,0],[20,5],[40,-8],[10,12],[-20,-5],[0,0]] },
  // HALFTIME beat
  { t:HALF_SIM, dur:10, type:'halftime', ballPath:[[0,0]] },
  // 2nd half kickoff (away)
  { t:HALF_SIM+10, dur:8, type:'kickoff', team:'away', ballPath:[[0,0],[20,5],[42,-6]] },
  // away goal
  { t:HALF_SIM+18, dur:9, type:'goal', team:'away', scorer:{idx:10,num:9,name:'SANTOS'}, assist:{num:11,name:'RIVERA'},
    ballPath:[[42,-6],[52,2],[-hw+1.5,4],[-hw-0.5,4]], min:55 },
  // play + corner (home concedes corner)
  { t:HALF_SIM+27, dur:8, type:'corner', team:'away', ballPath:[[52,2],[20,8],[-hw+1.0,-hh+1.0],[-hw+8,-2]] },
  // penalty awarded -> goal
  { t:HALF_SIM+35, dur:9, type:'penalty', team:'home', scorer:{idx:10,num:9,name:'MARSHALL'},
    ballPath:[[-hw+8,-2],[-hw+11,0],[hw-2,2],[hw+0.5,2]], min:69, pen:true },
  // yellow #1 (away)
  { t:HALF_SIM+44, dur:7, type:'yellow', team:'away', card:{num:5,name:'KOVAC'},
    ballPath:[[10,0],[25,-8],[40,4],[20,10]] },
  // yellow #2 (same player -> red)
  { t:HALF_SIM+51, dur:7, type:'red', team:'away', card:{num:5,name:'KOVAC'},
    ballPath:[[20,10],[5,8],[-10,-4],[-25,2]] },
  // winner goal (home)
  { t:HALF_SIM+58, dur:9, type:'goal', team:'home', scorer:{idx:10,num:9,name:'MARSHALL'}, assist:{num:8,name:'DIAS'},
    ballPath:[[-25,2],[-40,6],[-55,4],[hw-2,-3],[hw+0.5,-3]], min:88 },
  // fulltime
  { t:HALF_SIM+67, dur:0, type:'fulltime', ballPath:[[0,0]] },
];
const MATCH_END = HALF_SIM*2 + 10 + 5;

/* timeline markers */
const eventsLog = []; // {min,type,label}
beats.filter(b=>b.type==='goal').forEach(b=>eventsLog.push({min:b.min, type:'goal', label:`${b.team==='home'?state.home.name:state.away.name} goal`}));

/* ---------- Ball tween between beats ---------- */
function evalBallAt(simT){
  // find current beat
  let cur = beats[0];
  for (const b of beats){ if (b.t <= simT) cur = b; }
  const localT = Math.min(1, (simT - cur.t) / Math.max(0.001, cur.dur));
  const path = cur.ballPath;
  const seg = localT * (path.length-1);
  const i = Math.min(path.length-2, Math.floor(seg));
  const f = seg - i;
  const a = path[i], b = path[i+1];
  const x = a[0] + (b[0]-a[0])*f;
  const z = a[1] + (b[1]-a[1])*f;
  // add height arc when ball travels far
  const dist = Math.hypot(b[0]-a[0], b[1]-a[1]);
  const height = cur.type==='goal' ? Math.sin(f*Math.PI)*Math.min(2.5, dist*0.18) : Math.sin(f*Math.PI)*0.25;
  return { x, y: BALL_R + height, z, beat:cur, f:localT };
}

function actorPlayer(beat){
  // pick a player to chase the ball
  if (!beat.team || beat.team==='ref') return null;
  const team = beat.team;
  const idx = (beat.scorer && beat.scorer.idx!==undefined) ? beat.scorer.idx : 9;
  const list = players.filter(p=>p.team===team);
  return list[idx % list.length];
}

/* ---------- UI hooks ---------- */
const $ = id => document.getElementById(id);
const ui = {
  setup:$('setup'), hud:$('hud'), fulltime:$('fulltime'),
  homeNameLbl:$('homeNameLbl'), awayNameLbl:$('awayNameLbl'),
  homeCrest:$('homeCrest'), awayCrest:$('awayCrest'),
  scoreH:$('scoreH'), scoreA:$('scoreA'),
  clockTxt:$('clockTxt'), phaseTxt:$('phaseTxt'),
  goalOverlay:$('goalOverlay'),
  tickerTrack:$('tickerTrack'),
  tlProgress:$('tlProgress'), timeline:$('timeline'),
  pauseBtn:$('pauseBtn'), resumeBtn:$('resumeBtn'),
};

function setSwatches(){
  const palette = ['#e23c3c','#3c6eff','#1cc8a8','#f0a020','#9b59f5','#ecf0f1','#2ecc71','#34495e'];
  document.querySelectorAll('.swatches').forEach(el=>{
    const team = el.dataset.team;
    el.innerHTML='';
    palette.forEach(c=>{
      const d = document.createElement('div');
      d.className='swatch'; d.style.background=c;
      if ((team==='home'&&c===state.home.color)||(team==='away'&&c===state.away.color)) d.classList.add('sel');
      d.addEventListener('click', ()=>{
        if (team==='home') state.home.color=c; else {
          // ensure away differs from home
          if (c===state.home.color) c = palette.find(x=>x!==state.home.color);
          state.away.color=c;
        }
        el.parentElement.parentElement.querySelectorAll('.swatch').forEach(s=>s.classList.remove('sel'));
        d.classList.add('sel');
      });
      el.appendChild(d);
    });
  });
}
setSwatches();

function startMatch(){
  state.home.name = ($('homeName').value || 'HOME').toUpperCase().slice(0,14);
  state.away.name = ($('awayName').value || 'AWAY').toUpperCase().slice(0,14);
  state.home.score = 0; state.away.score = 0;
  state.simT = 0; state.beatIndex = 0; state.matchOver=false;
  eventsLog.length = 0;
  beats.filter(b=>b.type==='goal').forEach(b=>eventsLog.push({min:b.min,type:'goal',team:b.team}));

  ui.homeNameLbl.textContent = state.home.name;
  ui.awayNameLbl.textContent = state.away.name;
  ui.homeCrest.textContent = state.home.name[0];
  ui.awayCrest.textContent = state.away.name[0];
  ui.homeCrest.style.background = state.home.color;
  ui.awayCrest.style.background = state.away.color;
  ui.scoreH.textContent='0'; ui.scoreA.textContent='0';

  // rebuild players with chosen kits
  setupPlayers();
  buildTimelineMarkers();

  ui.setup.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.fulltime.classList.remove('show');
  state.matchStarted = true;
  state.paused = false;
  setTicker('Kick-off! '+state.home.name+' vs '+state.away.name);
}

function buildTimelineMarkers(){
  // remove old
  ui.timeline.querySelectorAll('.marker').forEach(m=>m.remove());
  const span = MATCH_END;
  beats.forEach(b=>{
    if (b.type==='goal'){
      const m=document.createElement('div'); m.className='marker goal';
      m.style.left=(b.t/span*100)+'%'; ui.timeline.appendChild(m);
    } else if (b.type==='yellow'){
      const m=document.createElement('div'); m.className='marker card-y';
      m.style.left=(b.t/span*100)+'%'; ui.timeline.appendChild(m);
    } else if (b.type==='red'){
      const m=document.createElement('div'); m.className='marker card-r';
      m.style.left=(b.t/span*100)+'%'; ui.timeline.appendChild(m);
    }
  });
}

let goalOverlayTimer = 0;
function triggerGoal(b){
  const team = b.team==='home' ? state.home : state.away;
  team.score++;
  if (b.team==='home') ui.scoreH.textContent = team.score;
  else ui.scoreA.textContent = team.score;

  $('goalPortrait').style.background = team.color;
  $('goalPortrait').textContent = b.scorer.num;
  $('goalName').textContent = b.scorer.name;
  $('goalNum').textContent = '#'+b.scorer.num;
  $('goalMin').textContent = b.min + "'";
  $('goalAssist').textContent = b.assist ? 'Assist: '+b.assist.name+' #'+b.assist.num : '';
  ui.goalOverlay.classList.add('show');
  goalOverlayTimer = 5; // seconds visible

  setTicker(`GOAL! ${team.name} — ${b.scorer.name} #${b.scorer.num} (${b.min}')`);
}

function triggerYellow(b){
  const team = b.team==='home'?state.home:state.away;
  setTicker(`Yellow card — ${b.card.name} #${b.card.num} (${team.name})`);
}
function triggerRed(b){
  const team = b.team==='home'?state.home:state.away;
  setTicker(`Second yellow! ${b.card.name} #${b.card.num} sent off (${team.name})`);
}

function setTicker(msg){
  ui.tickerTrack.innerHTML = `<span>${msg}</span><span style='color:var(--muted)'>PITCHSIDE LIVE BROADCAST</span>`;
}

function showFullTime(){
  state.matchOver = true;
  $('ftScore').textContent = state.home.score + ' - ' + state.away.score;
  const potm = 'MARSHALL #9';
  $('potmName').textContent = potm;
  const ul = $('keyMoments');
  ul.innerHTML='';
  const moments = [];
  beats.filter(b=>b.type==='goal').forEach(b=>{
    const t = b.team==='home'?state.home:state.away;
    moments.push(`${b.min}' — Goal: ${b.scorer.name} (${t.name})`);
  });
  beats.filter(b=>b.type==='red').forEach(b=>{
    const t = b.team==='home'?state.home:state.away;
    moments.push(`Red card: ${b.card.name} (${t.name})`);
  });
  moments.sort();
  moments.forEach(m=>{ const li=document.createElement('li'); li.textContent=m; ul.appendChild(li); });
  ui.fulltime.classList.add('show');
  setTicker('Full time. Thanks for watching Pitchside.');
}

/* ---------- Controls ---------- */
$('startBtn').addEventListener('click', startMatch);
$('newBtn').addEventListener('click', ()=>{ location.reload(); });
$('ftNewBtn').addEventListener('click', ()=>{ location.reload(); });
$('restartBtn').addEventListener('click', ()=>{
  state.simT = 0; state.beatIndex = 0;
  state.home.score = 0; state.away.score = 0;
  ui.scoreH.textContent='0'; ui.scoreA.textContent='0';
  setupPlayers(); buildTimelineMarkers();
  state.matchOver = false; ui.fulltime.classList.remove('show');
});
$('pauseBtn').addEventListener('click', ()=>{
  state.paused = true;
  $('pauseBtn').style.display='none';
  $('resumeBtn').style.display='inline-block';
});
$('resumeBtn').addEventListener('click', ()=>{
  state.paused = false;
  $('resumeBtn').style.display='none';
  $('pauseBtn').style.display='inline-block';
});
document.querySelectorAll('.spd-group .ctrl-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.spd-group .ctrl-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.speed = parseInt(b.dataset.spd,10);
  });
});
ui.timeline.addEventListener('click', (e)=>{
  const r = ui.timeline.getBoundingClientRect();
  const f = (e.clientX - r.left)/r.width;
  state.simT = Math.max(0, Math.min(MATCH_END-1, f*MATCH_END));
  // reset beat flags so events can re-fire if going back
  for (const b of beats) b._fired = b.t < state.simT;
});

/* ---------- Animation loop ---------- */
const clock = new THREE.Clock();
let prevBeatType = null;

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  if (state.matchStarted && !state.paused && !state.matchOver){
    state.simT += dt * state.speed;
  }

  if (state.matchStarted){
    // current beat
    let cur = beats[0];
    for (const b of beats){ if (b.t <= state.simT) cur = b; }
    // fire beat events
    beats.forEach(b=>{
      if (b.t <= state.simT && !b._fired){
        b._fired = true;
        if (b.type==='goal') triggerGoal(b);
        else if (b.type==='yellow') triggerYellow(b);
        else if (b.type==='red') triggerRed(b);
        else if (b.type==='corner') setTicker(`Corner to ${b.team==='home'?state.home.name:state.away.name}`);
        else if (b.type==='save') setTicker(`Great save by the ${b.team==='home'?state.away.name:state.home.name} keeper!`);
        else if (b.type==='penalty') setTicker(`Penalty to ${b.team==='home'?state.home.name:state.away.name}!`);
        else if (b.type==='halftime') setTicker('Half time.');
        else if (b.type==='kickoff' && state.simT>1) setTicker(`${b.team==='home'?state.home.name:state.away.name} kick off.`);
      }
    });

    // ball
    const ev = evalBallAt(state.simT);
    state.ball.set(ev.x, ev.y, ev.z);
    ball.position.copy(state.ball);
    ballMesh.rotation.x += dt*8; ballMesh.rotation.z += dt*5;

    // actor player chases ball
    const actor = actorPlayer(cur);
    if (actor){
      const tx = ev.x, tz = ev.z;
      const dx = tx - actor.pos.x, dz = tz - actor.pos.z;
      const step = Math.min(1, dt*4*state.speed);
      actor.pos.x += dx*step; actor.pos.z += dz*step;
      actor.group.position.set(actor.pos.x, 0, actor.pos.z);
      actor.group.rotation.y = Math.atan2(dx, dz) + Math.PI/2;
      // kick animation when far in goal beat
      if (cur.type==='goal'){
        const ud = actor.group.userData;
        ud.legL.rotation.x = Math.sin(state.simT*12)*0.6;
        ud.legR.rotation.x = -Math.sin(state.simT*12)*0.6;
      }
    }

    // idle bobbing for all other players
    for (const p of players){
      if (p===actor) continue;
      p.idleT += dt*2;
      p.group.position.y = Math.sin(p.idleT)*0.02;
      // return home gently
      const dx = p.home.x - p.pos.x, dz = p.home.z - p.pos.z;
      p.pos.x += dx*dt*0.5; p.pos.z += dz*dt*0.5;
      p.group.position.x = p.pos.x; p.group.position.z = p.pos.z;
    }

    // camera broadcast tracking
    const bx = state.ball.x, bz = state.ball.z;
    const targetCamX = bx*0.4;
    const targetCamZ = bz*0.6 + 55;
    const targetCamY = 32 + Math.abs(bx)*0.05;
    camPos.x += (targetCamX - camPos.x)*Math.min(1,dt*1.5);
    camPos.y += (targetCamY - camPos.y)*Math.min(1,dt*1.5);
    camPos.z += (targetCamZ - camPos.z)*Math.min(1,dt*1.5);
    camera.position.copy(camPos);
    camTarget.set(bx*0.5, 1.5, bz*0.5);
    camera.lookAt(camTarget);

    // HUD updates
    const min = matchMinute(state.simT);
    const mm = Math.floor(min), ss = Math.floor((min-mm)*60);
    ui.clockTxt.textContent = String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
    ui.phaseTxt.textContent = phaseOf(state.simT);

    // timeline progress
    ui.tlProgress.style.width = Math.min(100, state.simT/MATCH_END*100) + '%';

    // goal overlay auto-hide
    if (goalOverlayTimer>0){
      goalOverlayTimer -= dt;
      if (goalOverlayTimer<=0) ui.goalOverlay.classList.remove('show');
    }

    // fulltime
    if (state.simT >= MATCH_END && !state.matchOver){
      showFullTime();
    }
  }

  renderer.render(scene, camera);
}
animate();

/* ---------- Resize ---------- */
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
