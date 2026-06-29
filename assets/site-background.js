(function () {
  const threeSources = [
    'assets/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'
  ];

  function loadThree(callback) {
    if (window.THREE) {
      callback();
      return;
    }

    let index = 0;

    function trySource() {
      if (index >= threeSources.length) {
        document.documentElement.classList.add('no-webgl-background');
        return;
      }

      const script = document.createElement('script');
      script.src = threeSources[index];
      script.async = true;
      script.onload = callback;
      script.onerror = function () {
        index += 1;
        trySource();
      };
      document.head.appendChild(script);
    }

    trySource();
  }

  function randomPoint(range) {
    return (Math.random() - .5) * range;
  }

  function initScene() {
    if (!window.THREE || document.getElementById('neural-bg')) {
      return;
    }

    const THREE = window.THREE;
    const reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.createElement('canvas');
    canvas.id = 'neural-bg';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
    } catch (error) {
      canvas.remove();
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
    camera.position.set(0, 0, 8.6);

    const root = new THREE.Group();
    scene.add(root);

    function makeParticles(count, range, color, size, opacity) {
      const positions = new Float32Array(count * 3);

      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = randomPoint(range);
        positions[i * 3 + 1] = randomPoint(range * .72);
        positions[i * 3 + 2] = randomPoint(range * .54);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        depthWrite: false
      });

      const points = new THREE.Points(geometry, material);
      root.add(points);
      return { points, material, positions, count };
    }

    const primary = makeParticles(62, 9.4, 0x0f766e, .045, .46);
    const secondary = makeParticles(38, 8.2, 0x2563eb, .035, .34);

    const lineData = [];
    const maxLines = 126;
    for (let i = 0; i < primary.count && lineData.length < maxLines * 6; i += 1) {
      for (let j = i + 1; j < primary.count && lineData.length < maxLines * 6; j += 1) {
        const ax = primary.positions[i * 3];
        const ay = primary.positions[i * 3 + 1];
        const az = primary.positions[i * 3 + 2];
        const bx = primary.positions[j * 3];
        const by = primary.positions[j * 3 + 1];
        const bz = primary.positions[j * 3 + 2];
        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 2.45 && Math.random() > .42) {
          lineData.push(ax, ay, az, bx, by, bz);
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineData, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0f766e,
      transparent: true,
      opacity: .16,
      depthWrite: false
    });
    const network = new THREE.LineSegments(lineGeometry, lineMaterial);
    root.add(network);

    const knotMaterial = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      wireframe: true,
      transparent: true,
      opacity: .13,
      depthWrite: false
    });
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.22, .055, 150, 14),
      knotMaterial
    );
    root.add(knot);

    const polyMaterial = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      wireframe: true,
      transparent: true,
      opacity: .08,
      depthWrite: false
    });
    const poly = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 2), polyMaterial);
    root.add(poly);

    const pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', function (event) {
      pointer.x = (event.clientX / window.innerWidth - .5) * 2;
      pointer.y = (event.clientY / window.innerHeight - .5) * 2;
    }, { passive: true });

    function applyTheme() {
      const isDark = document.documentElement.classList.contains('dark');
      primary.material.color.setHex(isDark ? 0x5eead4 : 0x0f766e);
      secondary.material.color.setHex(isDark ? 0xa78bfa : 0x2563eb);
      lineMaterial.color.setHex(isDark ? 0x38bdf8 : 0x1d4ed8);
      knotMaterial.color.setHex(isDark ? 0xc4b5fd : 0x2563eb);
      polyMaterial.color.setHex(isDark ? 0xfacc15 : 0xd97706);
      primary.material.opacity = isDark ? .52 : .42;
      secondary.material.opacity = isDark ? .42 : .31;
      lineMaterial.opacity = isDark ? .18 : .13;
      knotMaterial.opacity = isDark ? .15 : .11;
      polyMaterial.opacity = isDark ? .1 : .075;
    }

    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    applyTheme();

    function resize() {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const isSmall = width < 720;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      knot.position.set(isSmall ? 1.55 : 3.55, isSmall ? -1.55 : -.35, -1.7);
      knot.scale.setScalar(isSmall ? .74 : 1);
      poly.position.set(isSmall ? -1.65 : -3.6, isSmall ? 2.25 : 1.75, -2.4);
      poly.scale.setScalar(isSmall ? .72 : 1);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    const clock = new THREE.Clock();
    let frameId = null;

    function render() {
      const elapsed = clock.getElapsedTime();
      const driftX = pointer.y * .045;
      const driftY = pointer.x * .06;

      root.rotation.x = driftX + Math.sin(elapsed * .16) * .025;
      root.rotation.y = driftY + elapsed * .026;
      primary.points.rotation.z = elapsed * .018;
      secondary.points.rotation.z = -elapsed * .014;
      knot.rotation.x = elapsed * .17;
      knot.rotation.y = elapsed * .22;
      poly.rotation.x = -elapsed * .08;
      poly.rotation.y = elapsed * .12;

      renderer.render(scene, camera);

      if (!reducedMotion && !document.hidden) {
        frameId = window.requestAnimationFrame(render);
      } else {
        frameId = null;
      }
    }

    if (reducedMotion) {
      render();
    } else {
      frameId = window.requestAnimationFrame(render);
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !reducedMotion && !frameId) {
        frameId = window.requestAnimationFrame(render);
      }
    });
  }

  function start() {
    if (!document.body) {
      window.addEventListener('DOMContentLoaded', function () {
        loadThree(initScene);
      }, { once: true });
      return;
    }

    loadThree(initScene);
  }

  start();
}());
