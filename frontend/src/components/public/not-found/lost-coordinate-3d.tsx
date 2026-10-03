"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 🧭 404 专属：全息失重多面体与双轨星环 (Lost Coordinate 3D Monolith)
 *
 * 核心设计：
 * 1. 中心：极低面数二十面体 (Icosahedron) + 线框高光，失重悬浮缓缓自转；
 * 2. 外层：两条倾斜椭圆星环，带有微型发光公转卫星；
 * 3. 交互：监听鼠标微小移动产生物理视差 (Mouse Parallax)；
 * 4. 性能：三角面数 < 280 面，DPR 限制 1.5，卸载全面清理，核显 60fps 丝滑。
 */
export default function LostCoordinate3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 128;
    const height = container.clientHeight || 128;

    // 1. 场景与相机
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.z = 4.2;

    // 2. 渲染器
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // 3. 顶层交互组
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    // 4. 中心：翡翠多面体 (Icosahedron 20面晶体)
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Emerald 500
      wireframe: false,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    pivotGroup.add(coreMesh);

    // 5. 多面体高光科技线框
    const wireGeo = new THREE.WireframeGeometry(coreGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x34d399, // Emerald 400
      transparent: true,
      opacity: 0.85,
    });
    const wireLines = new THREE.LineSegments(wireGeo, wireMat);
    pivotGroup.add(wireLines);

    // 6. 星轨 1 (倾斜 35 度)
    const orbitCurve1 = new THREE.EllipseCurve(
      0, 0,
      1.45, 1.05,
      0, 2 * Math.PI,
      false,
      0
    );
    const orbitPoints1 = orbitCurve1.getPoints(50);
    const orbitGeo1 = new THREE.BufferGeometry().setFromPoints(
      orbitPoints1.map((p) => new THREE.Vector3(p.x, p.y, 0))
    );
    const orbitMat1 = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.35,
    });
    const orbitRing1 = new THREE.Line(orbitGeo1, orbitMat1);
    orbitRing1.rotation.x = Math.PI / 3;
    orbitRing1.rotation.y = Math.PI / 6;
    pivotGroup.add(orbitRing1);

    // 7. 星轨 2 (倾斜 -45 度，反向)
    const orbitCurve2 = new THREE.EllipseCurve(
      0, 0,
      1.6, 1.15,
      0, 2 * Math.PI,
      false,
      0
    );
    const orbitPoints2 = orbitCurve2.getPoints(50);
    const orbitGeo2 = new THREE.BufferGeometry().setFromPoints(
      orbitPoints2.map((p) => new THREE.Vector3(p.x, p.y, 0))
    );
    const orbitMat2 = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // Cyan 500
      transparent: true,
      opacity: 0.3,
    });
    const orbitRing2 = new THREE.Line(orbitGeo2, orbitMat2);
    orbitRing2.rotation.x = -Math.PI / 3.5;
    orbitRing2.rotation.y = -Math.PI / 4;
    pivotGroup.add(orbitRing2);

    // 8. 卫星小球体 (绕轨微粒)
    const satGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const satMat1 = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    const satMesh1 = new THREE.Mesh(satGeo, satMat1);
    pivotGroup.add(satMesh1);

    const satMat2 = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const satMesh2 = new THREE.Mesh(satGeo, satMat2);
    pivotGroup.add(satMesh2);

    // 9. 鼠标微视差交互
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      targetRotY = nx * 0.45;
      targetRotX = -ny * 0.35;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 10. 动画循环
    let animFrameId: number;
    let isVisible = true;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();

      // 核心晶体失重缓缓自转
      coreMesh.rotation.x += 0.008;
      coreMesh.rotation.y += 0.012;
      wireLines.rotation.x = coreMesh.rotation.x;
      wireLines.rotation.y = coreMesh.rotation.y;

      // 星环缓慢自旋
      orbitRing1.rotation.z += 0.004;
      orbitRing2.rotation.z -= 0.003;

      // 卫星 1 公转位置计算
      const a1 = elapsed * 1.5;
      const p1 = orbitCurve1.getPoint( (a1 % (2 * Math.PI)) / (2 * Math.PI) );
      const v1 = new THREE.Vector3(p1.x, p1.y, 0).applyEuler(orbitRing1.rotation);
      satMesh1.position.copy(v1);

      // 卫星 2 公转位置计算
      const a2 = -elapsed * 1.2;
      const p2 = orbitCurve2.getPoint( ((a2 % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI) );
      const v2 = new THREE.Vector3(p2.x, p2.y, 0).applyEuler(orbitRing2.rotation);
      satMesh2.position.copy(v2);

      // 鼠标平滑阻尼插值
      pivotGroup.rotation.x += (targetRotX - pivotGroup.rotation.x) * 0.05;
      pivotGroup.rotation.y += (targetRotY - pivotGroup.rotation.y) * 0.05;

      // 轻微上下悬浮
      pivotGroup.position.y = Math.sin(elapsed * 1.8) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // 11. 离屏休眠
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // 12. 清理
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animFrameId);
      observer.disconnect();

      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      orbitGeo1.dispose();
      orbitMat1.dispose();
      orbitGeo2.dispose();
      orbitMat2.dispose();
      satGeo.dispose();
      satMat1.dispose();
      satMat2.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center pointer-events-none select-none"
    />
  );
}
