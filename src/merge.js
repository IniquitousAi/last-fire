// Merge several indexed BufferGeometries with the same attributes into one (a small copy of the idea in three's BufferGeometryUtils).
import * as THREE from 'three';

export function mergeGeometries(list) {
  const names = Object.keys(list[0].attributes), out = new THREE.BufferGeometry(), index = []; let offset = 0;
  for (const name of names) {
    const size = list[0].attributes[name].itemSize, total = list.reduce((s, g) => s + g.attributes[name].count, 0), arr = new Float32Array(total * size); let at = 0;
    for (const g of list) { arr.set(g.attributes[name].array, at); at += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  for (const g of list) { const idx = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()]; for (const i of idx) index.push(i + offset); offset += g.attributes.position.count; }
  out.setIndex(index); out.computeBoundingSphere(); return out;
}
