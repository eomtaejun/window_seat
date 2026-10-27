import * as THREE from 'three';

const CHUNK = 48, COUNT = 9;
const LANDSCAPES = {
  forest:{ground:0x748b68,far:0x657b67,fog:0xa9c8c1},
  mountain:{ground:0x87927c,far:0x667987,fog:0xb8c9c7},
  coast:{ground:0xc2b58d,far:0x7896a2,fog:0xb5d1d2}
};
const rand=(seed)=>{let a=seed|0;return()=>{a=(a*1664525+1013904223)|0;return(a>>>0)/4294967296;};};
const mat=(c,r=.9,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const shared={grass:new THREE.ConeGeometry(.12,.65,3),stone:new THREE.DodecahedronGeometry(1,0),mountain:new THREE.ConeGeometry(1,1,5),trunk:new THREE.CylinderGeometry(.12,.18,1,6),rail:new THREE.BoxGeometry(.08,.09,CHUNK),sleeper:new THREE.BoxGeometry(2.4,.1,.18)};

export class World {
  constructor(scene,models){this.scene=scene;this.models=models;this.root=new THREE.Group();this.root.name='Reusable scenery chunks';scene.add(this.root);this.landscape='forest';this.distance=0;this.chunks=[];this.materials={};this.setLandscape('forest');}
  setLandscape(name){
    this.landscape=name;for(const c of this.chunks){this.root.remove(c);this.disposeChunk(c);}this.chunks=[];
    const palette=LANDSCAPES[name];this.materials={ground:mat(palette.ground),far:mat(palette.far),trunk:mat(0x655342),grass:mat(name==='coast'?0x9b9e6b:0x759a64),stone:mat(name==='mountain'?0x929a96:0x9a9a82),rail:mat(0x6f7675,.5,.25),sleeper:mat(0x665a4c),sea:mat(0x5d9fae,.27,.13),sand:mat(0xc4b38c),mountain:mat(name==='coast'?0x71899a:0x687a78),snow:mat(0xd6dcd6)};
    for(let i=0;i<COUNT;i++){const chunk=this.createChunk(i);chunk.position.z=(i-4)*CHUNK;this.root.add(chunk);this.chunks.push(chunk);}
  }
  disposeChunk(c){c.traverse(o=>{if(o.isMesh && o.userData.ownedGeometry)o.geometry.dispose();});}
  createChunk(index){
    const g=new THREE.Group();g.name=`Scenery chunk ${index+1}`;const r=rand(9823+index*7183+(this.landscape==='forest'?1:this.landscape==='mountain'?2:3));
    const M=this.materials;
    // Two terrain sheets flank the train. Their vertex heights form rolling land.
    for(const side of [-1,1]){
      const coastal=this.landscape==='coast'&&side===1;const width=coastal?18:90,center=coastal?11.5:47.5;
      const geom=new THREE.PlaneGeometry(width,CHUNK,coastal?4:15,8);geom.rotateX(-Math.PI/2);
      const pos=geom.attributes.position;for(let j=0;j<pos.count;j++){const x=pos.getX(j),worldX=side*center+x;const z=pos.getZ(j);const distance=Math.max(0,Math.abs(worldX)-6);const wave=Math.sin((z+index*CHUNK)*.047+worldX*.064)*.55+Math.sin((z-index*13)*.092+worldX*.15)*.22;pos.setY(j,coastal?-.12:(distance<4?0:wave*(this.landscape==='mountain'?3.3:.95))-.18);}
      geom.computeVertexNormals();const land=new THREE.Mesh(geom,M.ground);land.position.x=side*center;land.receiveShadow=true;land.userData.ownedGeometry=true;g.add(land);
      if(coastal){const sea=new THREE.Mesh(new THREE.PlaneGeometry(170,CHUNK),M.sea);sea.rotation.x=-Math.PI/2;sea.position.set(105,-.22,0);sea.userData.ownedGeometry=true;g.add(sea);const beach=new THREE.Mesh(new THREE.PlaneGeometry(18,CHUNK),M.sand);beach.rotation.x=-Math.PI/2;beach.position.set(20,-.10,0);beach.userData.ownedGeometry=true;g.add(beach);}
    }
    // The neighboring railway ties the outside world to the moving carriage.
    for(const x of [4.8,6.35]){const rail=new THREE.Mesh(shared.rail,M.rail);rail.position.set(x,.04,0);g.add(rail);}
    const sleepers=new THREE.InstancedMesh(shared.sleeper,M.sleeper,36);const dummy=new THREE.Object3D();for(let i=0;i<36;i++){dummy.position.set(5.57,-.035,-CHUNK/2+i*1.35);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);}g.add(sleepers);
    const tree=this.models.tree;const parts=[];tree.updateMatrixWorld(true);tree.traverse(o=>{if(o.isMesh)parts.push(o);});
    const treesPerChunk=this.landscape==='forest'?72:this.landscape==='mountain'?42:16;
    const placements=[];for(let i=0;i<treesPerChunk;i++){const side=this.landscape==='coast'?(i%4===0?1:-1):(i%3===0?-1:1);const range=this.landscape==='coast'&&side===1?9:65;const x=side*(8+r()*range);const z=(r()-.5)*CHUNK;const size=.65+r()*1.45;placements.push(new THREE.Matrix4().compose(new THREE.Vector3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r()*Math.PI*2),new THREE.Vector3(size,size,size)));}
    for(const part of parts){const mesh=new THREE.InstancedMesh(part.geometry,part.material,treesPerChunk);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.name=`Instanced ${part.name}`;for(let i=0;i<treesPerChunk;i++)mesh.setMatrixAt(i,placements[i].clone().multiply(part.matrixWorld));mesh.instanceMatrix.needsUpdate=true;g.add(mesh);}
    const grassCount=this.landscape==='coast'?160:330;const grass=new THREE.InstancedMesh(shared.grass,M.grass,grassCount);grass.name='Instanced grass';grass.frustumCulled=false;for(let i=0;i<grassCount;i++){let side=i%2?1:-1;let x=side*(3.3+r()*(this.landscape==='coast'&&side===1?18:58));dummy.position.set(x,.2,(r()-.5)*CHUNK);dummy.rotation.set(0,r()*6.28,0);const s=.25+r()*.9;dummy.scale.set(s,s,s);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}grass.instanceMatrix.needsUpdate=true;g.add(grass);
    const stoneCount=24;const stones=new THREE.InstancedMesh(shared.stone,M.stone,stoneCount);stones.name='Instanced rocks';for(let i=0;i<stoneCount;i++){let x=(i%2?-1:1)*(7+r()*65);dummy.position.set(x,.15,(r()-.5)*CHUNK);dummy.rotation.set(r(),r()*6,r());let s=.2+r()*.8;dummy.scale.set(s,s*.48,s);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}g.add(stones);
    const mountainCount=this.landscape==='coast'?5:14;const distant=new THREE.InstancedMesh(shared.mountain,M.mountain,mountainCount);distant.name='Distant mountain silhouettes';for(let i=0;i<mountainCount;i++){const side=this.landscape==='coast'?(i===0?1:-1):(i%2?1:-1);const height=this.landscape==='mountain'?25+r()*26:11+r()*16;dummy.position.set(side*(75+r()*40),height*.42-1,(r()-.5)*CHUNK);dummy.rotation.set(0,r()*6,0);dummy.scale.set(12+r()*16,height,12+r()*16);dummy.updateMatrix();distant.setMatrixAt(i,dummy.matrix);}g.add(distant);
    // Repeated GLB props are sparse enough to keep as independent models.
    if(index%2===0){const pole=this.models.pole.clone(true);pole.position.set(10,0,-12+r()*24);g.add(pole);}
    if(index%3===1){const house=this.models.house.clone(true);house.position.set((index%2?-1:1)*(24+r()*16),0,(r()-.5)*27);house.rotation.y=r()*6.28;house.scale.setScalar(.8+r()*.55);g.add(house);}
    if(index===5){const station=this.models.station.clone(true);station.position.set(14,0,-3);station.rotation.y=Math.PI/2;g.add(station);}
    return g;
  }
  update(dt,speed=12){const travel=dt*speed;this.distance+=travel;for(const c of this.chunks){c.position.z+=travel;if(c.position.z>CHUNK*4.5){let min=Math.min(...this.chunks.map(q=>q.position.z));c.position.z=min-CHUNK;}}}
}
