import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

// GLTFExporter only uses FileReader for the final Blob when geometry has no textures.
globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const out = new URL('../public/models/', import.meta.url);
await mkdir(out, { recursive: true });
const exporter = new GLTFExporter();
const material = (color, roughness = .78, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const add = (parent, name, geometry, mat, x=0,y=0,z=0, rx=0,ry=0,rz=0) => {
  const mesh = new THREE.Mesh(geometry, mat); mesh.name=name; mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,rz); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
};
const box=(p,n,w,h,d,m,x=0,y=0,z=0)=>add(p,n,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cyl=(p,n,rt,rb,h,m,x=0,y=0,z=0,s=8)=>add(p,n,new THREE.CylinderGeometry(rt,rb,h,s),m,x,y,z);
const bevel=(p,n,w,h,d,r,m,x=0,y=0,z=0)=>{
  const shape=new THREE.Shape(); const a=-w/2,b=-h/2; shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
  const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*.55,bevelSegments:2,curveSegments:3});g.translate(0,0,-(d-2*r)/2);return add(p,n,g,m,x,y,z);
};
async function save(name, root){ root.updateMatrixWorld(true); const data=await exporter.parseAsync(root,{binary:true,onlyVisible:true}); await writeFile(new URL(name+'.glb',out),Buffer.from(data)); console.log(name+'.glb',data.byteLength); }

function carriage(modern=false){
  const g=new THREE.Group();g.name=modern?'Modern carriage':'Classic carriage';
  const floor=material(modern?'#626d70':'#66503d'), wall=material(modern?'#dadfdc':'#eadbc0'), trim=material(modern?'#374e53':'#65472f',.48), metal=material(modern?'#bac5c3':'#b79158',.31,.7), ceiling=material(modern?'#e7ebe6':'#e8d7bd'), fabric=material(modern?'#334d56':'#9c553f');
  box(g,'Floor',3.7,.24,15,floor,0,.05,0);box(g,'Center aisle',.85,.02,14.6,material(modern?'#7b8585':'#7b6a56'),0,.18,0);
  for(const x of [-1.88,1.88]){
    box(g,'Lower wall',.13,1.0,15,wall,x,.73,0);box(g,'Upper wall',.16,.57,15,wall,x,3.02,0);
    box(g,'Window sill',.22,.10,15,trim,x,1.19,0);box(g,'Window header',.23,.10,15,trim,x,2.72,0);
    for(let z=-6.1;z<=6.01;z+=3){
      box(g,'Window pillar',.16,1.6,.18,trim,x,1.97,z);
      box(g,'Metal edge',.03,1.56,.21,metal,x+(x>0?-.08:.08),1.97,z);
    }
    box(g,'Lower wall stripe',.018,.045,15,metal,x+(x>0?-.08:.08),.98,0);
    box(g,'Luggage shelf',.52,.065,14.3,trim,x+(x>0?-.31:.31),2.85,0);
    for(let z=-6;z<7;z+=1.5){box(g,'Shelf bracket',.43,.035,.045,metal,x+(x>0?-.28:.28),2.74,z);}
  }
  // Curved ceiling profile: a continuous faceted arch built from custom triangles.
  const vertices=[],normals=[];const cross=[[-1.9,3.22],[-1.65,3.42],[-1.05,3.53],[0,3.57],[1.05,3.53],[1.65,3.42],[1.9,3.22]];
  for(let i=0;i<cross.length-1;i++){const a=cross[i],b=cross[i+1];const pts=[[a[0],a[1],-7.5],[a[0],a[1],7.5],[b[0],b[1],-7.5],[b[0],b[1],-7.5],[a[0],a[1],7.5],[b[0],b[1],7.5]];for(const q of pts)vertices.push(...q);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();add(g,'Arched ceiling',geo,new THREE.MeshStandardMaterial({color:modern?'#e6ebea':'#e6d4b4',side:THREE.DoubleSide,roughness:.87}));
  for(let z=-5.75;z<7;z+=2.9){bevel(g,'Ceiling lamp',.15,.035,.77,.012,material('#fff0cb',.27),0,3.51,z);box(g,'Lamp trim',.26,.025,.85,metal,0,3.53,z);}
  for(const z of [-7.35,7.35]){box(g,'End vestibule',3.7,3.28,.2,wall,0,1.72,z);bevel(g,'Door panel',.82,2.55,.07,.08,trim,0,1.63,z+(z>0?-.12:.12));bevel(g,'Door glass',.55,1.04,.035,.05,material(modern?'#556f71':'#967b5c',.2),0,2.06,z+(z>0?-.17:.17));}
  if(!modern){for(const x of [-1.6,1.6])for(let z=-6.9;z<7;z+=3){box(g,'Wood panel inset',.015,.41,2.65,fabric,x,0.55,z+1.3);}}
  return g;
}
function seat(modern=false){
  const g=new THREE.Group();g.name=modern?'Modern seat':'Classic upholstered seat';
  const upholstery=material(modern?'#5d868d':'#9d5b43',.94), darker=material(modern?'#3c626a':'#754535'), frame=material(modern?'#647579':'#765537',.5), metal=material(modern?'#a4b3b5':'#bc965e',.35,.52);
  for(const x of [-.34,.34])for(const z of [-.34,.35])cyl(g,'Tapered leg',.046,.07,.43,metal,x,.22,z,8);
  bevel(g,'Seat base',1.09,.17,.94,.05,frame,0,.49,.03);bevel(g,'Cushion',1.02,.20,.86,.07,upholstery,0,.62,-.02);
  bevel(g,'Backrest',1.10,1.25,.19,.07,upholstery,0,1.28,.43);bevel(g,'Back inset',.92,.87,.044,.04,darker,0,1.31,.31);
  bevel(g,'Headrest',1.04,.23,.22,.05,upholstery,0,1.96,.41);
  for(const x of [-.59,.59]){bevel(g,'Armrest',.12,.085,.68,.035,frame,x,.99,-.02);cyl(g,'Arm support',.025,.03,.42,metal,x,.75,.24,8);}
  if(!modern){for(const x of [-.18,.18]){box(g,'Back stitching',.012,.72,.012,material('#b77d64'),x,1.32,.282);}}
  return g;
}
function tree(){const g=new THREE.Group();g.name='Layered fir tree';const trunk=material('#715843'),leaf1=material('#426b54'),leaf2=material('#5d8260'),leaf3=material('#365945');cyl(g,'trunk',.14,.20,1.2,trunk,0,.60,0,7);for(const [name,y,r,h,m] of [['foliage low',1.85,1.03,1.85,leaf3],['foliage mid',2.48,.82,1.60,leaf1],['foliage crown',3.08,.60,1.45,leaf2]])add(g,name,new THREE.ConeGeometry(r,h,7,1),m,0,y,0);return g;}
function house(){const g=new THREE.Group();g.name='Countryside house';const plaster=material('#ddd1ae'),wood=material('#795c43'),roof=material('#866653'),glass=material('#64858b',.25,.12);box(g,'House walls',3.6,2.5,3.2,plaster,0,1.3,0);box(g,'Foundation',3.9,.27,3.5,wood,0,.12,0);for(const x of [-.95,.95]){box(g,'Front window',.72,.8,.04,wood,x,1.55,1.63);box(g,'Window glass',.58,.67,.05,glass,x,1.55,1.67);box(g,'Window divider',.035,.74,.06,wood,x,1.55,1.72);}box(g,'Front door',.8,1.45,.06,wood,0,.8,1.65);cyl(g,'Door knob',.055,.055,.04,material('#cfad70',.25,.65),.25,.83,1.70,10).rotation.x=Math.PI/2;for(const x of [-1.01,1.01]){const panel=box(g,'Pitched roof',2.54,.14,3.7,roof,x,3.05,0);panel.rotation.z=x>0?-.67:.67;}box(g,'Chimney',.42,1.0,.45,wood,1.0,3.65,-.65);return g;}
function pole(){const g=new THREE.Group();g.name='Railway telegraph pole';const wood=material('#71543c'),dark=material('#363d3a'),ceramic=material('#e1d6b8',.35);cyl(g,'Utility pole',.085,.16,5,wood,0,2.5,0,8);box(g,'Cross arm',2.1,.13,.14,wood,0,4.12,0);for(const x of [-.85,-.42,.42,.85]){cyl(g,'Insulator',.085,.10,.18,ceramic,x,4.25,0,8);cyl(g,'Insulator cap',.055,.055,.025,dark,x,4.36,0,8);}box(g,'Lower brace',.09,.8,.09,dark,0,3.75,.1);return g;}
function station(){const g=new THREE.Group();g.name='Small rural station';const concrete=material('#999b91'),wood=material('#654d3b'),roof=material('#536664'),sign=material('#e9ddbf');box(g,'Platform',7,.42,14,concrete,0,.21,0);for(const z of [-5,5])for(const x of [-2.5,2.5])cyl(g,'Canopy support',.085,.1,3.1,wood,x,1.95,z,8);box(g,'Canopy',6.2,.18,13,roof,0,3.55,0);box(g,'Station sign',2.7,.64,.08,sign,0,2.58,0);box(g,'Bench',2.2,.13,.65,wood,0,.75,-3);for(const x of [-.85,.85])box(g,'Bench leg',.09,.6,.5,wood,x,.42,-3);box(g,'Bench back',2.2,.57,.09,wood,0,1.08,-3.27);return g;}

for(const mode of ['vintage','modern']){await save(`carriage_${mode}`,carriage(mode==='modern'));await save(`seat_${mode}`,seat(mode==='modern'));}
for(const [name,fn] of Object.entries({tree,house,pole,station}))await save(name,fn());
