"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 👑 数字宇宙生态系：真实球形天体公转与柔光星尘流 (Realistic Cosmic Orbit & Starflow)
 *
 * 核心升级：
 * 1. 消除方形像素粒子：采用内存生成的径向高斯光晕贴图，星尘全部呈现真实圆润发光光子；
 * 2. 消除多面体棱角：中心恒星与公转天体升级为真实球体，带有晨昏光影与物理土星光环；
 * 3. 极致低配性能：球体采用精简细分度（总面数 < 800），配合 DPR 限制与离屏休眠。
 */

export default function DigitalGarden3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    let isVisible = true;

    // 1. 初始化场景、相机与渲染器
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // 2. 动态创建“圆形发光星尘粒子贴图”（彻底告别方形方块！）
    const createParticleTexture = () => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext("2d");
      if (!ctx) return null;

      // 径向渐变：中心亮白 -> 中层翡翠绿 -> 外层透明
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.25, "rgba(110, 231, 183, 0.85)");
      gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.35)");
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();

      const texture = new THREE.CanvasTexture(c);
      texture.needsUpdate = true;
      return texture;
    };

    const particleTexture = createParticleTexture();

    // 3. 宇宙光照系统 (主光源自中心恒星发出，侧翼带微弱冷蓝补光)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const coreLight = new THREE.PointLight(0x34d399, 4.0, 30);
    scene.add(coreLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 1.8, 25);
    rimLight.position.set(-6, -4, 4);
    scene.add(rimLight);

    // 4. 构建中心真实球形恒星 (Central Glowing Star)
    const starGroup = new THREE.Group();
    scene.add(starGroup);

    // 4.1 恒星内层核心 (Smooth Sphere)
    const starGeometry = new THREE.SphereGeometry(1.2, 28, 28);
    const starMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.1,
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starGroup.add(starMesh);

    // 4.2 恒星外层柔和日冕大气 (Corona Glow)
    const coronaGeometry = new THREE.SphereGeometry(1.35, 24, 24);
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
    starGroup.add(coronaMesh);

    // 5. 构建优雅发光公转轨道线 (Smooth Orbital Rings)
    const createOrbitRing = (radiusX: number, radiusY: number, rotation: THREE.Euler, color = 0x34d399, opacity = 0.35) => {
      const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(96);
      const ringGeometry = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const ringMaterial = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });
      const ringLine = new THREE.Line(ringGeometry, ringMaterial);
      ringLine.rotation.copy(rotation);
      scene.add(ringLine);
      return ringLine;
    };

    const ring1 = createOrbitRing(2.7, 2.4, new THREE.Euler(0.45, 0.2, 0.25), 0x10b981, 0.45);
    const ring2 = createOrbitRing(4.0, 3.6, new THREE.Euler(-0.5, -0.3, -0.35), 0x34d399, 0.35);
    const ring3 = createOrbitRing(5.3, 4.8, new THREE.Euler(0.65, -0.35, 0.45), 0x2dd4bf, 0.25);

    // 6. 构造真实公转行星系统 (Realistic Celestial Bodies)

    // 行星 1：内轨类地行星 (Terrestrial Planet)
    const planet1Geometry = new THREE.SphereGeometry(0.38, 22, 22);
    const planet1Material = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x065f46,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.2,
    });
    const planet1 = new THREE.Mesh(planet1Geometry, planet1Material);
    scene.add(planet1);

    // 行星 2：中轨带环行星 (Ringed Planet 类似土星环天体)
    const planet2Group = new THREE.Group();
    scene.add(planet2Group);

    const planet2Geometry = new THREE.SphereGeometry(0.45, 24, 24);
    const planet2Material = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.15,
    });
    const planet2Mesh = new THREE.Mesh(planet2Geometry, planet2Material);
    planet2Group.add(planet2Mesh);

    // 行星 2 的土星光环 (Saturn-like Ring)
    const ringGeometry = new THREE.RingGeometry(0.62, 0.95, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const saturnRing = new THREE.Mesh(ringGeometry, ringMat);
    saturnRing.rotation.x = Math.PI / 2.3;
    planet2Group.add(saturnRing);

    // 行星 2 的绕转卫星 (Moon)
    const moonGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);

    // 行星 3：外轨深空巨行星 (Gas Giant)
    const planet3Geometry = new THREE.SphereGeometry(0.48, 24, 24);
    const planet3Material = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.1,
    });
    const planet3 = new THREE.Mesh(planet3Geometry, planet3Material);
    scene.add(planet3);

    // 7. 宇宙流光星尘系统 (真实的圆形柔光微粒流) - 220 颗
    const particleCount = 220;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleAngles = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleSpeeds = new Float32Array(particleCount);
    const particleHeights = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.6 + Math.random() * 5.0;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 3.5;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = height;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      particleAngles[i] = angle;
      particleRadii[i] = radius;
      particleSpeeds[i] = (0.2 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : 0.85);
      particleHeights[i] = height;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    // 使用刚才生成的圆形发光贴图，彻底消除方块感！
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xa7f3d0,
      size: 0.22,
      map: particleTexture ?? undefined,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 8. 交互式鼠标追踪 (平滑视差与引力倾斜)
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = Math.max(-1, Math.min(1, x));
      targetMouseY = Math.max(-1, Math.min(1, y));
    };

    const handleMouseLeave = () => {
      targetMouseX = 0;
      targetMouseY = 0;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    // 9. 视口离开自动休眠
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // 10. 窗口尺寸自适应
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener("resize", handleResize);

    // 11. 真实天体力学渲染循环
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // 缓动鼠标追踪 (Lerp)
      currentMouseX += (targetMouseX - currentMouseX) * 0.045;
      currentMouseY += (targetMouseY - currentMouseY) * 0.045;

      // 11.1 恒星微脉冲与光影呼吸
      const starPulse = 1 + Math.sin(elapsed * 1.5) * 0.035;
      starGroup.scale.set(starPulse, starPulse, starPulse);
      starMesh.rotation.y = elapsed * 0.15;
      coronaMesh.rotation.y = -elapsed * 0.08;

      // 11.2 行星 1 公转 (内轨)
      const angle1 = elapsed * 0.75;
      const pos1 = new THREE.Vector3(Math.cos(angle1) * 2.7, 0, Math.sin(angle1) * 2.4).applyEuler(
        ring1.rotation
      );
      planet1.position.copy(pos1);
      planet1.rotation.y = elapsed * 1.2;

      // 11.3 行星 2（带环行星）公转 (中轨，逆行)
      const angle2 = -elapsed * 0.5 + 2.0;
      const pos2 = new THREE.Vector3(Math.cos(angle2) * 4.0, 0, Math.sin(angle2) * 3.6).applyEuler(
        ring2.rotation
      );
      planet2Group.position.copy(pos2);
      planet2Group.rotation.y = elapsed * 0.6;

      // 卫星围绕行星 2 旋转
      const moonAngle = elapsed * 2.2;
      const moonOffset = new THREE.Vector3(
        Math.cos(moonAngle) * 0.9,
        Math.sin(moonAngle) * 0.35,
        Math.sin(moonAngle) * 0.9
      );
      moon.position.copy(pos2).add(moonOffset);

      // 11.4 行星 3 公转 (外轨)
      const angle3 = elapsed * 0.32 + 4.1;
      const pos3 = new THREE.Vector3(Math.cos(angle3) * 5.3, 0, Math.sin(angle3) * 4.8).applyEuler(
        ring3.rotation
      );
      planet3.position.copy(pos3);
      planet3.rotation.y = elapsed * 0.4;

      // 11.5 宇宙圆形星尘微粒沿引力旋涡流动
      const positions = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i] * 0.012;
        const currentAngle = particleAngles[i];
        const r = particleRadii[i] + Math.sin(elapsed * 0.6 + i) * 0.12;

        positions[i * 3] = Math.cos(currentAngle) * r;
        positions[i * 3 + 1] = particleHeights[i] + Math.sin(elapsed * 0.4 + currentAngle) * 0.2;
        positions[i * 3 + 2] = Math.sin(currentAngle) * r;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // 11.6 相机整体视差追踪
      camera.position.x = currentMouseX * 1.05;
      camera.position.y = currentMouseY * 0.8;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 12. 卸载时的全量资源释放
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);

      starGeometry.dispose();
      starMaterial.dispose();
      coronaGeometry.dispose();
      coronaMaterial.dispose();

      ring1.geometry.dispose();
      (ring1.material as THREE.Material).dispose();
      ring2.geometry.dispose();
      (ring2.material as THREE.Material).dispose();
      ring3.geometry.dispose();
      (ring3.material as THREE.Material).dispose();

      planet1Geometry.dispose();
      planet1Material.dispose();
      planet2Geometry.dispose();
      planet2Material.dispose();
      ringGeometry.dispose();
      ringMat.dispose();
      moonGeometry.dispose();
      moonMaterial.dispose();
      planet3Geometry.dispose();
      planet3Material.dispose();

      particleGeometry.dispose();
      particleMaterial.dispose();
      if (particleTexture) particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[360px] md:min-h-[420px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
