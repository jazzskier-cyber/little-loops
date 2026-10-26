import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RADIUS,SPACING,GAP,TAU,wrap} from './puzzle.js';
const TUBE=15,WEAVE=18;
// Jade: a domain-warped noise in ring space paints deep color, milky "cotton" clouds and fine dark veins,
// so the pattern runs continuously through the band and its rounded ends.
const JADE_NOISE=`uniform vec3 uOrigin;uniform float uSeed;varying vec3 vJade;
float jh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float jn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(jh(i),jh(i+vec3(1,0,0)),f.x),mix(jh(i+vec3(0,1,0)),jh(i+vec3(1,1,0)),f.x),f.y),mix(mix(jh(i+vec3(0,0,1)),jh(i+vec3(1,0,1)),f.x),mix(jh(i+vec3(0,1,1)),jh(i+vec3(1,1,1)),f.x),f.y),f.z);}
float jf(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*jn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}`;
function jadeMaterial(color,seed,origin){
 const mat=new THREE.MeshPhysicalMaterial({color,emissive:color,emissiveIntensity:.08,roughness:.1,metalness:0,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.35,
  transmission:.9,thickness:TUBE*2,ior:1.62,attenuationColor:color,attenuationDistance:TUBE*6});
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uOrigin:{value:origin},uSeed:{value:seed}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec3 uOrigin;varying vec3 vJade;').replace('#include <begin_vertex>','#include <begin_vertex>\nvJade=(modelMatrix*vec4(transformed,1.)).xyz-uOrigin;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+JADE_NOISE).replace('#include <color_fragment>',`#include <color_fragment>
   {float th=atan(vJade.y,vJade.x),rr=length(vJade.xy)-${RADIUS.toFixed(1)};
   // Seam-free coordinates stretched along the bangle, so clouds and veins flow around it like real jade.
   vec3 q=vec3(cos(th)*1.7,sin(th)*1.7,rr*.045+vJade.z*.03)+uSeed;q+=1.4*vec3(jf(q),jf(q+5.2),jf(q+9.7))-.7;float jade_n=jf(q);
   vec3 deep=pow(diffuse,vec3(1.7))*.8,pale=mix(diffuse,vec3(1.),.72);
   vec3 jade=mix(deep,diffuse,smoothstep(.34,.52,jade_n));jade=mix(jade,pale,smoothstep(.56,.72,jade_n));
   float vein=1.-smoothstep(0.,.018,abs(jf(q*2.2+3.)-.5));diffuseColor.rgb=mix(jade,deep*.6,vein*.55);}`);
 };
 mat.customProgramCacheKey=()=>'jade';return mat;
}
class RingPath extends THREE.Curve{
 constructor(ring,angle,puzzle){super();this.ring=ring;this.angle=angle;this.crossings=[];
  const phi=Math.acos(SPACING/(RADIUS*2));
  for(const edge of puzzle.edges.filter(e=>e.includes(ring.id))){const other=puzzle.rings[edge.find(i=>i!==ring.id)];if(!other.active)continue;const a=Math.atan2(other.y-ring.y,other.x-ring.x);
   // Complementary heights at the two intersections weave adjacent rings together.
   this.crossings.push({angle:a+phi,z:WEAVE},{angle:a-phi,z:-WEAVE});
  }
 }
 getPoint(t,target=new THREE.Vector3()){
  const a=this.angle+GAP/2+t*(TAU-GAP);let z=0;
  for(const crossing of this.crossings){const d=wrap(a-crossing.angle);z+=crossing.z*Math.exp(-d*d/.05);}
  return target.set(Math.cos(a)*RADIUS,Math.sin(a)*RADIUS,z);
 }
}
export class RingRenderer{
 constructor(canvas){
  this.canvas=canvas;this.scene=new THREE.Scene();this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=1;
  this.camera=new THREE.OrthographicCamera(-300,300,250,-250,1,2000);this.camera.position.set(0,0,1000);this.camera.lookAt(0,0,0);
  // A soft studio environment gives the polished jade something to reflect.
  // The board's paper gradient is painted in-scene so light passing through the jade has something to pick up.
  const paper=document.createElement('canvas');paper.width=paper.height=256;{const g=paper.getContext('2d'),grad=g.createRadialGradient(128,102,0,128,102,190);grad.addColorStop(0,'#fcfbf6');grad.addColorStop(1,'#f0f1e7');g.fillStyle=grad;g.fillRect(0,0,256,256);}
  this.scene.background=new THREE.CanvasTexture(paper);this.scene.background.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xfffdf6,0xd8cfbd,1.1));
  const sun=new THREE.DirectionalLight(0xfff6e4,2.4);sun.position.set(-220,360,600);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-520,right:520,top:520,bottom:-520,near:1,far:1400});sun.shadow.normalBias=.4;sun.shadow.bias=-.0001;sun.shadow.radius=5;this.scene.add(sun);
  const fill=new THREE.DirectionalLight(0xd7e8ec,1.6);fill.position.set(300,-150,400);this.scene.add(fill);
  // An opaque paper floor (not a shadow-only overlay) so the jade's transmission can see the paper and the shadows beneath it.
  this.floor=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshLambertMaterial({color:new THREE.Color('#f9f7f1').multiplyScalar(.45)}));sun.shadow.intensity=.6;this.floor.position.z=-WEAVE-TUBE-6;this.floor.receiveShadow=true;this.scene.add(this.floor);
  this.group=new THREE.Group();this.scene.add(this.group);this.items=[];this.visualAngles=new Map();this.selected=null;this.hint=null;this.particles=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.guide=new THREE.Group();this.scene.add(this.guide);this.guide.visible=false;
  this.resize();
 }
 load(puzzle){
  this.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});this.group.clear();this.items=[];this.puzzle=puzzle;this.visualAngles.clear();this.selected=null;this.hint=null;this.guide.visible=false;
  for(const ring of puzzle.rings){const group=new THREE.Group();group.position.set(ring.x,ring.y,0);this.group.add(group);
   const mat=jadeMaterial(ring.color,ring.id*7.31+puzzle.seed%97,new THREE.Vector3(ring.x,ring.y,0));
   const gold=new THREE.MeshPhysicalMaterial({color:0xe0b46a,metalness:1,roughness:.22,clearcoat:.6,clearcoatRoughness:.1,envMapIntensity:1.3});
   const item={group,mat,gold,angle:NaN,removedAt:null,ring,parts:[]};this.items.push(item);this.rebuild(item,ring.angle);
  }
  this.resize();
 }
 rebuild(item,angle){
  for(const p of item.parts){item.group.remove(p);p.geometry.dispose();}item.parts=[];
  const curve=new RingPath(item.ring,angle,this.puzzle),tube=new THREE.Mesh(new THREE.TubeGeometry(curve,200,TUBE,28,false),item.mat);tube.castShadow=true;tube.receiveShadow=true;item.group.add(tube);item.parts.push(tube);
  for(const t of [0,1]){const cap=new THREE.Mesh(new THREE.SphereGeometry(TUBE,28,16),item.mat);cap.position.copy(curve.getPoint(t));cap.castShadow=true;item.group.add(cap);item.parts.push(cap);}
  // Gold clasps bind each crossing where this bangle passes on top; a clasp hides while the opening sits over it.
  for(const c of curve.crossings){if(c.z<0)continue;const t=((wrap(c.angle-angle-GAP/2)+TAU)%TAU)/(TAU-GAP);if(t<.05||t>.95)continue;
   const clasp=new THREE.Mesh(new THREE.TorusGeometry(TUBE+1.4,2.6,12,40),item.gold);clasp.position.copy(curve.getPoint(t));clasp.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),curve.getTangent(t));clasp.scale.set(1,1,2.2);clasp.castShadow=true;item.group.add(clasp);item.parts.push(clasp);
   for(const s of [-1,1]){const bead=new THREE.Mesh(new THREE.TorusGeometry(TUBE+.8,1.3,8,40),item.gold);bead.position.copy(clasp.position).addScaledVector(curve.getTangent(t),s*7.5);bead.quaternion.copy(clasp.quaternion);item.group.add(bead);item.parts.push(bead);}}
  item.angle=angle;
 }
 resize(){
  const {width,height}=this.canvas.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);
  const rings=this.puzzle?.rings||[];const maxX=Math.max(100,...rings.map(r=>Math.abs(r.x)+RADIUS+TUBE)),maxY=Math.max(90,...rings.map(r=>Math.abs(r.y)+RADIUS+TUBE));
  // Fit the rings (plus room for the hint arc) into the band between the board title and the messages below.
  const top=50,bottom=68,side=28,scale=Math.max((maxY*2+40)/Math.max(120,height-top-bottom),(maxX*2+40)/Math.max(120,width-side*2),1/1.15);
  this.viewH=height*scale;this.viewW=width*scale;this.centerY=(top-bottom)/2*scale;
  Object.assign(this.camera,{left:-this.viewW/2,right:this.viewW/2,top:this.viewH/2+this.centerY,bottom:-this.viewH/2+this.centerY});this.camera.updateProjectionMatrix();
 }
 toWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:((clientX-r.left)/r.width-.5)*this.viewW,y:(.5-(clientY-r.top)/r.height)*this.viewH+this.centerY};}
 hit(point){
  const candidates=[];
  for(const ring of this.puzzle.rings){if(!ring.active)continue;const distance=Math.hypot(point.x-ring.x,point.y-ring.y),angle=Math.atan2(point.y-ring.y,point.x-ring.x),gap=Math.abs(wrap(angle-(this.visualAngles.get(ring.id)??ring.angle)))<GAP/2-.15;if(!gap&&Math.abs(distance-RADIUS)<21)candidates.push({id:ring.id,d:Math.abs(distance-RADIUS)});}
  candidates.sort((a,b)=>a.d-b.d);return candidates[0]?.id??null;
 }
 select(id){if(this.selected!==id)this.hint=null;this.selected=id;}
 setAngle(id,angle){this.visualAngles.set(id,angle);}
 remove(id,now){const item=this.items[id];item.removedAt=now;item.exitAngle=(this.visualAngles.get(id)??item.ring.angle)+Math.PI;this.visualAngles.delete(id);
  for(const other of this.items)if(other.ring.active)other.angle=NaN;
  this.spark(item.ring.x,item.ring.y,item.ring.color);
 }
 spark(x,y,color){if(this.reduced)return;for(let i=0;i<12;i++){const geometry=new THREE.SphereGeometry(2+Math.random()*1.5,6,4),mat=new THREE.MeshBasicMaterial({color,transparent:true}),mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,35);this.scene.add(mesh);const a=i/12*TAU;this.particles.push({mesh,vx:Math.cos(a)*(25+Math.random()*40),vy:Math.sin(a)*(25+Math.random()*40),life:1});}}
 showHint(hint){this.selected=hint.id;this.hint=hint;this.guide.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.guide.clear();const r=this.puzzle.rings[hint.id];
  const points=[];for(let i=0;i<=25;i++){const a=hint.angle-GAP/2+i/25*GAP;points.push(new THREE.Vector3(r.x+Math.cos(a)*(RADIUS+TUBE+10),r.y+Math.sin(a)*(RADIUS+TUBE+10),35));}
  const geometry=new THREE.BufferGeometry().setFromPoints(points),line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0xb89a61,dashSize:5,gapSize:5,transparent:true,opacity:.8}));line.computeLineDistances();this.guide.add(line);this.guide.visible=true;
  const dot=new THREE.Mesh(new THREE.SphereGeometry(4,12,8),new THREE.MeshBasicMaterial({color:0xc3a261}));dot.position.set(r.x+Math.cos(hint.angle)*(RADIUS+TUBE+10),r.y+Math.sin(hint.angle)*(RADIUS+TUBE+10),35);this.guide.add(dot);
 }
 render(now,dt){
  if(!this.puzzle)return;
  for(const item of this.items){const ring=item.ring,angle=this.visualAngles.get(ring.id)??ring.angle;
   if(item.removedAt!==null){const t=Math.min(1,(now-item.removedAt)/(this.reduced?.2:.7)),ease=1-(1-t)**3;item.group.position.set(ring.x+Math.cos(item.exitAngle)*ease*100,ring.y+Math.sin(item.exitAngle)*ease*100,ease*90);item.group.scale.setScalar(1-ease*.22);for(const m of [item.mat,item.gold]){m.transparent=true;m.opacity=1-ease;}item.group.visible=t<1;continue;}
   item.group.visible=ring.active;item.mat.emissiveIntensity=this.selected===ring.id?.26:.08;
   if(ring.active&&(!Number.isFinite(item.angle)||Math.abs(wrap(angle-item.angle))>.002))this.rebuild(item,angle);
  }
  if(!this.hint||!this.puzzle.rings[this.hint.id].active)this.guide.visible=false;
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt*1.5;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.material.opacity=Math.max(0,p.life);if(p.life<=0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.particles.splice(i,1);}}
  this.renderer.render(this.scene,this.camera);
 }
}
