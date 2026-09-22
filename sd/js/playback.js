export class Playback{
 constructor(render){this.render=render;this.rows=[];this.position=0;this.delay=500;this.playing=false;this.timer=null;}
 load(rows){this.pause();this.rows=rows;this.position=0;this.show();}
 show(){this.render(this.position,this.playing);}
 pause(){clearTimeout(this.timer);this.playing=false;this.show();}
 seek(n){this.position=Math.max(0,Math.min(n,this.rows.length));this.show();}
 next(){this.pause();this.seek(this.position+1);}
 play(){clearTimeout(this.timer);if(!this.rows.length)return;if(this.position>=this.rows.length)this.position=0;this.playing=true;if(this.delay===0){this.position=this.rows.length;this.pause();return;}this.show();this.timer=setTimeout(()=>this.tick(),this.delay);}
 tick(){if(!this.playing)return;this.position++;if(this.position>=this.rows.length){this.pause();return;}this.show();this.timer=setTimeout(()=>this.tick(),this.delay);}
 replay(){this.pause();this.position=0;this.play();}
 skip(){this.pause();this.seek(this.rows.length);}
}
export function drawChart(canvas,rows,position){
 const width=canvas.clientWidth||600,height=220,dpr=globalThis.devicePixelRatio||1;canvas.width=width*dpr;canvas.height=height*dpr;
 const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const pad={left:42,right:12,top:15,bottom:30};const w=width-pad.left-pad.right,h=height-pad.top-pad.bottom;
 const shown=rows.slice(0,position),last=shown.at(-1),max=Math.max(5,last?.total_a||0,last?.total_b||0),n=Math.max(1,position);
 ctx.font='11px monospace';ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const y=pad.top+h*(1-i/4);ctx.strokeStyle='#29323e';ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();ctx.fillStyle='#a3acba';ctx.fillText(Math.round(max*i/4),2,y+4);}
 ctx.fillStyle='#a3acba';ctx.fillText('0',pad.left,height-8);ctx.fillText(`Round ${position}`,Math.max(pad.left,width-88),height-8);
 for(const side of ['a','b']){ctx.strokeStyle=side==='a'?'#ffb454':'#6ddbd7';ctx.lineWidth=2;ctx.setLineDash(side==='b'?[5,3]:[]);ctx.beginPath();ctx.moveTo(pad.left,pad.top+h);const stride=Math.max(1,Math.floor(shown.length/1000));for(let i=0;i<shown.length;i++){if(i%stride&&i!==shown.length-1)continue;const r=shown[i];ctx.lineTo(pad.left+r.round/n*w,pad.top+h-r[`total_${side}`]/max*h);}ctx.stroke();}ctx.setLineDash([]);
 canvas.setAttribute('aria-label',`Cumulative points through round ${position}: A ${last?.total_a||0}, B ${last?.total_b||0}. A is solid amber; B is dashed cyan.`);
}
