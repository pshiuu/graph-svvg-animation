const Gradient = (function () {
    let scene, camera, renderer, uniforms;
    let targetNoiseOffset = new THREE.Vector2(0, 0);
    const containerRef = document.getElementById('gradient-container');
    const gradientCanvas = document.getElementById('gradient');

    const colorsArray = [
        [
            new THREE.Color(0x0a0a0a), // Very dark gray
            new THREE.Color(0x050505), // Darker gray
            new THREE.Color(0x0f0f0f), // Very dark gray, almost black
            new THREE.Color(0x000000), // Black
        ],
        // Add more color arrays if needed for more variety
    ];
    const originalColorsIndex = 0;
    let currentColorsIndex = originalColorsIndex;

    let stars = [];

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
            u_scroll: { value: 0.0 }, // Add a uniform for scroll position
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
            uniform float u_scroll;

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
                vec2 pos = st * 3.0 + u_noiseOffset + vec2(u_scroll * 0.5, 0.0);

                // Add time-based noise offset
                pos += vec2(sin(u_time * 0.1), cos(u_time * 0.15)) * 0.2;

                // Adjust noise influence to reduce noise
                float n = noise(pos + mouseInfluence * 0.5 * sin(u_time * 0.5)) * 0.5; // Reduce noise amplitude by multiplying by 0.5

                color = mix(u_colors[0], u_colors[1], n);
                color = mix(color, u_colors[2], n * 0.5);
                color = mix(color, u_colors[3], n * 0.25);

                // Reduce the influence of the random function
                color += vec3(random(st) * 0.05); // Reduce random influence by multiplying by 0.05

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        });

        const gradientMesh = new THREE.Mesh(geometry, material);
        scene.add(gradientMesh);

        const starCount = 150; // Adjust the number of stars as needed
        const maxStarSize = 0.006; // Maximum size for the stars

        for (let i = 0; i < starCount; i++) {
            const starSize = Math.random() * maxStarSize;
            const starGeometry = new THREE.SphereGeometry(starSize, 8, 8); // Random size for each star
            const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }); // White color, adjust as needed
            const star = new THREE.Mesh(starGeometry, starMaterial);

            // Randomly position the stars within a certain range
            const randomX = Math.random() * 2 - 1; // Random value between -1 and 1
            const randomY = Math.random() * 2 - 1;
            const randomZ = Math.random() * 2 - 1;

            star.position.set(randomX, randomY, randomZ);
            star.initialPosition = star.position.clone(); // Store the initial position
            star.phaseOffset = Math.random() * Math.PI * 2; // Unique phase offset for each star
            stars.push(star);
            scene.add(star);
        }

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

        // Animate stars
        stars.forEach(star => {
            const time = uniforms.u_time.value;
            const floatSpeed = 0.18; // Adjust float speed
            const floatAmplitude = 0.05; // Adjust float amplitude

            star.position.x = star.initialPosition.x + Math.sin(time * floatSpeed + star.phaseOffset + uniforms.u_scroll.value * 2.0) * floatAmplitude;
            star.position.y = star.initialPosition.y + Math.cos(time * floatSpeed + star.phaseOffset + uniforms.u_scroll.value * 2.0) * floatAmplitude;
            star.position.z = star.initialPosition.z + Math.sin(time * floatSpeed + star.phaseOffset + uniforms.u_scroll.value * 2.0) * floatAmplitude;

            // Light blinking effect
            star.material.opacity = 0.8 + Math.sin(time * floatSpeed + star.phaseOffset) * 0.2; // Adjust opacity range
        });

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

document.addEventListener("DOMContentLoaded", function() {
    const headerLinks = document.querySelectorAll(".header-link-text");
    headerLinks.forEach(link => {
      const splitLink = new SplitType(link, { types: "chars" });
      const chars = splitLink.chars;
      link.addEventListener("mouseenter", () => {
        chars.forEach((char, index) => {
          char.style.animation = `shuffle 1s steps(10) ${index * 0.05}s forwards`;
          setTimeout(() => {
            char.style.fontFamily = "gandur-new, sans-serif";
            char.style.fontSize = "1.2rem";
          }, 1000 + (index * 50));
        });
      });
      link.addEventListener("mouseleave", () => {
        chars.forEach((char, index) => {
          char.style.animation = `unshuffle 1s steps(10) ${index * 0.05}s forwards`;
          setTimeout(() => {
            char.style.fontSize = "inherit";
          }, 1000 + (index * 50));
        });
      });
    });
  });

$(document).ready(function() {
    const minLoaderTime = 2000; // Minimum time the loader should stay
    const startTime = new Date().getTime();
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Check if the last visit was within the past 24 hours
    if (lastVisit && (now - lastVisit < oneDay)) {
        $('.page-loader').hide();
        $('.content').show();
    } else {
        // If not, show the loader and then hide it after the minimum time
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

        // Update the last visit time in localStorage
        localStorage.setItem('lastVisit', now);
    }
});

// pixel.js
export default function captureAndRender(callback) {
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

    // Save the original image data for later use
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

export function fadeInAndPixelate(ctx, sampleSize, duration) {
    return new Promise(resolve => {
        const canvas = ctx.canvas;
        canvas.style.opacity = 0;
        setTimeout(() => { canvas.style.opacity = 1; }, 10);  // Trigger fade in

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

export function fadeOutAndDePixelate(ctx, sampleSize, duration) {
    return new Promise(resolve => {
        const canvas = ctx.canvas;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        // Use the original image data captured by captureAndRender
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
                // Pause at the most pixelated state
                setTimeout(() => {
                    resolve(canvas); // Pass canvas to next then block
                }, ); 
            }
        }

        step();
    }).then((canvas) => {
        return new Promise(resolve => {
            // Start depixelation and fade out together
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
                    }, 500); 
                }
            }

            step();
        });
    });
}



const $bigBall = document.querySelector(".cursor__ball--big");
const $smallBall = document.querySelector(".cursor__ball--small");
const $hoverables = document.querySelectorAll(".hoverable");

// Listeners
document.body.addEventListener("mousemove", onMouseMove);
for (let i = 0; i < $hoverables.length; i++) {
    $hoverables[i].addEventListener("mouseenter", onMouseHover);
    $hoverables[i].addEventListener("mouseleave", onMouseHoverOut);
}

// Move the cursor
function onMouseMove(e) {
    const x = e.clientX; // Use clientX instead of pageX
    const y = e.clientY; // Use clientY instead of pageY
    
    TweenMax.to($bigBall, 0.4, {
        x: x - 15,
        y: y - 15
    });
    TweenMax.to($smallBall, 0.1, {
        x: x - 5,
        y: y - 7
    });
}

// Hover an element
function onMouseHover() {
    TweenMax.to($bigBall, 0.3, {
        scale: 4
    });
}
function onMouseHoverOut() {
    TweenMax.to($bigBall, 0.3, {
        scale: 1
    });
}

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
    }],
    views: [
        {
            namespace: 'meteor-2',
            afterEnter(data) {
                // Your custom code for the specific site
                    const breakPoint = "53em";
                    const mm = gsap.matchMedia();

                    mm.add(
                        {
                            isDesktop: `(min-width: ${breakPoint})`,
                            isMobile: `(max-width: ${breakPoint})`,
                        },
                        (context) => {
                            let { isDesktop } = context.conditions;
                            const image = document.querySelector(".card__img");
                            const cardList = gsap.utils.toArray(".card");
                            const count = cardList.length;
                            const sliceAngle = (2 * Math.PI) / count;
                            const radius1 = 50 + image.clientHeight / 2;
                            const radius2 = isDesktop ? 250 - radius1 : 180 - radius1;

                            gsap
                                .timeline()
                                .from(cardList, {
                                    y: window.innerHeight / 2 + image.clientHeight * 1.5,
                                    rotateX: -180,
                                    stagger: 0.1,
                                    duration: 0.5,
                                    opacity: 0.8,
                                    scale: 3,
                                })
                                .set(cardList, {
                                    transformOrigin: `center ${radius1 + image.clientHeight / 2}px`,
                                })
                                .set(".group", {
                                    transformStyle: "preserve-3d",
                                })
                                .to(cardList, {
                                    y: -radius1,
                                    duration: 0.5,
                                    ease: "power1.out",
                                })
                                .to(
                                    cardList,
                                    {
                                        rotation: (index) => {
                                            return (index * 360) / count;
                                        },
                                        rotateY: 15,
                                        duration: 1,
                                        ease: "power1.out",
                                    },
                                    "<"
                                )
                                .to(cardList, {
                                    x: (index) => {
                                        return Math.round(
                                            radius2 * Math.cos(sliceAngle * index - Math.PI / 4)
                                        );
                                    },
                                    y: (index) => {
                                        return (
                                            Math.round(
                                                radius2 * Math.sin(sliceAngle * index - Math.PI / 4)
                                            ) - radius1
                                        );
                                    },
                                    rotation: (index) => {
                                        return (index + 1) * (360 / count);
                                    },
                                })
                                .to(
                                    cardList,
                                    {
                                        rotateY: 180,
                                        opacity: 0.8,
                                        duration: 1,
                                    },
                                    "<"
                                )
                                .from(
                                    ".headings",
                                    {
                                        opacity: 0,
                                        filter: "blur(60px)",
                                        duration: 1,
                                    },
                                    "<"
                                )
                                .to(cardList, {
                                    repeat: -1,
                                    duration: 2,
                                    onRepeat: () => {
                                        gsap.to(cardList[Math.floor(Math.random() * count)], {
                                            rotateY: "+=180",
                                        });
                                    },
                                })
                                .to(
                                    ".group",
                                    {
                                        rotation: 360,
                                        duration: 20,
                                        repeat: -1,
                                        ease: "none",
                                    },
                                    "<-=2"
                                );

                            return () => {};
                        }
                    );
         
            }
        }
    ]
});



