/* ==========================================================================
   MYPLACE.TN INTERACTIVE APPLICATION SCRIPTS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. MOBILE NAV MENU TOGGLE ---
    const hamburger = document.getElementById('nav-hamburger');
    const mobileMenu = document.getElementById('nav-mobile');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    const toggleMenu = () => {
        const isOpen = hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isOpen);
    };

    hamburger.addEventListener('click', toggleMenu);
    
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // --- 2. SCROLL ACTIONS (Navbar state & link tracking) ---
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');

    window.addEventListener('scroll', () => {
        // Sticky Navbar styling
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Highlight active nav item
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 120)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // --- 3. DYNAMIC PILLAR CONTACT MAPPING ---
    const serviceCtaLinks = document.querySelectorAll('.service-link');
    const serviceSelect = document.getElementById('pillar-select');

    serviceCtaLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pillar = link.getAttribute('data-pillar');
            if (pillar && serviceSelect) {
                serviceSelect.value = pillar;
            }
            
            const contactSection = document.getElementById('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- 4. SPOTLIGHT GLOW EFFECT ON CARDS ---
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // --- 5. STATS ANIMATED COUNTERS ---
    const statNums = document.querySelectorAll('.stat-num');
    const animateStats = () => {
        statNums.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-val'));
            const suffix = stat.textContent.replace(/[0-9]/g, ''); // Extract '+' or '%' or '/7'
            let count = 0;
            const speed = target / 50; // Speed factor based on target size
            
            const updateCount = () => {
                count += Math.ceil(speed || 1);
                if (count < target) {
                    if (target === 24) {
                        stat.textContent = `${count}/7`;
                    } else if (target === 99) {
                        stat.textContent = `${count}%`;
                    } else {
                        stat.textContent = `${count}+`;
                    }
                    setTimeout(updateCount, 25);
                } else {
                    if (target === 24) {
                        stat.textContent = `24/7`;
                    } else if (target === 99) {
                        stat.textContent = `99%`;
                    } else {
                        stat.textContent = `${target}+`;
                    }
                }
            };
            updateCount();
        });
    };

    // Trigger stats animation when visible
    const observerOptions = {
        threshold: 0.5,
        rootMargin: "0px"
    };

    const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) {
        statsObserver.observe(statsBar);
    }

    // --- 6. CONTACT FORM SUBMISSION (Web3Forms AJAX integration) ---
    const form = document.getElementById('contact-form');
    const formWrapper = form.parentElement;
    const successBox = document.getElementById('success-box');
    const resetBtn = document.getElementById('reset-success-btn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const submitBtnText = submitBtn.querySelector('span');
        const originalText = submitBtnText ? submitBtnText.textContent : 'Send Inquiry';
        
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        if (submitBtnText) submitBtnText.textContent = 'Sending...';

        const formData = new FormData(form);
        const object = Object.fromEntries(formData);
        const json = JSON.stringify(object);

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: json
        })
        .then(async (response) => {
            let jsonResponse = await response.json();
            if (response.status == 200) {
                formWrapper.classList.add('submitted');
                successBox.classList.add('active');
            } else {
                console.warn(jsonResponse);
                alert(jsonResponse.message || "Failed to submit. Please verify the Web3Forms Access Key.");
            }
        })
        .catch(error => {
            console.error(error);
            alert("Form submission failed. Check your network connection and try again.");
        })
        .then(() => {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            if (submitBtnText) submitBtnText.textContent = originalText;
        });
    });

    resetBtn.addEventListener('click', () => {
        formWrapper.classList.remove('submitted');
        successBox.classList.remove('active');
        form.reset();
    });

    // --- 7. FAQ ACCORDION INTERACTIVITY ---
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const content = question.nextElementSibling;
            const isActive = item.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-content').style.maxHeight = null;
            });
            
            // Toggle clicked item
            if (!isActive) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });

    // --- 8. INTERACTIVE PARTICLE CANVAS BACKGROUND ---
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null, radius: 150 };

        // Handle canvas sizing
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor(x, y, dx, dy, size) {
                this.x = x;
                this.y = y;
                this.dx = dx;
                this.dy = dy;
                this.size = size;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 59, 48, 0.4)';
                ctx.fill();
            }

            update() {
                // Bounce on boundaries
                if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
                if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;

                // Move particles
                this.x += this.dx;
                this.y += this.dy;

                // Mouse interaction (gentle repulsion/attraction)
                if (mouse.x != null && mouse.y != null) {
                    let xs = mouse.x - this.x;
                    let ys = mouse.y - this.y;
                    let distance = Math.sqrt(xs * xs + ys * ys);
                    if (distance < mouse.radius) {
                        // Gently attract towards mouse position
                        this.x += xs * 0.01;
                        this.y += ys * 0.01;
                    }
                }
                this.draw();
            }
        }

        const initParticles = () => {
            particles = [];
            const count = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);
            for (let i = 0; i < count; i++) {
                let size = Math.random() * 2 + 1;
                let x = Math.random() * (canvas.width - size * 2) + size;
                let y = Math.random() * (canvas.height - size * 2) + size;
                let dx = (Math.random() - 0.5) * 0.5;
                let dy = (Math.random() - 0.5) * 0.5;
                particles.push(new Particle(x, y, dx, dy, size));
            }
        };

        const connectParticles = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 110) {
                        let opacity = (1 - (distance / 110)) * 0.15;
                        ctx.strokeStyle = `rgba(255, 59, 48, ${opacity})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => p.update());
            connectParticles();
            requestAnimationFrame(animate);
        };

        resizeCanvas();
        animate();
    }
});
