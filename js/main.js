

import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { FlyControls } from 'FlyControls';

const h = 0.7;

const color_code = [
        [1.0, 0.8, 0.5], // BGS
        [1.0, 0.5, 0.5], // LRG
        [0.5, 1.0, 0.5], // ELG
        [0.8, 0.5, 1.0], // QSO
      ]

const isComputer = !window.mobileCheck();

let scene, camera, controls, renderer;
let flyControls, orbitControls;
let galaxyPoints;
let infoElement, loadingElement;
let showColors, showPanel;

// Initialize the three.js scene
function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);

  camera.position.z = 500;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);

  controls = orbitControls;

  flyControls = new FlyControls(camera, renderer.domElement);
  flyControls.rollSpeed = Math.PI / 6;
  flyControls.autoForward = false;

  setSpeed(1);
  
  infoElement = document.getElementById('info');
  loadingElement = document.getElementById('loading');

  window.addEventListener("resize", onWindowResize, false);

  showColors = false;
  showPanel = true;

  loadGalaxyData();

  if(!isComputer) infoElement.addEventListener('click', toggleColor);

  window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyC') toggleColor();
      if (event.code === 'KeyP') togglePanel();
      if (event.code === 'KeyM') toggleControls();

      if(/^[0-9]$/i.test(event.key)) {
        setSpeed(parseInt(event.key));
      }
  });
}

function toggleControls() {
  if (controls === orbitControls) {
    controls = flyControls;
    orbitControls.enabled = false;
  } else {
    controls = orbitControls;
    orbitControls.enabled = true;
    // flyControls.reset();
  }
}

function setSpeed(speed) {
  if(speed === 0) speed = 10;
  flyControls.movementSpeed = speed**2 * 100/6*h;
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
  controls.update(0.01);
  // orbitControls.update();
  // moveCamera();

  const speedInfo = isComputer && !orbitControls.enabled ? `Speed [0–9]: ${(flyControls.movementSpeed*60/100/h).toFixed(0)} Mpc/s<br>` : '';
  const flyMode = isComputer ? `Fly mode [M]: ${!orbitControls.enabled ? 'enabled' : 'disabled'}<br>` : ''

  infoElement.innerHTML = `
      ${speedInfo}
      ${flyMode}
      Coordinates: (${(camera.position.x/h).toFixed(0)}, ${(camera.position.y/h).toFixed(0)}, ${(camera.position.z/h).toFixed(0)}) Mpc<br>
      Orientation: (${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)})<br>
      Colors ${isComputer ? '[C]' : '[tap here]'}: ${showColors ? 'enabled' : 'disabled'}<br>
      ${isComputer? 'Hide panel [P]<br>' : ''}
  `;

  renderer.render(scene, camera);
}

init();
animate();