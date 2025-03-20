

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
let hudElement, infoElement, loadingElement;
let showColors, showPanel, keysDown;
let speedGauge, xyMap, skyChart, hudInfo;
let tabulatedRedshift;
let interacted = 0;

// Initialize the three.js scene
function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);

  // camera.position.x = -2200,
  // camera.position.y = -300,
  // camera.position.z = 800;

  // camera.position.x = -6794*h,
  // camera.position.y = -697*h,
  // camera.position.z = -420*h;

  camera.position.x = -2686*h,
  camera.position.y = -1129*h,
  camera.position.z = -4277*h;

  // camera.rotation.x = -0.76,
  // camera.rotation.y = 1.14,
  // camera.rotation.z = 2.06;
  

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);

  controls = orbitControls;

  flyControls = new FlyControls(camera, renderer.domElement);
  flyControls.autoForward = false;

  setSpeed(1);
  
  hudElement = document.getElementById('hud');
  infoElement = document.getElementById('info-panel');
  loadingElement = document.getElementById('loading');

  speedGauge = new GaugeComponent('speed-gauge');
  xyMap = new MapComponent('xy-map');
  skyChart = new ChartComponent('chart');
  hudInfo = new HUDInfoComponent('hud-info')

  window.addEventListener("resize", onWindowResize, false);

  showColors = false;
  showPanel = true;

  loadTabularRedshift();
  loadGalaxyData();

  if(!isComputer) infoElement.addEventListener('click', toggleColor);

  keysDown = {};

  window.addEventListener('keydown', (event) => {
    keysDown[event.code] = true;
    handleKeyboard();
    interacted += 1;

    if(/^[0-9]$/i.test(event.key)) {
      setSpeed(parseInt(event.key));
    }
  });

  window.addEventListener('keyup', (event) => {
    keysDown[event.code] = false;
    interacted -= 1;
    handleKeyboard();
  });

  updateHUD();
}

function handleKeyboard() {
  if (keysDown['KeyC']) toggleColor();
  if (keysDown['KeyP']) togglePanel();
  if (keysDown['KeyM']) toggleControls();
}

function updateSpeedometer() {
  const speed = flyControls.forwardSpeed*6/10000;
  speedGauge.setFracWhite(speed);  
  speedGauge.setFracColored(keysDown['KeyW'] || keysDown['KeyS'] ? speed : 0);
  speedGauge.setNumber((flyControls.forwardSpeed*60/100).toFixed(0));
    
}

function toggleControls() {
  if (controls === orbitControls) {
    controls = flyControls;
    orbitControls.enabled = false;
    speedGauge.show();
    xyMap.show();
    skyChart.show();
    hudInfo.show();

  } else {
    controls = orbitControls;
    orbitControls.enabled = true;
    speedGauge.hide();
    xyMap.hide();
    skyChart.hide();
    hudInfo.hide();
  }
}

function setSpeed(speed) {
  if(speed === 0) speed = 10;
  flyControls.movementSpeed = speed**2 / 3 * 100/6;
  flyControls.forwardSpeed = speed**2 * 100/6;
}

function showLoading() {
    loadingElement.style.display = 'block';
    hudElement.style.display = 'none';
}

function hideLoading() {
    loadingElement.style.display = 'none';
    hudElement.style.display = 'block';
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

async function loadTabularRedshift() {
  try {
    showLoading();
    const response = await fetch("data/comoving_distances.json");
    if (!response.ok) {
      throw new Error("Network response was not OK");
    }
    tabulatedRedshift = await response.json();
  } catch (error) {
    console.error("Error loading redshift data:", error);
  }
}

async function loadGalaxyData() {
  try {
    showLoading();
    const response = await fetch("data/galaxies.json.gz");
    if (!response.ok) {
      throw new Error("Network response was not OK");
    }

    const compressedData = await response.arrayBuffer();
    const decompressedData = pako.ungzip(new Uint8Array(compressedData), { to: 'string' });
    const galaxies = JSON.parse(decompressedData);
    // const galaxies = await response.json();

    const numGalaxies = galaxies.length;
    // Float32Array is efficient for many points
    const positions = new Float32Array(numGalaxies * 3);
    const colors = new Float32Array(numGalaxies * 3);

    for (let i = 0; i < numGalaxies; i++) {
      positions[i * 3]     = galaxies[i][0]*h;
      positions[i * 3 + 1] = galaxies[i][1]*h;
      positions[i * 3 + 2] = galaxies[i][2]*h;

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
    // galaxyPoints.rotation.x = 3;
    // galaxyPoints.rotation.y = 3;
    // galaxyPoints.rotation.z = 0;

    // galaxyPoints.position.x = -2200,
    // galaxyPoints.position.y = -300,
    // galaxyPoints.position.z = 300;

    scene.add(galaxyPoints);
    hideLoading();

  } catch (error) {
    console.error("Error loading galaxy data:", error);
  }
}

function updateMaps() {
  const x = camera.position.x;
  const y = camera.position.y;
  const z = camera.position.z;

  xyMap.setXY(x, y, z);

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Project direction onto the XY plane
  direction.z = 0;
  direction.normalize();
  xyMap.setDirection(THREE.MathUtils.radToDeg(Math.atan2(-direction.y, direction.x))+90);

  const r = Math.sqrt(x*x + y*y + z*z);
  const dec = Math.asin(z/r);
  const ra = Math.atan2(y,x/Math.cos(Math.PI/6));

  skyChart.setCoords((THREE.MathUtils.radToDeg(ra) + 270) % 360, THREE.MathUtils.radToDeg(dec));
}

function animate() {
  requestAnimationFrame(animate);

  // Rotate the entire system slowly for a 3D effect
  // if (galaxyPoints) {
  //   galaxyPoints.rotation.x += 0.0002;
  // }

  if(controls){
    controls.update(0.01);
  }

  if(interacted) {
    updateHUD();
  }
  renderer.render(scene, camera);
}

function updateHUD() {
  updateSpeedometer();
  updateMaps();

  let redshift;

  const x = camera.position.x;
  const y = camera.position.y;
  const z = camera.position.z;

  const distance = Math.sqrt(x*x+y*y+z*z)/h;

  if(tabulatedRedshift) {

    redshift = interpolate(tabulatedRedshift, distance);
    redshift = redshift == -1 ? '> 6' : redshift.toFixed(2);
  } else {
    redshift = '';
  }

  hudInfo.setData(redshift, (distance).toFixed(0));

  const flyMode = isComputer ? `Fly mode [M]: ${!orbitControls.enabled ? 'enabled' : 'disabled'}<br>` : ''
  infoElement.innerHTML = `
  ${isComputer && !orbitControls.enabled ? 'Move [WASDRF]<br>' : ''}
  ${isComputer && !orbitControls.enabled ? 'Rotate [▲ ▼ ◀ ▼ QE]<br>' : ''}
  ${isComputer && !orbitControls.enabled ? 'Change speed [0–9]<br>' : ''}
  ${flyMode}
  Colors ${isComputer ? '[C]' : '[tap here]'}: ${showColors ? 'enabled' : 'disabled'}<br>
  ${isComputer ? 'Hide this panel [P]<br>' : ''}
  ${!isComputer ? 'Fly mode: computer-only<br>' : ''}
  
`;
}

init();
animate();
