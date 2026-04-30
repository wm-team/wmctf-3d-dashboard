import "./styles.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#scene");
const loading = document.querySelector("#loading");

const params = {
  strength: 1,
  speed: 1.15,
  gust: 0.45,
  paused: false,
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080a0d, 0.05);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 80);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.72;
setDefaultCameraPose();

scene.add(new THREE.HemisphereLight(0xbfd7ff, 0x17100a, 1.9));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
keyLight.position.set(3, 4.5, 3.2);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x6fc7ff, 1.6);
rimLight.position.set(-2.4, 1.8, -2.8);
scene.add(rimLight);

const pivot = new THREE.Group();
scene.add(pivot);

const clock = new THREE.Clock();
const windShaderUniforms = [];
let windLines;
let modelCenter = new THREE.Vector3();
let modelScale = 1;

const gltfLoader = new GLTFLoader();

gltfLoader.load(
  "/models/combined-flag.glb",
  (gltf) => {
    const model = gltf.scene;
    const flagBounds = prepareCombinedModel(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    box.getCenter(modelCenter);

    modelScale = 3.2 / size.y;
    model.position.copy(modelCenter).multiplyScalar(-1);
    pivot.scale.setScalar(modelScale);
    pivot.add(model);

    windLines = createWindLines(flagBounds, modelCenter);
    pivot.add(windLines);
    loading.classList.add("is-hidden");
  },
  undefined,
  (error) => {
    console.error(error);
    loading.textContent = "Model load failed";
  },
);

function prepareCombinedModel(model) {
  let flagBounds;

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return;

    child.frustumCulled = false;
    child.geometry.computeBoundingBox();
    child.geometry.computeVertexNormals();

    if (isReplacementFlag(child)) {
      flagBounds = prepareFlagGeometry(child.geometry);
      configureFlagMaterial(child.material);
      return;
    }

    configurePoleMaterial(child.material, child.geometry);
  });

  if (!flagBounds) {
    throw new Error("ReplacementFlag mesh was not found in combined-flag.glb");
  }

  return flagBounds;
}

function isReplacementFlag(mesh) {
  return (
    mesh.name === "ReplacementFlag" ||
    mesh.name === "ReplacementFlagMesh" ||
    mesh.material?.name === "FlagTexture"
  );
}

function prepareFlagGeometry(geometry) {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const box = geometry.boundingBox;
  const windWeight = new Float32Array(position.count);
  const windU = new Float32Array(position.count);
  const windV = new Float32Array(position.count);
  const width = box.max.x - box.min.x || 1;
  const height = box.max.y - box.min.y || 1;

  for (let i = 0; i < position.count; i += 1) {
    const u = uv ? uv.getX(i) : THREE.MathUtils.clamp((position.getX(i) - box.min.x) / width, 0, 1);
    const v = uv ? uv.getY(i) : THREE.MathUtils.clamp((position.getY(i) - box.min.y) / height, 0, 1);
    const pin = THREE.MathUtils.smoothstep(u, 0.02, 0.2);
    const edgeLift = THREE.MathUtils.smoothstep(u, 0.68, 1);

    windU[i] = u;
    windV[i] = v;
    windWeight[i] = pin * (0.58 + edgeLift * 0.18);
  }

  geometry.setAttribute("windWeight", new THREE.BufferAttribute(windWeight, 1));
  geometry.setAttribute("windU", new THREE.BufferAttribute(windU, 1));
  geometry.setAttribute("windV", new THREE.BufferAttribute(windV, 1));

  return {
    x0: box.min.x,
    x1: box.max.x,
    y0: box.min.y,
    y1: box.max.y,
    z0: box.min.z,
    z1: box.max.z,
  };
}

function configureFlagMaterial(material) {
  for (const item of toMaterialList(material)) {
    item.side = THREE.DoubleSide;
    item.roughness = 0.48;
    item.metalness = 0.03;
    item.clearcoat = 0.2;
    item.clearcoatRoughness = 0.5;
    item.sheen = 0.7;
    item.sheenRoughness = 0.65;

    if (item.map) {
      item.map.colorSpace = THREE.SRGBColorSpace;
      item.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    attachReplacementFlagShader(item);
    item.needsUpdate = true;
  }
}

function configurePoleMaterial(material, geometry) {
  for (const item of toMaterialList(material)) {
    item.vertexColors = Boolean(geometry.attributes.color);
    item.roughness = 0.36;
    item.metalness = 0.18;
    item.clearcoat = 0.35;
    item.clearcoatRoughness = 0.42;
    item.side = THREE.DoubleSide;
    item.needsUpdate = true;
  }
}

function toMaterialList(material) {
  return Array.isArray(material) ? material : [material];
}

function attachReplacementFlagShader(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uStrength = { value: params.strength };
    shader.uniforms.uSpeed = { value: params.speed };
    shader.uniforms.uGust = { value: params.gust };

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
attribute float windWeight;
attribute float windU;
attribute float windV;
uniform float uTime;
uniform float uStrength;
uniform float uSpeed;
uniform float uGust;
varying float vWindFold;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
float gustPulse = 0.86 + sin(uTime * 0.62) * 0.14;
float travel = windU * 7.2 - uTime * (1.15 * uSpeed + uGust * 0.28);
float verticalSag = sin(windV * 3.14159265);
float waveA = sin(travel);
float waveB = sin(travel * 1.65 + windV * 2.6 + uTime * 0.18);
float waveC = sin(travel * 0.52 - windV * 1.4);
float flagWind = windWeight * uStrength * (0.54 + uGust * 0.16) * gustPulse;
float verticalEdge = smoothstep(0.0, 0.12, windV) * (1.0 - smoothstep(0.88, 1.0, windV));
float curl = smoothstep(0.68, 1.0, windU);
vWindFold = (waveA * 0.58 + waveB * 0.24 + waveC * 0.18) * windWeight;
transformed.z += vWindFold * 0.019 * flagWind;
transformed.y += verticalSag * (waveB * 0.004 - 0.0022 * windU) * flagWind * verticalEdge;
transformed.x += curl * (waveC * 0.005 - 0.0055) * flagWind;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying float vWindFold;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
diffuseColor.rgb *= 0.72 + smoothstep(-0.78, 0.92, vWindFold) * 0.45;`,
    );

    windShaderUniforms.push(shader.uniforms);
  };

  material.customProgramCacheKey = () => "combined-model-flag-wind-v2";
}

function createWindLines(flagBounds, center) {
  const segmentCount = 24;
  const positions = new Float32Array(segmentCount * 2 * 3);
  const seeds = [];
  const groupGeometry = new THREE.BufferGeometry();

  for (let i = 0; i < segmentCount; i += 1) {
    seeds.push({
      phase: Math.random(),
      lane: Math.random(),
      depth: Math.random(),
      length: THREE.MathUtils.lerp(0.045, 0.12, Math.random()),
    });
  }

  groupGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x9edcff,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(groupGeometry, material);
  lines.userData.update = (time) => {
    for (let i = 0; i < segmentCount; i += 1) {
      const item = seeds[i];
      const progress = (item.phase + time * 0.11 * params.speed) % 1;
      const x = THREE.MathUtils.lerp(flagBounds.x0, flagBounds.x1, progress);
      const y = THREE.MathUtils.lerp(flagBounds.y0, flagBounds.y1, item.lane);
      const z =
        THREE.MathUtils.lerp(flagBounds.z1 + 0.016, flagBounds.z1 + 0.078, item.depth) +
        Math.sin(time * 2.4 + progress * 8 + item.lane * 6) * 0.01 * params.strength;
      const wave = Math.sin(progress * 10 - time * params.speed * 2.2 + item.lane * 4) * 0.012;
      const j = i * 6;

      positions[j] = x - center.x;
      positions[j + 1] = y - center.y + wave;
      positions[j + 2] = z - center.z;
      positions[j + 3] = x - item.length - center.x;
      positions[j + 4] = y - center.y - wave * 0.4;
      positions[j + 5] = z - center.z;
    }
    groupGeometry.attributes.position.needsUpdate = true;
    material.opacity = 0.04 + params.gust * 0.05 + params.strength * 0.025;
  };

  return lines;
}

function bindRange(id, key) {
  const input = document.querySelector(`#${id}`);
  const output = document.querySelector(`#${id}Value`);
  const sync = () => {
    params[key] = Number(input.value);
    output.value = params[key].toFixed(2);
  };
  input.addEventListener("input", sync);
  sync();
}

bindRange("strength", "strength");
bindRange("speed", "speed");
bindRange("gust", "gust");

document.querySelector("#toggle").addEventListener("click", (event) => {
  params.paused = !params.paused;
  event.currentTarget.textContent = params.paused ? "▶" : "⏸";
  event.currentTarget.setAttribute("aria-pressed", String(params.paused));
});

document.querySelector("#reset").addEventListener("click", () => {
  setDefaultCameraPose();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  setDefaultCameraPose();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function setDefaultCameraPose() {
  const isNarrow = window.innerWidth < 720;

  camera.fov = isNarrow ? 54 : 42;
  if (isNarrow) {
    camera.position.set(0.72, 0.35, 5.85);
    controls.target.set(0.14, 0.12, 0);
    controls.minDistance = 3.2;
    controls.maxDistance = 9;
  } else {
    camera.position.set(0.82, 0.5, 3.55);
    controls.target.set(0.08, 0.16, 0);
    controls.minDistance = 1.35;
    controls.maxDistance = 7;
  }

  camera.updateProjectionMatrix();
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  const time = params.paused ? (windShaderUniforms[0]?.uTime.value ?? elapsed) : elapsed;

  for (const uniforms of windShaderUniforms) {
    uniforms.uTime.value = time;
    uniforms.uStrength.value = params.strength;
    uniforms.uSpeed.value = params.speed;
    uniforms.uGust.value = params.gust;
  }

  if (!params.paused && windLines) {
    windLines.userData.update(time);
  }

  pivot.rotation.y = Math.sin(time * 0.12) * 0.06;
  controls.update();
  renderer.render(scene, camera);
}

animate();
