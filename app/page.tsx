"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "menu" | "playing" | "over";
type Obstacle = { lane: number; z: number; type: "wall" | "gate" | "orb"; hit?: boolean };

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({ lane: 0, targetLane: 0, y: 0, vy: 0, speed: 18, distance: 0, score: 0, combo: 1, energy: 65, shake: 0, obstacles: [] as Obstacle[], spawnAt: 25, time: 0 });
  const [state, setState] = useState<GameState>("menu");
  const stateRef = useRef<GameState>("menu");
  const [hud, setHud] = useState({ score: 0, combo: 1, energy: 65, speed: 0 });
  const [best, setBest] = useState(0);

  useEffect(() => { setBest(Number(localStorage.getItem("neon-rift-best") || 0)); }, []);
  const move = useCallback((dir: number) => { const g = gameRef.current; g.targetLane = Math.max(-1, Math.min(1, g.targetLane + dir)); }, []);
  const jump = useCallback(() => { const g = gameRef.current; if (g.y <= 0.02) g.vy = 8.8; }, []);
  const dash = useCallback(() => { const g = gameRef.current; if (g.energy >= 20) { g.energy -= 20; g.speed += 10; g.shake = 0.18; } }, []);
  const start = useCallback(() => {
    gameRef.current = { lane: 0, targetLane: 0, y: 0, vy: 0, speed: 18, distance: 0, score: 0, combo: 1, energy: 65, shake: 0, obstacles: [], spawnAt: 22, time: 0 };
    stateRef.current = "playing"; setState("playing");
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (["ArrowLeft","ArrowRight","ArrowUp"," ","a","d","w","A","D","W","Shift"].includes(e.key)) e.preventDefault();
      if (stateRef.current !== "playing") { if (e.key === " " || e.key === "Enter") start(); return; }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") move(-1);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") move(1);
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") jump();
      if (e.key === "Shift") dash();
    };
    addEventListener("keydown", key); return () => removeEventListener("keydown", key);
  }, [dash, jump, move, start]);

  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!; let raf = 0; let last = performance.now();
    const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
    resize(); addEventListener("resize", resize);
    const draw = (now: number) => {
      const dt = Math.min(.033, (now-last)/1000); last=now; const W=canvas.width, H=canvas.height, d=devicePixelRatio; const g=gameRef.current; g.time += dt;
      if (stateRef.current === "playing") {
        g.speed += dt*.32; if (g.speed > 20) g.speed -= dt*1.2; g.distance += g.speed*dt; g.score += Math.floor(g.speed*dt*8*g.combo); g.energy=Math.min(100,g.energy+dt*3.2); g.lane += (g.targetLane-g.lane)*Math.min(1,dt*7.5);
        if (g.y>0 || g.vy>0) { g.y += g.vy*dt; g.vy -= 20*dt; if(g.y<0){g.y=0;g.vy=0;} }
        for(const o of g.obstacles) o.z -= g.speed*dt;
        g.obstacles = g.obstacles.filter(o=>o.z>-4);
        if(g.distance>g.spawnAt){
          const lane=Math.floor(Math.random()*3)-1; const type=Math.random()<.28?"orb":Math.random()<.58?"gate":"wall"; g.obstacles.push({lane,z:65+Math.random()*10,type});
          if(Math.random()<.26) g.obstacles.push({lane: lane===1?-1:lane+1,z:70,type:"orb"});
          g.spawnAt=g.distance+Math.max(9,18-g.speed*.22)+Math.random()*7;
        }
        for(const o of g.obstacles) if(!o.hit && o.z<3.2 && o.z>0 && Math.abs(o.lane-g.lane)<.48){
          o.hit=true;
          if(o.type==="orb"){g.score+=250*g.combo;g.combo=Math.min(9,g.combo+1);g.energy=Math.min(100,g.energy+16);g.shake=.08;}
          else if((o.type==="wall" && g.y<1.15) || (o.type==="gate" && g.y>.75)){
            stateRef.current="over";setState("over"); const b=Math.max(best,g.score);setBest(b);localStorage.setItem("neon-rift-best",String(b));g.shake=.6;
          } else {g.score+=120*g.combo;g.combo=Math.min(9,g.combo+1);}
        }
        if(Math.floor(g.time*10)%3===0) setHud({score:g.score,combo:g.combo,energy:g.energy,speed:g.speed});
      }
      g.shake=Math.max(0,g.shake-dt); const sx=(Math.random()-.5)*g.shake*25*d, sy=(Math.random()-.5)*g.shake*18*d;
      ctx.setTransform(1,0,0,1,0,0); const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#050818");grad.addColorStop(.62,"#120929");grad.addColorStop(1,"#02030a");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
      ctx.save();ctx.translate(sx,sy); const horizon=H*.39, center=W*.5;
      // stars
      for(let i=0;i<90;i++){const x=((i*7919)%1000)/1000*W, y=((i*3571)%390)/1000*H;const a=.2+.7*Math.abs(Math.sin(i+g.time));ctx.fillStyle=`rgba(140,190,255,${a})`;ctx.fillRect(x,y,1.2*d,1.2*d);}
      // sun
      const sun=ctx.createRadialGradient(center,horizon,0,center,horizon,140*d);sun.addColorStop(0,"rgba(255,47,184,.65)");sun.addColorStop(.35,"rgba(151,30,255,.16)");sun.addColorStop(1,"transparent");ctx.fillStyle=sun;ctx.fillRect(center-160*d,horizon-160*d,320*d,320*d);
      const proj=(x:number,z:number,y=0)=>{const zz=Math.max(1,z);const s=(H*.78)/(zz+7);return {x:center+x*s*2.8,y:horizon+(2.4-y)*s,s};};
      // tunnel/grid
      ctx.lineWidth=1*d; for(let lane=-2;lane<=2;lane++){ctx.beginPath();for(let z=2;z<90;z+=2){const p=proj(lane*2.15,z);z===2?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}ctx.strokeStyle=lane===-2||lane===2?"rgba(255,51,191,.65)":"rgba(40,225,255,.26)";ctx.stroke();}
      const offset=g.distance%5; for(let z=5-offset;z<90;z+=5){const a=proj(-4.3,z),b=proj(4.3,z);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(41,229,255,${Math.max(.05,.42-z/240)})`;ctx.stroke();}
      // obstacles back-to-front
      [...g.obstacles].sort((a,b)=>b.z-a.z).forEach(o=>{if(o.hit&&o.type!=="orb")return;const p=proj(o.lane*2.15,o.z,o.type==="gate"?1.2:0);if(p.s<2)return;ctx.save();ctx.translate(p.x,p.y);if(o.type==="orb"){const r=Math.max(3,p.s*.55);const glow=ctx.createRadialGradient(0,0,0,0,0,r*2.5);glow.addColorStop(0,"white");glow.addColorStop(.25,"#65fff0");glow.addColorStop(1,"transparent");ctx.fillStyle=glow;ctx.fillRect(-r*2.5,-r*2.5,r*5,r*5);ctx.fillStyle="#dffff8";ctx.beginPath();ctx.arc(0,0,r*.45,0,7);ctx.fill();}else{const w=p.s*1.35,h=p.s*(o.type==="gate"?.55:1.25);ctx.shadowBlur=22*d;ctx.shadowColor=o.type==="gate"?"#ffb02e":"#ff2f85";ctx.fillStyle=o.type==="gate"?"#ff9d1a":"#e21b72";ctx.fillRect(-w/2,-h,w,h);ctx.fillStyle="#fff";ctx.globalAlpha=.8;ctx.fillRect(-w/2,-h,w,.06*h);}ctx.restore();});
      // player hover bike
      const pp=proj(g.lane*2.15,2.2,g.y+.25), bob=Math.sin(g.time*13)*2*d;ctx.save();ctx.translate(pp.x,pp.y+bob);ctx.shadowBlur=28*d;ctx.shadowColor="#3ff6ff";ctx.fillStyle="#77fbff";ctx.beginPath();ctx.moveTo(0,-26*d);ctx.lineTo(18*d,15*d);ctx.lineTo(0,9*d);ctx.lineTo(-18*d,15*d);ctx.closePath();ctx.fill();ctx.fillStyle="#ff45ca";ctx.fillRect(-5*d,8*d,10*d,24*d);ctx.restore();
      // speed streaks
      if(g.speed>22){ctx.globalAlpha=Math.min(.45,(g.speed-22)/20);ctx.strokeStyle="#b5fdff";for(let i=0;i<18;i++){const x=(i*197%1000)/1000*W,y=(i*83%550)/1000*H+H*.42;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(x-center)*.08,y+35*d);ctx.stroke();}ctx.globalAlpha=1;}
      ctx.restore(); raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw); return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);};
  }, [best]);

  return <main>
    <canvas ref={canvasRef} aria-label="NEON RIFT 3Dゲーム画面" />
    <header><div className="brand">NEON <i>RIFT</i></div><div className="live"><span/> LIVE RUN</div></header>
    {state==="playing" && <section className="hud"><div><small>SCORE</small><strong>{hud.score.toLocaleString().padStart(7,"0")}</strong></div><div><small>FLOW</small><strong className="combo">×{hud.combo}</strong></div><div className="energy"><small>RIFT ENERGY</small><div><span style={{width:`${hud.energy}%`}}/></div></div><div><small>SPEED</small><strong>{Math.round(hud.speed*18)}<em> km/h</em></strong></div></section>}
    {state==="menu" && <section className="panel"><p className="eyebrow">RUN // SURVIVE // ASCEND</p><h1>NEON<br/><span>RIFT</span></h1><p className="lead">崩壊するデータ宇宙を、限界速度で駆け抜けろ。<br/>反射神経だけが、次の1秒をつくる。</p><button onClick={start}>ENTER THE RIFT <b>→</b></button><p className="hint">SPACE / TAP TO START</p></section>}
    {state==="over" && <section className="panel over"><p className="eyebrow">SIGNAL LOST</p><h2>RUN<br/>TERMINATED</h2><div className="result"><span>SCORE <b>{gameRef.current.score.toLocaleString()}</b></span><span>BEST <b>{best.toLocaleString()}</b></span></div><button onClick={start}>REBOOT RUN <b>↻</b></button></section>}
    <div className="controls"><button aria-label="左へ" onPointerDown={()=>move(-1)}>←</button><button aria-label="ジャンプ" onPointerDown={jump}>↑<small>JUMP</small></button><button aria-label="右へ" onPointerDown={()=>move(1)}>→</button><button className="dash" aria-label="ダッシュ" onPointerDown={dash}>⚡<small>DASH</small></button></div>
    <footer><span>A / D　MOVE</span><span>W / SPACE　JUMP</span><span>SHIFT　RIFT DASH</span></footer>
  </main>;
}
