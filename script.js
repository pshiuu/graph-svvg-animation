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

  //pageloader
  $(document).ready(function() {
    const firstVisitMinTime = 5000; // Minimum time the loader should stay on first visit (5 seconds)
    const subsequentVisitMinTime = 2000; // Minimum time the loader should stay on subsequent visits (2 seconds)
    const startTime = new Date().getTime();
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    let videosLoaded = 0;
    const totalVideos = $('video').length; // Count the number of video elements

    // Function to get the minimum loader time based on the visit history
    function getMinLoaderTime() {
        return lastVisit && (now - lastVisit < oneDay) ? subsequentVisitMinTime : firstVisitMinTime;
    }

    const minLoaderTime = getMinLoaderTime(); // Determine loader time

    // Animate the .loading-text (shuffle animation)
    function animateLoadingText() {
        const loadingText = document.querySelector(".loading-text");
        if (loadingText) {
            const splitText = new SplitType(loadingText, { types: "chars" });
            const chars = splitText.chars;

            chars.forEach((char, index) => {
                char.style.animation = `shuffle 1s steps(10) ${index * 0.05}s infinite alternate-reverse`;
            });
        }
    }

    // Example keyframes for animations
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes shuffle {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Function to hide loader once all videos are loaded and minimum loader time has passed
    function hideLoader() {
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - startTime;
        const remainingTime = minLoaderTime - elapsedTime;

        setTimeout(function() {
            $('.page-loader').fadeOut(500, function() {
                $('.content').fadeIn(500);
            });
        }, remainingTime > 0 ? remainingTime : 0);
    }

    // Check if the last visit was within the past 24 hours
    if (lastVisit && (now - lastVisit < oneDay)) {
        // Hide the loader on subsequent visits within 24 hours
        $('.page-loader').hide();
        $('.content').show();
    } else {
        // Show the loader for first visits or visits after 24 hours
        animateLoadingText(); // Start the shuffle animation for loading text

        $(window).on('load', function() {
            if (totalVideos > 0) {
                // Wait for each video to fully load
                $('video').each(function() {
                    $(this).on('loadeddata', function() {
                        videosLoaded++;

                        // If all videos are loaded, hide the loader
                        if (videosLoaded === totalVideos) {
                            hideLoader();
                        }
                    });
                });
            } else {
                // If there are no videos, just hide the loader after minimum time
                hideLoader();
            }
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


if (window.innerWidth > 991) {
  const $bigBall = document.querySelector(".cursor__ball--big");
  const $hoverables = document.querySelectorAll(".hoverable");

  // Create trail dots with images
  const dots = [];
  const cursor = { x: 0, y: 0 };
  const dotSize = 30; // Adjust this to match the size of your dots

  for (let i = 0; i < 40; i++) {
      const dot = document.createElement("div");
      dot.className = "cursor-trail";
      const img = document.createElement("img");
      img.src = "https://cdn.prod.website-files.com/6638848fab8938514ff16754/667a0e688cddcfa6596749a9_Rhombus.svg";
      img.className = "cursor-svg";
      dot.appendChild(img);
      document.body.appendChild(dot);
      dots.push(dot);
  }

  // Listeners
  document.addEventListener("mousemove", onMouseMove);
  for (let i = 0; i < $hoverables.length; i++) {
      $hoverables[i].addEventListener("mouseenter", onMouseHover);
      $hoverables[i].addEventListener("mouseleave", onMouseHoverOut);
  }

  // Move the cursor
  function onMouseMove(e) {
      cursor.x = e.clientX;
      cursor.y = e.clientY;

      updateCursorPosition();
  }

  // Update cursor and trail positions
  function updateCursorPosition() {
      const x = cursor.x + window.scrollX;
      const y = cursor.y + window.scrollY;

      gsap.to($bigBall, { duration: 0.1, x: x - 15, y: y - 15 });
      repositionTrail(x, y);
  }

  // Reposition the trail based on the cursor position
  function repositionTrail(x, y) {
      dots.forEach((dot, index) => {
          const nextDot = dots[index + 1] || dots[0];

          // Fine-tune these values if necessary
          const dotAdjustmentX = dotSize / 4; // Adjust based on the observed offset
          const dotAdjustmentY = dotSize / 2; // Adjust based on the observed offset

          dot.style.left = `${x - dotAdjustmentX}px`;
          dot.style.top = `${y - dotAdjustmentY}px`;

          x += (nextDot.offsetLeft - dot.offsetLeft) * 0.5;
          y += (nextDot.offsetTop - dot.offsetTop) * 0.5;
      });
  }

  // Hover an element
  function onMouseHover() {
      gsap.to($bigBall, { duration: 0.3, scale: 4 });
  }

  function onMouseHoverOut() {
      gsap.to($bigBall, { duration: 0.3, scale: 1 });
  }

  // Draw the trail
  function draw() {
      updateCursorPosition();
  }

  setInterval(draw, 15);
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
        },
        after(data) {
            // Ensure Webflow interactions are reinitialized after the transition completes
            Webflow.ready();
            Webflow.require('ix2').init(); // Reinitialize Webflow IX2 (Interactions 2.0)
        }
    }],
    views: [
        {
            namespace: 'home',
            beforeEnter(data) {
            $(document).ready(function() {
    
    var $cards = $('.card-home');

    // Function to get random positions within the landing-wrap container
    function getRandomPosition(containerWidth, containerHeight, cardWidth, cardHeight) {
        var randomX = Math.floor(Math.random() * (containerWidth - cardWidth));
        var randomY = Math.floor(Math.random() * (containerHeight - cardHeight));

        return { x: randomX, y: randomY };
    }

    // Function to pop in (fade in), stay visible, fade out, then pop in again at a different position
    function popInOutCard($card, containerWidth, containerHeight, cardWidth, cardHeight, isFirstCard = false) {
        // Get random position for the card
        var randomPosition = getRandomPosition(containerWidth, containerHeight, cardWidth, cardHeight);

        // Apply the random position
        $card.css({
            'transform': 'translate(' + randomPosition.x + 'px, ' + randomPosition.y + 'px)'
        });

        // If it's the first card, make it appear quickly
        if (isFirstCard) {
            $card.fadeIn(1000); // Quick fade in for the first card
        } else {
            $card.fadeIn(4000); // Slow fade in for subsequent cards (4 seconds)
        }

        // After 10 seconds, fade out
        setTimeout(function() {
            $card.fadeOut(4000); // Slow fade out (4 seconds)

            // After fading out, reappear in a new position after 2 seconds
            setTimeout(function() {
                popInOutCard($card, containerWidth, containerHeight, cardWidth, cardHeight);
            }, 6000); // Reappear after 6 seconds for a more relaxed effect
        }, 20000); // Stay visible for 20 seconds
    }

    // Function to initiate the pop-in/out cycle for all cards
    function initiatePopInOutCycle() {
        var $container = $('.landing-wrap');
        var containerWidth = $container.width();
        var containerHeight = $container.height();

        // Iterate over each card and initiate the pop in/out effect
        $cards.each(function(index) {
            var $card = $(this);
            var cardWidth = $card.outerWidth();
            var cardHeight = $card.outerHeight();

            // Apply a slight delay for each card to create a staggered effect
            setTimeout(function() {
                var isFirstCard = (index === 0); // Check if it's the first card
                popInOutCard($card, containerWidth, containerHeight, cardWidth, cardHeight, isFirstCard);
            }, index * 2000); // Stagger the start of each card by 2 seconds
        });
    }

    // Call the function to initiate the pop in/out effect
    initiatePopInOutCycle();
    
});


                console.log('Entering home');
            },
            afterEnter(data) {
                console.log('Entered home');
            }
        },
        {
            namespace: 'meteor',
            beforeEnter(data) {
         var swipermeteor = new Swiper(".swiper.is-autoplay", {
  slidesPerView: 1.5,
  grabCursor: true,
  speed: 5000,
  spaceBetween: 30,
  freeMode: true,
  loop: true,
  centeredSlides: true,
  autoplay: {
    delay: 0,
    disableOnInteraction: false
  },
  breakpoints: {
      767: {
      slidesPerView: 2
    },
       991: {
      slidesPerView: 3
    },
    1280: {
      slidesPerView: 4
    },
  }
});

            },
            afterEnter(data) {
                console.log('Entered meteor');
            }
        },
        {
            namespace: 'work',
            beforeEnter(data) {
                console.log('code is updated');
                  // Select all elements that have a 'data-vimeo-id' attribute
  const vimeoThumbnails = document.querySelectorAll('img[data-vimeo-id]');

  vimeoThumbnails.forEach(thumbnail => {
    // Get the videoId from the data attribute
    const videoId = thumbnail.getAttribute('data-vimeo-id');

    if (videoId) {
      // Fetch Vimeo thumbnail using the API
      fetch(`https://vimeo.com/api/v2/video/${videoId}.json`)
        .then(response => response.json())
        .then(data => {
          const thumbnailUrl = data[0].thumbnail_large; // Use large thumbnail size
          
          // Set the src of the current thumbnail image
          thumbnail.src = thumbnailUrl;
        })
        .catch(error => console.error('Error fetching Vimeo thumbnail:', error));
    }
  });
                    
            },
            afterEnter(data) {
                console.log('Entered work');
                // Custom code for the work namespace after the transition finishes
            }
        },
        {
            namespace: 'about',
            beforeEnter(data) {

            },
            afterEnter(data) {
          
            }
        },
        {
            namespace: 'contact',
            beforeEnter(data) {
                console.log('Entering contact');
                // Custom code for the contact namespace before the transition finishes
            },
            afterEnter(data) {
                console.log('Entered contact');
                // Custom code for the contact namespace after the transition finishes
            }
        },
        {
            namespace: 'projects',
            beforeEnter(data) {
                console.log('Entering projects');
                const meteorcms = Array.from(document.querySelectorAll('.meteor-video-cms')).map(p => {
                    return new Plyr(p, {
                        controls: [
                            'play-large', 
                            'progress', 
                            'current-time', 
                            'mute', 
                            'fullscreen'
                        ],
                        autoplay: false,
                        playsinline: false,
                        ratio: '9:16'
                    });
                });
                var swipermore = new Swiper(".swiper.is-more", {
                    slidesPerView: 3,
                    grabCursor: true,
                    speed: 5000,
                    spaceBetween: 30,
                    freeMode: true,
                    loop: true,
                    centeredSlides: true,
                    autoplay: {
                      delay: 0,
                      disableOnInteraction: false
                    }
                  });
            },
            afterEnter(data) {
                console.log('Entered projects');
                // Custom code for the projects namespace after the transition finishes
            }
        },
        {
            namespace: 'pastwork',
            beforeEnter(data) {
                console.log('Entering pastwork');  
                const pastplayer = Array.from(document.querySelectorAll('.plyr-current')).map(p => {
                    return new Plyr(p, {
                        controls: [
                            'play-large', 
                            'play', 
                            'mute', 
                            'fullscreen',
                            'settings',
                        ],
                        autoplay: false,
                        playsinline: false,
                        
                    });
                });
            },
            afterEnter(data) {
                console.log('Entered pastwork');
                // Custom code for the pastwork namespace after the transition finishes
            }
        }
    ]
});

// Attach the ajaxSend and ajaxComplete handlers globally
$(document).ajaxSend(function() {
    Webflow.destroy();
});

$(document).ajaxComplete(function() {
    Webflow.ready();
    Webflow.require('ix2').init(); // Reinitialize Webflow IX2 (Interactions 2.0)
});
