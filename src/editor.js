import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

const canvas = document.querySelector('canvas');
const status = document.querySelector('#status');
const inputs = ['x', 'y', 'z'].map(axis => document.getElementById(axis));
const tabs = [...document.querySelectorAll('[data-shot]')];
const storageKey = 'shot-placement-editor:v1';
const initial = { A: [0, 0.7, 0], B: [0, 0.8, 0] };

function readPosition(id) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey + id));
    if (Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)) return value;
  } catch { /* Storage may be disabled. */ }
  return initial[id];
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e5efe9');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5, 4, 6);
  camera.lookAt(0, 0.8, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x849699, 2.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(4, 7, 5);
  scene.add(sun, new THREE.GridHelper(18, 36, 0x809890, 0xc5d7ce));
  const shots = {
    A: new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshStandardMaterial({ color: '#dd7951' })),
    B: new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 32), new THREE.MeshStandardMaterial({ color: '#3b847c' }))
  };
  for (const [id, mesh] of Object.entries(shots)) {
    mesh.position.fromArray(readPosition(id));
    scene.add(mesh);
  }

  let active = 'A';
  const gizmo = new TransformControls(camera, canvas);
  gizmo.setMode('translate');
  gizmo.setSpace('local');
  gizmo.setSize(1.2);
  scene.add(gizmo.getHelper());

  function draw() { renderer.render(scene, camera); }
  function showPosition() {
    const position = shots[active].position.toArray();
    inputs.forEach((input, i) => { input.value = String(+position[i].toFixed(3)); });
  }
  function save() {
    try {
      localStorage.setItem(storageKey + active, JSON.stringify(shots[active].position.toArray()));
      status.textContent = '이 브라우저에 저장됨';
    } catch { status.textContent = '현재 탭에만 적용됨'; }
  }
  function select(id) {
    active = id;
    for (const [key, mesh] of Object.entries(shots)) mesh.visible = key === id;
    gizmo.attach(shots[id]);
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.shot === id)));
    document.querySelector('#shape').textContent = id === 'A' ? '정육면체' : '구';
    status.textContent = '';
    showPosition();
    draw();
  }
  gizmo.addEventListener('change', draw);
  gizmo.addEventListener('objectChange', showPosition);
  gizmo.addEventListener('mouseUp', save);
  for (const tab of tabs) tab.onclick = () => select(tab.dataset.shot);
  inputs.forEach((input, index) => {
    input.onchange = () => {
      if (!Number.isFinite(input.valueAsNumber)) return showPosition();
      shots[active].position.setComponent(index, input.valueAsNumber);
      showPosition(); draw(); save();
    };
  });
  document.querySelector('#reset').onclick = () => {
    shots[active].position.fromArray(initial[active]);
    showPosition(); draw(); save();
  };
  new ResizeObserver(() => {
    const {clientWidth: width, clientHeight: height} = canvas;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    draw();
  }).observe(canvas);
  select('A');
}
try { start(); } catch (error) {
  status.textContent = '3D 화면을 열 수 없습니다. WebGL을 지원하는 브라우저에서 열어 주세요.';
  console.error(error);
}
