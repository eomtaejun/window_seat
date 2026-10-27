import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const destination = new URL('../public/models/', import.meta.url);
await mkdir(destination, { recursive: true });
const exporter = new GLTFExporter();
const mat = (color, roughness = .76, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
function mesh(parent, name, geometry, material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}
const box = (p, n, w, h, d, m, x = 0, y = 0, z = 0) => mesh(p, n, new THREE.BoxGeometry(w, h, d), m, x, y, z);
const cyl = (p, n, r, h, m, x = 0, y = 0, z = 0) => mesh(p, n, new THREE.CylinderGeometry(r, r, h, 10), m, x, y, z);
function softBox(parent, name, w, h, d, radius, material, x = 0, y = 0, z = 0) {
  const shape = new THREE.Shape();
  const a = -w / 2, b = -h / 2, r = radius;
  shape.moveTo(a + r, b);
  shape.lineTo(a + w - r, b);
  shape.quadraticCurveTo(a + w, b, a + w, b + r);
  shape.lineTo(a + w, b + h - r);
  shape.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
  shape.lineTo(a + r, b + h);
  shape.quadraticCurveTo(a, b + h, a, b + h - r);
  shape.lineTo(a, b + r);
  shape.quadraticCurveTo(a, b, a + r, b);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * .55, bevelSegments: 2, curveSegments: 3 });
  geometry.translate(0, 0, -(d - 2 * r) / 2);
  return mesh(parent, name, geometry, material, x, y, z);
}
async function save(name, group) {
  const data = await exporter.parseAsync(group, { binary: true });
  await writeFile(new URL(name + '.glb', destination), Buffer.from(data));
  console.log(name + '.glb', data.byteLength);
}

const themes = {
  classic: { floor: '#614d3b', aisle: '#75634d', wall: '#e4d4b7', trim: '#6a4932', metal: '#b8925a', roof: '#e5d4b4', seat: '#a25c45', inset: '#764735', accent: '#d4ad72' },
  modern: { floor: '#52656b', aisle: '#6c7d80', wall: '#dce4df', trim: '#31515a', metal: '#a7b8b9', roof: '#e8eeea', seat: '#4e7c86', inset: '#315e69', accent: '#a2d3d3' },
  cafe: { floor: '#624b3c', aisle: '#846d53', wall: '#f0e2c8', trim: '#836047', metal: '#c8a66d', roof: '#f4e9d3', seat: '#65816c', inset: '#446550', accent: '#ecc58b' },
  panorama: { floor: '#344e53', aisle: '#536f6e', wall: '#d9e6de', trim: '#385b60', metal: '#9ebfbc', roof: '#bdd8d7', seat: '#c79572', inset: '#a26e53', accent: '#bde8e1' },
};

function car(type) {
  const palette = themes[type];
  const root = new THREE.Group();
  root.name = `${type} carriage`;
  const floor = mat(palette.floor), wall = mat(palette.wall), trim = mat(palette.trim, .5),
    metal = mat(palette.metal, .34, .55), roof = mat(palette.roof), accent = mat(palette.accent, .4);
  box(root, 'Full width floor', 5, .22, 15, floor, 0, .04);
  box(root, 'Open aisle runner', 1.65, .025, 14.7, mat(palette.aisle), 0, .165);
  for (const side of [-1, 1]) {
    const x = side * 2.51;
    box(root, 'Lower side wall', .13, 1.03, 15, wall, x, .72);
    box(root, 'Upper side wall', .15, type === 'panorama' ? .28 : .52, 15, wall, x, type === 'panorama' ? 3.18 : 3.05);
    box(root, 'Continuous window sill', .24, .1, 15, trim, x, 1.22);
    box(root, 'Window header', .24, .1, 15, trim, x, type === 'panorama' ? 3.03 : 2.75);
    box(root, 'Polished lower rail', .025, .04, 15, metal, x - side * .08, .99);
    for (let z = -6.05; z <= 6.06; z += 3) {
      box(root, 'Window pillar', .18, type === 'panorama' ? 1.9 : 1.6, .16, trim, x, type === 'panorama' ? 2.12 : 1.98, z);
      box(root, 'Pillar highlight', .025, type === 'panorama' ? 1.84 : 1.54, .2, metal, x - side * .095, type === 'panorama' ? 2.12 : 1.98, z);
    }
    if (type !== 'panorama') {
      box(root, 'Luggage shelf', .46, .065, 14.2, trim, x - side * .28, 2.87);
      for (let z = -6; z < 7; z += 1.5) box(root, 'Shelf bracket', .43, .04, .05, metal, x - side * .28, 2.76, z);
    }
  }
  const cross = [[-2.58, 3.24], [-2.28, 3.48], [-1.3, 3.61], [0, 3.65], [1.3, 3.61], [2.28, 3.48], [2.58, 3.24]];
  const vertices = [];
  for (let i = 0; i < cross.length - 1; i++) {
    const [a, b] = [cross[i], cross[i + 1]];
    for (const v of [[a[0], a[1], -7.5], [a[0], a[1], 7.5], [b[0], b[1], -7.5], [b[0], b[1], -7.5], [a[0], a[1], 7.5], [b[0], b[1], 7.5]]) vertices.push(...v);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  mesh(root, 'Faceted curved ceiling', geometry, new THREE.MeshStandardMaterial({ color: palette.roof, side: THREE.DoubleSide, roughness: .84 }));
  for (let z = -5.8; z <= 5.9; z += 2.9) {
    box(root, 'Ceiling lamp surround', .34, .035, .9, metal, 0, 3.57, z);
    box(root, 'Warm light diffuser', .22, .026, .76, accent, 0, 3.55, z);
  }
  for (const side of [-1, 1]) {
    const z = side * 7.36;
    const outsideEnd = (type === 'classic' && side > 0) || (type === 'panorama' && side < 0);
    if (outsideEnd) {
      box(root, 'Closed end wall', 5.02, 3.45, .23, wall, 0, 1.79, z);
      box(root, 'End wall roof cap', 5.02, .26, .23, wall, 0, 3.5, z);
      box(root, 'End wall decorative rail', 4.35, .055, .25, trim, 0, 2.5, z - side * .03);
      continue;
    }
    for (const x of [-1.71, 1.71]) box(root, 'Vestibule side panel', 1.58, 3.18, .19, wall, x, 1.71, z);
    box(root, 'Vestibule lintel', 1.85, .64, .2, trim, 0, 3.02, z);
    box(root, 'Door frame left', .12, 2.66, .24, metal, -.86, 1.67, z);
    box(root, 'Door frame right', .12, 2.66, .24, metal, .86, 1.67, z);
    box(root, 'Door threshold', 1.75, .06, .36, metal, 0, .17, z);
    const door = new THREE.Group();
    door.name = side < 0 ? 'Door front' : 'Door rear';
    door.position.z = z;
    root.add(door);
    box(door, 'Sliding door panel', 1.52, 2.52, .09, trim, 0, 1.56);
    box(door, 'Door window frame', .89, 1.04, .105, metal, 0, 2.05);
    box(door, 'Tinted door glass', .74, .89, .115, mat('#789da0', .17, .1), 0, 2.05);
    box(door, 'Door handle', .1, .31, .15, metal, side * .57, 1.12);
  }
  if (type === 'classic') {
    for (const side of [-1, 1]) for (let z = -5.9; z <= 6; z += 3) box(root, 'Walnut inset panel', .018, .49, 2.55, mat('#8d6244'), side * 2.43, .55, z);
  }
  if (type === 'cafe') {
    for (const side of [-1, 1]) for (const z of [-4.2, -.7, 2.8]) {
      const x = side * 1.6;
      box(root, 'Cafe table top', .96, .085, .86, mat('#a77751', .42), x, .99, z + 1.04);
      cyl(root, 'Cafe table pedestal', .07, .77, metal, x, .58, z + 1.04);
      cyl(root, 'Ceramic cup', .08, .15, mat('#f1e6d0', .22), x + .2, 1.11, z + .95);
    }
    box(root, 'Cafe serving counter', 1.1, .88, 1.25, trim, 1.72, .62, -6.12);
    box(root, 'Cafe counter top', 1.22, .09, 1.33, mat('#b88962'), 1.72, 1.1, -6.12);
  }
  if (type === 'panorama') {
    for (const side of [-1, 1]) box(root, 'Panorama skylight', 1.05, .025, 13.8, mat('#7fa7aa', .18, .08), side * 1.62, 3.47);
    for (const side of [-1, 1]) for (const z of [-5.2, -.5, 4.2]) {
      box(root, 'Panorama planter', .4, .36, .48, trim, side * 2.18, .39, z);
      for (const dx of [-.1, .1]) mesh(root, 'Planter foliage', new THREE.IcosahedronGeometry(.24, 1), mat('#64896e'), side * 2.18 + dx, .72, z);
    }
  }
  return root;
}

function seat(type) {
  const p = themes[type];
  const root = new THREE.Group();
  root.name = `${type} upholstered seat`;
  const fabric = mat(p.seat, .92), inset = mat(p.inset, .93), frame = mat(p.trim, .47), metal = mat(p.metal, .34, .5);
  for (const x of [-.38, .38]) for (const z of [-.37, .36]) cyl(root, 'Tapered leg', .055, .42, metal, x, .21, z);
  softBox(root, 'Seat frame', 1.17, .17, .96, .04, frame, 0, .49);
  softBox(root, 'Seat cushion', 1.08, .18, .88, .065, fabric, 0, .63, -.02);
  softBox(root, 'Upholstered backrest', 1.17, 1.25, .2, .07, fabric, 0, 1.28, .42);
  softBox(root, 'Backrest inset', .95, .87, .045, .015, inset, 0, 1.32, .3);
  softBox(root, 'Headrest', 1.08, .24, .23, .06, fabric, 0, 1.96, .4);
  for (const x of [-.62, .62]) {
    softBox(root, 'Armrest', .12, .09, .71, .025, frame, x, 1, -.02);
    cyl(root, 'Arm support', .035, .43, metal, x, .78, .23);
  }
  if (type === 'panorama') box(root, 'Soft throw pillow', .75, .38, .1, mat('#ecd5b1'), 0, 1.25, .18);
  return root;
}

for (const type of Object.keys(themes)) {
  await save(`carriage_${type}`, car(type));
  await save(`seat_${type}`, seat(type));
}
