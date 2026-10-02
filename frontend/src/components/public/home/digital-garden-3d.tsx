"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 👑 数字花园极轻量高性能 3D 场景 (Low-overhead Digital Garden 3D)
 *
 * 核心优化：
 * 1. 纯数学程序化几何体（总三角面数 < 260），0 外部大模型网络开销；
 * 2. 限制渲染像素比 (DPR <= 1.5)，极大降低核显与移动端显卡负荷；
 * 3. 接入 IntersectionObserver：当滚动离开视口时自动暂停渲染（GPU 占用降至 0%）；
 * 4. 卸载时彻底 dispose 几何体、材质与渲染器，杜绝显存泄漏；
 * 5. 鼠标平滑跟随视差 (Lerp 缓动)，带来生动流畅的三维沉浸感。
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
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    // 关键性能优化：限制 DPR，避免 Retina 高分屏过载
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // 2. 场景灯光系统（温和省电的 3 点光源）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x10b981, 2.5, 20); // 翡翠绿核心光
    pointLight1.position.set(4, 5, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x14b8a6, 2.0, 20); // 青绿柔光
    pointLight2.position.set(-4, -4, 3);
    scene.add(pointLight2);

    // 3. 构建 3D 核心：数字花园二十面体晶石 (Icosahedron Crystal)
    const coreGeometry = new THREE.IcosahedronGeometry(1.6, 0); // 仅 20 个面！极速光栅化
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x059669,
      emissive: 0x064e3b,
      emissiveIntensity: 0.35,
      shininess: 90,
      transparent: true,
      opacity: 0.65,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 晶石发光线框 (Wireframe Accent)
    const edgesGeometry = new THREE.EdgesGeometry(coreGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x6ee7b7,
      transparent: true,
      opacity: 0.85,
    });
    const wireframeMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    coreMesh.add(wireframeMesh);

    // 4. 构建周围浮动的磨砂有机玻璃立方体 (Floating Glass Cubes)
    const cubeGeometry = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const cubeMaterial = new THREE.MeshPhongMaterial({
      color: 0x34d399,
      emissive: 0x047857,
      emissiveIntensity: 0.2,
      shininess: 100,
      transparent: true,
      opacity: 0.5,
    });

    const floatingCubes: {
      mesh: THREE.Mesh;
      basePos: THREE.Vector3;
      speed: number;
      offset: number;
    }[] = [];

    const positions = [
      new THREE.Vector3(-2.4, 1.4, 0.2),
      new THREE.Vector3(2.5, -1.2, 0.5),
      new THREE.Vector3(-1.8, -1.8, -0.4),
      new THREE.Vector3(2.0, 1.8, -0.6),
    ];

    positions.forEach((pos, i) => {
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.copy(pos);
      // 边缘细线
      const cubeEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(cubeGeometry),
        new THREE.LineBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.7 })
      );
      cube.add(cubeEdges);
      scene.add(cube);

      floatingCubes.push({
        mesh: cube,
        basePos: pos.clone(),
        speed: 1.2 + i * 0.3,
        offset: i * 1.5,
      });
    });

    // 5. 萤火微粒系统 (Firefly Particles) - 仅 45 个极轻量粒子
    const particleCount = 45;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 7.5;
      particlePositions[i + 1] = (Math.random() - 0.5) * 6.5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 5.0;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. 交互式鼠标追踪 (平滑 Lerp 视差)
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

    // 7. 视口可见性监听 (IntersectionObserver)：离开视口自动休眠
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // 8. 窗口尺寸自适应
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

    // 9. 渲染循环
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // 如果滚出屏幕，完全跳过计算，GPU 0% 开销！
      if (!isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      // 缓动鼠标移动 (Lerp)
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // 核心晶体自转与交互跟随
      coreMesh.rotation.x = elapsedTime * 0.25 + currentMouseY * 0.4;
      coreMesh.rotation.y = elapsedTime * 0.35 + currentMouseX * 0.5;

      // 浮动立方体缓动微浮
      floatingCubes.forEach(({ mesh, basePos, speed, offset }) => {
        mesh.position.y = basePos.y + Math.sin(elapsedTime * speed + offset) * 0.22;
        mesh.rotation.x = elapsedTime * 0.4 + offset;
        mesh.rotation.z = elapsedTime * 0.3;
      });

      // 粒子缓慢公转
      particles.rotation.y = elapsedTime * 0.08;

      // 相机微角度视差
      camera.position.x = currentMouseX * 0.6;
      camera.position.y = currentMouseY * 0.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 10. 卸载时的全量资源释放（杜绝任何内存泄露）
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);

      coreGeometry.dispose();
      coreMaterial.dispose();
      edgesGeometry.dispose();
      edgesMaterial.dispose();
      cubeGeometry.dispose();
      cubeMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[340px] md:min-h-[400px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
