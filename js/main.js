

import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

let moveSpeed = 1/6;
const rotateSpeed = 0.02;

const color_code = [
        [1.0, 0.8, 0.5], // BGS
        [1.0, 0.5, 0.5], // LRG
        [0.5, 1.0, 0.5], // ELG
        [0.8, 0.5, 1.0], // QSO
      ]

const isComputer = !window.mobileCheck();

let scene, camera, controls, renderer;
let galaxyPoints;
let infoElement, loadingElement;
let velocity, rotationVector, keyState, showColors, showPanel;

// Initialize the three.js scene
function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);

  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  
  infoElement = document.getElementById('info');
  loadingElement = document.getElementById('loading');

  window.addEventListener("resize", onWindowResize, false);

  showColors = false;
  showPanel = true;

  loadGalaxyData();

  velocity = new THREE.Vector3();
  rotationVector = new THREE.Vector3();

  keyState = {};

  if(!isComputer) infoElement.addEventListener('click', toggleColor);

  window.addEventListener('keydown', (event) => {
      keyState[event.code] = true;

      if (event.code === 'KeyC') toggleColor();
      if (event.code === 'KeyP') togglePanel();

      if(/^[0-9]$/i.test(event.key)) {
        setSpeed(parseInt(event.key));
      }
  });

  window.addEventListener('keyup', (event) => {
      keyState[event.code] = false;
  });
}

function setSpeed(speed) {
  if(speed === 0) speed = 10;
  moveSpeed = speed**2/6;
}

function showLoading() {
    loadingElement.style.display = 'block';
    infoElement.style.display = 'none';
}

function hideLoading() {
    loadingElement.style.display = 'none';
    infoElement.style.display = 'block';
}

function togglePanel() {
  showPanel = !showPanel;
  infoElement.style.display = showPanel ? 'block' : 'none';
}

function toggleColor() {
  showColors = !showColors;
  // Toggle between using and not using vertex colors
  galaxyPoints.material.vertexColors = showColors;
  galaxyPoints.material.needsUpdate = true; // Ensure the change is applied
}

function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create a circular texture for galaxies
function createCircleTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    // Create a radial gradient (white center fading to transparent)
    const gradient = context.createRadialGradient(
      size/2, size/2, 0,  // inner circle: center and radius 0
      size/2, size/2, size/2 // outer circle: center and full radius
    );

    // Circle with stroke
    // gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    // gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    // gradient.addColorStop(0.5, 'rgba(0, 0, 0, 1)');
    // gradient.addColorStop(0.55, 'rgba(0, 0, 0, 1)');
    // gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0)');

    // Glowy galaxies
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

async function loadGalaxyData() {
  try {
    showLoading();
    const response = await fetch("galaxies.json.gz");
    if (!response.ok) {
      throw new Error("Network response was not OK");
    }

    const compressedData = await response.arrayBuffer();
    const decompressedData = pako.ungzip(new Uint8Array(compressedData), { to: 'string' });
    const galaxies = JSON.parse(decompressedData);;

    const numGalaxies = galaxies.length;
    // Float32Array is efficient for many points
    const positions = new Float32Array(numGalaxies * 3);
    const colors = new Float32Array(numGalaxies * 3);

    for (let i = 0; i < numGalaxies; i++) {
      positions[i * 3]     = galaxies[i][0];
      positions[i * 3 + 1] = galaxies[i][1];
      positions[i * 3 + 2] = galaxies[i][2];

      colors[i * 3]     = color_code[galaxies[i][3]][0];
      colors[i * 3 + 1] = color_code[galaxies[i][3]][1];
      colors[i * 3 + 2] = color_code[galaxies[i][3]][2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Simple material: galaxies are squares
    // const material = new THREE.PointsMaterial({
    //   size: 1,
    //   // color: 0xffffff,
    //   alphaTest: 0., // Ensures pixels with less alpha are discarded.
    //   vertexColors: true  // Enable vertex colors
    // });

    // Circles with gradiets
    const circleTexture = createCircleTexture();

    const material = new THREE.PointsMaterial({
        size: 2,
        map: circleTexture,
        transparent: true,
        alphaTest: 0., // Ensures pixels with less alpha are discarded.
        blending: THREE.AdditiveBlending,  // For a glowing or additive effect.
        depthTest: false, // Prevents points from occluding each other.
        vertexColors: showColors  // Enable vertex colors
  });

    galaxyPoints = new THREE.Points(geometry, material);
    galaxyPoints.rotation.x = 3;
    galaxyPoints.rotation.y = 3;
    galaxyPoints.rotation.z = 0;

    galaxyPoints.position.x = -2200,
    galaxyPoints.position.y = -300,
    galaxyPoints.position.z = 300;

    scene.add(galaxyPoints);
    hideLoading();

  } catch (error) {
    console.error("Error loading galaxy data:", error);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Rotate the entire system slowly for a 3D effect
  if (galaxyPoints) {
    galaxyPoints.rotation.x += 0.0002;
  }
  // controls.update();
  handleKeyboard();
  moveCamera();

  const speedInfo = isComputer ? `Speed [0–9]: ${(moveSpeed*60).toFixed(0)} Mpc/h/s<br>` : '';

  infoElement.innerHTML = `
      ${speedInfo}
      Coordinates: (${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)}) Mpc/h<br>
      Orientation: (${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)}) rad<br>
      Colors ${isComputer ? '[C]' : '[tap]'}: ${showColors ? 'enabled' : 'disabled'}<br>
      ${isComputer? 'Hide panel [P]<br>' : ''}
  `;

  renderer.render(scene, camera);
}

function handleKeyboard() {
    // Movement
    if (keyState['KeyW']) velocity.z = moveSpeed;
    if (keyState['KeyS']) velocity.z = -moveSpeed;
    if (keyState['KeyA']) velocity.x = moveSpeed;
    if (keyState['KeyD']) velocity.x = -moveSpeed;
    
    // Rotation
    if (keyState['ArrowUp']) rotationVector.x = rotateSpeed;
    if (keyState['ArrowDown']) rotationVector.x = -rotateSpeed;
    if (keyState['ArrowLeft']) rotationVector.y = rotateSpeed;
    if (keyState['ArrowRight']) rotationVector.y = -rotateSpeed;
}

function moveCamera() {
    camera.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(velocity.z));
    camera.position.x += velocity.x;
    camera.rotation.x += rotationVector.x;
    camera.rotation.y += rotationVector.y;

    // Reset velocity and rotation for next frame
    velocity.set(0, 0, 0);
    rotationVector.set(0, 0, 0);
}

init();
animate();