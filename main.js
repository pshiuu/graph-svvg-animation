// Custom Cursor
document.addEventListener('DOMContentLoaded', () => {
    const customCursor = document.createElement('div');
    customCursor.classList.add('custom-cursor');
    document.body.appendChild(customCursor);
    document.body.style.cursor = 'none';

    document.addEventListener('mousemove', (e) => {
        customCursor.style.top = `${e.clientY - 40}px`;
        customCursor.style.left = `${e.clientX - 40}px`;
    });
});

// gradient.js

const Gradient = (function () {
    let scene, camera, renderer, uniforms;
    let targetNoiseOffset = new THREE.Vector2(0, 0);
    const containerRef = document.getElementById('gradient-container');
    const gradientCanvas = document.getElementById('gradient');

    const colorsArray = [
        [
            new THREE.Color(0xFFFDD0), // Cream
            new THREE.Color(0xADD8E6), // Light blue
            new THREE.Color(0xADD8E6), // Light blue
            new THREE.Color(0xADD8E6), // Light blue
        ],
        // Add more color arrays if needed for more variety
    ];
    const originalColorsIndex = 0;
    let currentColorsIndex = originalColorsIndex;

    function init() {
        const container = containerRef;
        if (!container) return;

        scene = new THREE.Scene();
        camera = new THREE.Camera();
        camera.position.z = 1;

        renderer = new THREE.WebGLRenderer({ canvas: gradientCanvas, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0); // Transparent background

        // Random seed for each visit
        const randomSeed = Math.random();

        uniforms = {
            u_time: { type: "f", value: 1.0 },
            u_resolution: {
                type: "v2",
                value: new THREE.Vector2(window.innerWidth, window.innerHeight),
            },
            u_mouse: { type: "v2", value: new THREE.Vector2(0.5, 0.5) }, // Center initially
            u_colors: { type: "v3v", value: colorsArray[currentColorsIndex] },
            u_noiseOffset: { type: "v2", value: new THREE.Vector2(0.0, 0.0) }, // Use THREE.Vector2
            u_seed: { type: "f", value: randomSeed }, // Add a seed for randomness
        };

        const vertexShader = `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;
            uniform vec3 u_colors[4];
            uniform vec2 u_noiseOffset;
            uniform float u_seed;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123 + u_seed);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(random(i + vec2(0.0, 0.0)), random(i + vec2(1.0, 0.0)), u.x),
                    mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }

            void main() {
                vec2 st = gl_FragCoord.xy / u_resolution.xy;
                vec3 color = vec3(0.0);

                vec2 mouseInfluence = u_mouse * 0.5 - 1.0;
                vec2 pos = st * 3.0 + u_noiseOffset;

                // Add time-based noise offset
                pos += vec2(sin(u_time * 0.1), cos(u_time * 0.15)) * 0.2;

                float n = noise(pos + mouseInfluence * 0.5 * sin(u_time * 0.5));

                color = mix(u_colors[0], u_colors[1], n);
                color = mix(color, u_colors[2], n * 0.5);
                color = mix(color, u_colors[3], n * 0.25);

                color += vec3(random(st) * 0.1);

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        onWindowResize();
        window.addEventListener("resize", onWindowResize, false);
        window.addEventListener("mousemove", onMouseMove, false);
    }

    function onWindowResize() {
        if (uniforms.u_resolution) {
            uniforms.u_resolution.value.x = window.innerWidth;
            uniforms.u_resolution.value.y = window.innerHeight;
        }
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function onMouseMove(event) {
        if (uniforms.u_mouse) {
            // Normalize mouse position to range [0, 1]
            uniforms.u_mouse.value.x = event.clientX / window.innerWidth;
            uniforms.u_mouse.value.y = 1.0 - event.clientY / window.innerHeight; // Invert Y axis
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        uniforms.u_time.value += 0.01;

        // Update target noise offset based on time using a combination of sine and cosine functions
        const timeScale = uniforms.u_time.value * 0.05;
        const xOffset = Math.sin(timeScale * 1.3) * Math.cos(timeScale * 0.8) * 2.0;
        const yOffset = Math.cos(timeScale * 1.3) * Math.sin(timeScale * 0.9) * 2.0;
        targetNoiseOffset.set(xOffset, yOffset);

        uniforms.u_noiseOffset.value.lerp(targetNoiseOffset, 0.05);

        renderer.render(scene, camera);
    }

    function changeColor() {
        currentColorsIndex = (currentColorsIndex + 1) % colorsArray.length;
        uniforms.u_colors.value = colorsArray[currentColorsIndex];
    }

    function cleanup() {
        window.removeEventListener("resize", onWindowResize);
        window.removeEventListener("mousemove", onMouseMove);
    }

    return {
        init: init,
        animate: animate,
        changeColor: changeColor,
        cleanup: cleanup,
    };
})();

// Initialize and start the animation
Gradient.init();
Gradient.animate();



!(function (f, l) {
  "object" == typeof exports && "undefined" != typeof module
    ? (module.exports = l(require("three"), require("gsap/TweenMax")))
    : "function" == typeof define && define.amd
    ? define(["three", "gsap/TweenMax"], l)
    : (f.hoverEffect = l(f.THREE, f.TweenMax));
})(this, function (f, l) {
  return (
    (l = l && l.hasOwnProperty("default") ? l.default : l),
    function (h) {
      function F() {
        for (var f = arguments, l = 0; l < arguments.length; l++)
          if (void 0 !== f[l]) return f[l];
      }
      var w = h.parent,
        L = h.displacementImage,
        M = h.image1,
        P = h.image2,
        U = F(h.intensity1, h.intensity, 1),
        V = F(h.intensity2, h.intensity, 1),
        C = F(h.angle, Math.PI / 4),
        D = F(h.angle1, C),
        S = F(h.angle2, 3 * -C),
        W = F(h.speedIn, h.speed, 1.6),
        _ = F(h.speedOut, h.speed, 1.2),
        z = F(h.hover, !0),
        q = F(h.easing, Expo.easeOut),
        G = F(h.video, !1);
      if (w)
        if (M && P && L) {
          var A = new f.Scene(),
            B = new f.OrthographicCamera(
              w.offsetWidth / -2,
              w.offsetWidth / 2,
              w.offsetHeight / 2,
              w.offsetHeight / -2,
              1,
              1e3
            );
          B.position.z = 1;
          var k = new f.WebGLRenderer({ antialias: !1, alpha: !0 });
          k.setPixelRatio(window.devicePixelRatio),
            k.setClearColor(16777215, 0),
            k.setSize(w.offsetWidth, w.offsetHeight),
            w.appendChild(k.domElement);
          var J = function () {
              k.render(A, B);
            },
            K = new f.TextureLoader();
          K.crossOrigin = "";
          var N = K.load(L, J);
          if (((N.wrapS = N.wrapT = f.RepeatWrapping), G)) {
            var Q = function () {
              requestAnimationFrame(Q), k.render(A, B);
            };
            Q(),
              ((G = document.createElement("video")).autoplay = !0),
              (G.loop = !0),
              (G.src = M),
              G.load();
            var X = document.createElement("video");
            (X.autoplay = !0), (X.loop = !0), (X.src = P), X.load();
            var Y = new f.VideoTexture(G),
              Z = new f.VideoTexture(X);
            (Y.magFilter = Z.magFilter = f.LinearFilter),
              (Y.minFilter = Z.minFilter = f.LinearFilter),
              X.addEventListener(
                "loadeddata",
                function () {
                  X.play(),
                    ((Z = new f.VideoTexture(X)).magFilter = f.LinearFilter),
                    (Z.minFilter = f.LinearFilter),
                    ($.uniforms.texture2.value = Z);
                },
                !1
              ),
              G.addEventListener(
                "loadeddata",
                function () {
                  G.play(),
                    ((Y = new f.VideoTexture(G)).magFilter = f.LinearFilter),
                    (Y.minFilter = f.LinearFilter),
                    ($.uniforms.texture1.value = Y);
                },
                !1
              );
          } else {
            var image1Aspect, image2Aspect;
            (Y = K.load(M, function(texture) {
              J();
              image1Aspect = texture.image.width / texture.image.height;
              if ($ && $.uniforms) {
                $.uniforms.imageAspect1.value = image1Aspect;
                $.uniforms.texture1.value = texture;
                J();
              }
            })),
            (Z = K.load(P, function(texture) {
              J();
              image2Aspect = texture.image.width / texture.image.height;
              if ($ && $.uniforms) {
                $.uniforms.imageAspect2.value = image2Aspect;
                $.uniforms.texture2.value = texture;
                J();
              }
            })),
            (Y.magFilter = Z.magFilter = f.LinearFilter),
            (Y.minFilter = Z.minFilter = f.LinearFilter);
          }
          var $ = new f.ShaderMaterial({
              uniforms: {
                intensity1: { type: "f", value: U },
                intensity2: { type: "f", value: V },
                dispFactor: { type: "f", value: 0 },
                angle1: { type: "f", value: D },
                angle2: { type: "f", value: S },
                texture1: { type: "t", value: Y },
                texture2: { type: "t", value: Z },
                disp: { type: "t", value: N },
                containerAspect: { type: "f", value: w.offsetWidth / w.offsetHeight },
                imageAspect1: { type: "f", value: 1 },
                imageAspect2: { type: "f", value: 1 }
              },
              vertexShader:
                "\nvarying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}\n",
              fragmentShader:
                "\nvarying vec2 vUv;\n\nuniform float dispFactor;\nuniform sampler2D disp;\n\nuniform sampler2D texture1;\nuniform sampler2D texture2;\nuniform float angle1;\nuniform float angle2;\nuniform float intensity1;\nuniform float intensity2;\nuniform float containerAspect;\nuniform float imageAspect1;\nuniform float imageAspect2;\n\nmat2 getRotM(float angle) {\n  float s = sin(angle);\n  float c = cos(angle);\n  return mat2(c, -s, s, c);\n}\n\nvec2 coverUV(vec2 uv, float containerAspect, float imageAspect) {\n  float r = imageAspect / containerAspect;\n  if (r > 1.0) {\n    uv.y = (uv.y - 0.5) * r + 0.5;\n  } else {\n    uv.x = (uv.x - 0.5) / r + 0.5;\n  }\n  return uv;\n}\n\nvoid main() {\n  vec4 disp = texture2D(disp, vUv);\n  vec2 dispVec = vec2(disp.r, disp.g);\n  vec2 uv1 = coverUV(vUv, containerAspect, imageAspect1);\n  vec2 uv2 = coverUV(vUv, containerAspect, imageAspect2);\n  vec2 distortedPosition1 = uv1 + getRotM(angle1) * dispVec * intensity1 * dispFactor;\n  vec2 distortedPosition2 = uv2 + getRotM(angle2) * dispVec * intensity2 * (1.0 - dispFactor);\n  vec4 _texture1 = texture2D(texture1, distortedPosition1);\n  vec4 _texture2 = texture2D(texture2, distortedPosition2);\n  gl_FragColor = mix(_texture1, _texture2, dispFactor);\n}\n",
              transparent: !0,
              opacity: 1,
            }),
            y = new f.PlaneBufferGeometry(w.offsetWidth, w.offsetHeight, 1),
            b = new f.Mesh(y, $);
          A.add(b),
            z &&
              (w.addEventListener("mouseenter", j),
              w.addEventListener("touchstart", j),
              w.addEventListener("mouseleave", O),
              w.addEventListener("touchend", O)),
            window.addEventListener("resize", function (f) {
              k.setSize(w.offsetWidth, w.offsetHeight);
              if ($ && $.uniforms) $.uniforms.containerAspect.value = w.offsetWidth / w.offsetHeight;
            }),
            (this.next = j),
            (this.previous = O);
        } else console.warn("One or more images are missing");
      else console.warn("Parent missing");

      var currentTween = null;

      function j() {
        if (currentTween) {
          currentTween.kill();
        }
        currentTween = l.to($.uniforms.dispFactor, W, {
          value: 1,
          ease: q,
          onUpdate: J,
          onComplete: function() {
            currentTween = null;
            J();
          },
        });
      }

      function O() {
        if (currentTween) {
          currentTween.kill();
        }
        currentTween = l.to($.uniforms.dispFactor, _, {
          value: 0,
          ease: q,
          onUpdate: J,
          onComplete: function() {
            currentTween = null;
            J();
          },
        });
      }
    }
  );
});



new hoverEffect({
  parent: document.querySelector('.distortion'),
  intensity: 0.2,
  image1: 'https://uploads-ssl.webflow.com/6638848fab8938514ff16754/666c4fc11e620d7b79a81760_El_3.jpg', 
  image2: 'https://uploads-ssl.webflow.com/6638848fab8938514ff16754/666c53cf51835c3d26bfed89_El_1.jpg',
  speedIn: 2,
  speedOut: 5,
  angle1 : Math.PI / 6,
  angle2 : -Math.PI / 6 * 3,
  displacementImage: 'https://i.postimg.cc/QNTRDRks/4.png',
});




// Header Menu
function initHeader() {
    $(document).ready(function() {
        $('.header-burger-wrap').on('click', function() {
            var $menu = $('.full-size-menu');
            var isExpanded = $(this).attr('aria-expanded') === 'true';
            
            if (isExpanded) {
                $menu.slideUp(400, function() {
                    $menu.css('display', 'none').attr('aria-hidden', 'true');
                });
                $(this).attr('aria-expanded', 'false');
            } else {
                $menu.css('display', 'flex').hide().slideDown(400, function() {
                    $menu.attr('aria-hidden', 'false');
                });
                $(this).attr('aria-expanded', 'true');
            }
        });

        $('.page_link').on('click', function() {
            var $menu = $('.full-size-menu');
            $menu.slideUp(400, function() {
                $menu.css('display', 'none').attr('aria-hidden', 'true');
            });
            $('.header-burger-wrap').attr('aria-expanded', 'false');
        });

        $('.header-burger-wrap').on('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                $(this).click();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initHeader();
});

// Page Loader
$(document).ready(function() {
    const minLoaderTime = 2000;
    const startTime = new Date().getTime();
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (lastVisit && (now - lastVisit < oneDay)) {
        $('.page-loader').hide();
        $('.content').show();
    } else {
        $(window).on('load', function() {
            const currentTime = new Date().getTime();
            const elapsedTime = currentTime - startTime;
            const remainingTime = minLoaderTime - elapsedTime;

            setTimeout(function() {
                $('.page-loader').fadeOut(500, function() {
                    $('.content').fadeIn(500);
                });
            }, remainingTime > 0 ? remainingTime : 0);
        });

        localStorage.setItem('lastVisit', now);
    }
});

// Pixelation Functions
function captureAndRender(callback) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const webGLCanvas = document.querySelector("#gradient");
    let targetCanvas = document.getElementById("pixelCanvas");

    if (!webGLCanvas) {
        if (callback) callback();
        return;
    }

    if (!targetCanvas) {
        targetCanvas = document.createElement('canvas');
        targetCanvas.id = 'pixelCanvas';
        document.body.appendChild(targetCanvas);
    }

    targetCanvas.width = viewportWidth;
    targetCanvas.height = viewportHeight;
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(webGLCanvas, 0, 0, webGLCanvas.width, webGLCanvas.height, 0, 0, viewportWidth, viewportHeight);
    ctx.originalImageData = ctx.getImageData(0, 0, viewportWidth, viewportHeight);

    targetCanvas.style.display = 'block';
    targetCanvas.style.position = 'fixed';
    targetCanvas.style.top = 0;
    targetCanvas.style.left = 0;
    targetCanvas.style.width = '100%';
    targetCanvas.style.height = '100%';
    targetCanvas.style.zIndex = 1000;
    targetCanvas.style.transition = 'opacity 0.8s ease-in-out';

    if (callback) callback();
}

function fadeInAndPixelate(ctx, sampleSize, duration) {
    return new Promise(resolve => {
        const canvas = ctx.canvas;
        canvas.style.opacity = 0;
        setTimeout(() => { canvas.style.opacity = 1; }, 10);

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const imgData = ctx.getImageData(0, 0, width, height, { willReadFrequently: true }).data;

        const steps = 10;
        const interval = duration / steps;
        let currentStep = 1;

        function step() {
            const currentSampleSize = sampleSize * currentStep;
            ctx.clearRect(0, 0, width, height);

            for (let y = 0; y < height; y += currentSampleSize) {
                for (let x = 0; x < width; x += currentSampleSize) {
                    const pos = (x + y * width) * 4;
                    const red = imgData[pos];
                    const green = imgData[pos + 1];
                    const blue = imgData[pos + 2];
                    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                    ctx.fillRect(x, y, currentSampleSize, currentSampleSize);
                }
            }

            if (currentStep < steps) {
                currentStep++;
                setTimeout(step, interval);
            } else {
                resolve();
            }
        }

        step();
    });
}

function fadeOutAndDePixelate(ctx, sampleSize, duration) {
    return new Promise(resolve => {
        const canvas = ctx.canvas;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const imgData = ctx.originalImageData.data;

        const steps = 10;
        const interval = duration / steps;
        let currentStep = steps;

        function step() {
            const currentSampleSize = sampleSize * currentStep;
            ctx.clearRect(0, 0, width, height);

            for (let y = 0; y < height; y += currentSampleSize) {
                for (let x = 0; x < width; x += currentSampleSize) {
                    const pos = (x + y * width) * 4;
                    const red = imgData[pos];
                    const green = imgData[pos + 1];
                    const blue = imgData[pos + 2];
                    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                    ctx.fillRect(x, y, currentSampleSize, currentSampleSize);
                }
            }

            if (currentStep > 1) {
                currentStep--;
                setTimeout(step, interval);
            } else {
                resolve(canvas);
            }
        }

        step();
    }).then((canvas) => {
        return new Promise(resolve => {
            canvas.style.transition = 'opacity 0.8s ease-in-out';
            canvas.style.opacity = 0;

            const width = ctx.canvas.width;
            const height = ctx.canvas.height;
            const imgData = ctx.originalImageData.data;

            const steps = 10;
            const interval = duration / steps;
            let currentStep = 1;

            function step() {
                const currentSampleSize = sampleSize * currentStep;
                ctx.clearRect(0, 0, width, height);

                for (let y = 0; y < height; y += currentSampleSize) {
                    for (let x = 0; x < width; x += currentSampleSize) {
                        const pos = (x + y * width) * 4;
                        const red = imgData[pos];
                        const green = imgData[pos + 1];
                        const blue = imgData[pos + 2];
                        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                        ctx.fillRect(x, y, currentSampleSize, currentSampleSize);
                    }
                }

                if (currentStep < steps) {
                    currentStep++;
                    setTimeout(step, interval);
                } else {
                    setTimeout(() => {
                        canvas.style.display = 'none';
                        resolve();
                    }, 50);
                }
            }

            step();
        });
    });
}

// Barba Transitions
barba.init({
    transitions: [{
        name: 'pixel-transition',
        leave(data) {
            return new Promise(resolve => {
                captureAndRender(() => {
                    const canvas = document.getElementById('pixelCanvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        fadeInAndPixelate(ctx, 10, 800).then(() => {
                            data.current.container.style.display = 'none';
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        },
        enter(data) {
            return new Promise(resolve => {
                const canvas = document.getElementById('pixelCanvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    fadeOutAndDePixelate(ctx, 10, 800).then(() => {
                        data.next.container.style.display = 'block';
                        resolve();
                    }).catch((error) => {
                        data.next.container.style.display = 'block';
                        resolve();
                    });
                } else {
                    data.next.container.style.display = 'block';
                    resolve();
                }
            });
        }
    }]
});

// Three.js Scene Setup
const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();
const gltfLoader = new THREE.GLTFLoader();

let laptopModel;
gltfLoader.load("https://uploads-ssl.webflow.com/6638848fab8938514ff16754/665c88e817e366c49efb940d_laptop_v2.glb.txt", (gltf) => {
    laptopModel = gltf.scene;
    const bakedMesh = laptopModel.children.find((child) => child.name === "baked");
    if (bakedMesh) {
        bakedMesh.material.encoding = THREE.sRGBEncoding;
    }
    laptopModel.rotation.y = Math.PI / 15;
    scene.add(laptopModel);
}, undefined, (error) => {
    console.error("An error occurred while loading the GLTF model:", error);
});

const sizes = { width: window.innerWidth, height: window.innerHeight };

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 0, 3);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x000000, 0);

const loader = new THREE.TextureLoader();
loader.load('path/to/space_background.jpg', function (texture) {
    scene.background = texture;
});

const clock = new THREE.Clock();

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    if (laptopModel) {
        laptopModel.rotation.y += 0.01;
        laptopModel.rotation.x = Math.sin(elapsedTime * 0.5) * 0.1;
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

tick();
