/* ==========================================================================
   MYPLACE.TN E-COMMERCE APPLICATION SCRIPTS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIG & STATE ---
    const CONFIG = window.CONFIG || {};
    // Normalize configuration URLs so they always include a protocol and have no trailing slash.
    const normalizeBase = (u) => {
        if (!u) return '';
        const trimmed = String(u).trim().replace(/\/+$/, '');
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return 'https://' + trimmed;
    };
    const API_BASE = normalizeBase(CONFIG.API_URL || '');
    const SUPABASE_BASE = normalizeBase(CONFIG.SUPABASE_URL || '');

    // Consider the store configured if supabase and api values are provided and not placeholders.
    const isConfigured = CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes('__SUPABASE_URL__') &&
        CONFIG.API_URL && !CONFIG.API_URL.includes('__API_URL__');

    const state = {
        categories: [],
        products: [],
        activeCategory: 'all',
        cart: loadCart()
    };

    const $ = (id) => document.getElementById(id);
    const orderParams = new URLSearchParams(window.location.search);
    const quickOrderConfig = {
        enabled: window.location.pathname.endsWith('/order.html') || window.location.pathname.endsWith('/order'),
        initialProductId: Number(orderParams.get('product')),
        form: $('quick-order-form'),
        productSelect: $('qo-product'),
        qtyInput: $('qo-qty'),
        priceLabel: $('qo-price'),
        error: $('qo-error'),
        success: $('qo-success'),
    };

    const formatPrice = (value) => {
        const v = Number(value);
        const fixed = v.toFixed(3);
        return fixed.replace(/\.?0+$/, '') + ' DT';
    };

    // --- 2. MOBILE NAV MENU TOGGLE ---
    const hamburger = $('nav-hamburger');
    const mobileMenu = $('nav-mobile');

    const toggleMenu = () => {
        const isOpen = hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isOpen);
    };

    hamburger.addEventListener('click', toggleMenu);
    document.querySelectorAll('.mobile-link:not(.mobile-cart-btn)').forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger.classList.contains('active')) toggleMenu();
        });
    });

    // --- 3. SCROLL ACTIONS (Navbar state) ---
    const navbar = $('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- 4. SPOTLIGHT GLOW EFFECT ON PRODUCT CARDS ---
    document.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });

    // --- 5. CART (localStorage) ---
    const CART_KEY = 'myplace_cart';

    function loadCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveCart() {
        localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    }

    function cartCount() {
        return state.cart.reduce((sum, item) => sum + item.qty, 0);
    }

    function cartTotal() {
        return state.cart.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.id);
            return sum + (product ? Number(product.price) * item.qty : 0);
        }, 0);
    }

    function updateCartUI() {
        const count = cartCount();
        const badge = $('cart-badge');
        badge.textContent = count;
        badge.classList.toggle('visible', count > 0);
        $('mobile-cart-btn').textContent = `Cart (${count})`;
        $('cart-total').textContent = formatPrice(cartTotal());
        $('checkout-total').textContent = formatPrice(cartTotal());
        renderCartItems();
    }

    function renderQuickOrderProducts() {
        if (!quickOrderConfig.enabled || !quickOrderConfig.productSelect) return;
        const select = quickOrderConfig.productSelect;
        const products = state.products.filter(p => p.available && p.stock > 0);
        select.innerHTML = '<option value="">Choose a product</option>';

        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} — ${formatPrice(product.price)}`;
            select.appendChild(option);
        });

        if (Number.isInteger(quickOrderConfig.initialProductId) && quickOrderConfig.initialProductId > 0) {
            select.value = String(quickOrderConfig.initialProductId);
        }
        updateQuickOrderPrice();
    }

    function updateQuickOrderPrice() {
        if (!quickOrderConfig.enabled || !quickOrderConfig.priceLabel || !quickOrderConfig.productSelect) return;
        const id = Number(quickOrderConfig.productSelect.value);
        const qty = Number(quickOrderConfig.qtyInput?.value || 1);
        const product = state.products.find(p => p.id === id);
        if (!product || qty <= 0) {
            quickOrderConfig.priceLabel.textContent = '0 DT';
            return;
        }
        quickOrderConfig.priceLabel.textContent = formatPrice(Number(product.price) * qty);
    }

    async function submitQuickOrder(e) {
        if (!quickOrderConfig.enabled || !quickOrderConfig.form) return;
        e.preventDefault();
        quickOrderConfig.error.textContent = '';

        const productId = Number(quickOrderConfig.productSelect.value);
        const qty = Number(quickOrderConfig.qtyInput.value);
        const customerName = $('qo-name').value.trim();
        const phone = $('qo-phone').value.trim();
        const city = $('qo-city').value.trim();
        const address = $('qo-address').value.trim();
        const notes = $('qo-notes').value.trim();

        if (!productId || qty <= 0) {
            quickOrderConfig.error.textContent = 'Please select a product and quantity.';
            return;
        }

        const payload = {
            customer_name: customerName,
            phone,
            city,
            address,
            notes,
            items: [{ id: productId, qty }]
        };

        const submitButton = $('qo-submit');
        const originalText = submitButton.querySelector('span').textContent;
        submitButton.disabled = true;
        submitButton.style.opacity = '0.7';
        submitButton.querySelector('span').textContent = 'Placing order...';

        try {
            const res = await fetch(API_BASE + '/api/orders', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                quickOrderConfig.form.hidden = true;
                quickOrderConfig.success.hidden = false;
            } else {
                quickOrderConfig.error.textContent = data.error || 'Could not place your order. Please try again.';
            }
        } catch (err) {
            console.error(err);
            quickOrderConfig.error.textContent = 'Network error. Please check your connection and try again.';
        } finally {
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            submitButton.querySelector('span').textContent = originalText;
        }
    }

    function addToCart(id) {
        const product = state.products.find(p => p.id === id);
        if (!product) return;
        const existing = state.cart.find(item => item.id === id);
        if (existing) {
            if (existing.qty < product.stock) existing.qty += 1;
        } else {
            state.cart.push({ id, qty: 1 });
        }
        saveCart();
        updateCartUI();
        openCart();
    }

    function changeQty(id, delta) {
        const product = state.products.find(p => p.id === id);
        const item = state.cart.find(i => i.id === id);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) {
            state.cart = state.cart.filter(i => i.id !== id);
        } else if (product && item.qty > product.stock) {
            item.qty = product.stock;
        }
        saveCart();
        updateCartUI();
    }

    function renderCartItems() {
        const container = $('cart-items');
        container.innerHTML = '';
        const empty = $('cart-empty');
        const footer = $('cart-footer');

        if (state.cart.length === 0) {
            empty.hidden = false;
            footer.hidden = true;
            return;
        }
        empty.hidden = true;
        footer.hidden = false;

        state.cart.forEach(item => {
            const product = state.products.find(p => p.id === item.id);
            if (!product) return;
            const img = (product.image_urls && product.image_urls[0]) || '';
            const row = document.createElement('div');
            row.className = 'cart-item';
            row.innerHTML = `
                <img class="cart-item-img" src="${img}" alt="${escapeHtml(product.name)}" loading="lazy">
                <div class="cart-item-info">
                    <span class="cart-item-name">${escapeHtml(product.name)}</span>
                    <span class="cart-item-price">${formatPrice(product.price)}</span>
                    <div class="cart-qty">
                        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                    </div>
                </div>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                changeQty(Number(btn.dataset.id), Number(btn.dataset.delta));
            });
        });
    }

    // --- 6. CART DRAWER ---
    const drawer = $('cart-drawer');
    const overlay = $('cart-overlay');

    function openCart() {
        $('checkout').hidden = true;
        $('cart-body').hidden = false;
        $('cart-footer').hidden = state.cart.length === 0;
        drawer.classList.add('open');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        drawer.classList.remove('open');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    $('cart-btn').addEventListener('click', openCart);
    $('mobile-cart-btn').addEventListener('click', () => {
        if (hamburger.classList.contains('active')) toggleMenu();
        openCart();
    });
    $('cart-close').addEventListener('click', closeCart);
    $('cart-overlay').addEventListener('click', closeCart);
    $('cart-empty-shop').addEventListener('click', closeCart);

    // --- 7. CHECKOUT ---
    $('cart-checkout-btn').addEventListener('click', () => {
        if (state.cart.length === 0) return;
        $('cart-body').hidden = true;
        $('cart-footer').hidden = true;
        $('checkout').hidden = false;
        // Scroll the cart drawer to top so the checkout form is immediately visible
        // (use a short timeout to allow the drawer open animation to complete).
        setTimeout(() => { drawer.scrollTop = 0; }, 160);
    });

    $('checkout-back').addEventListener('click', () => {
        $('checkout').hidden = true;
        $('cart-body').hidden = false;
        $('cart-footer').hidden = false;
    });

    $('checkout-done').addEventListener('click', () => {
        $('checkout-form').hidden = false;
        $('checkout-success').hidden = true;
        $('checkout-form').reset();
        closeCart();
    });

    const checkoutForm = $('checkout-form');
    const checkoutError = $('checkout-error');
    const submitBtn = $('checkout-submit');

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        checkoutError.textContent = '';

        if (!isConfigured) {
            checkoutError.textContent = 'Store backend is not configured yet. See README.md.';
            return;
        }

        const items = state.cart.map(item => ({ id: item.id, qty: item.qty }));
        const payload = {
            customer_name: $('c-name').value.trim(),
            phone: $('c-phone').value.trim(),
            city: $('c-city').value.trim(),
            address: $('c-address').value.trim(),
            notes: $('c-notes').value.trim(),
            items
        };

        const originalText = submitBtn.querySelector('span').textContent;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.querySelector('span').textContent = 'Placing order...';

        try {
            const res = await fetch(API_BASE + '/api/orders', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                state.cart = [];
                saveCart();
                updateCartUI();
                checkoutForm.hidden = true;
                $('checkout-success').hidden = false;
            } else {
                checkoutError.textContent = data.error || 'Could not place your order. Please try again.';
            }
        } catch (err) {
            console.error(err);
            checkoutError.textContent = 'Network error. Please check your connection and try again.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.querySelector('span').textContent = originalText;
        }
    });

    if (quickOrderConfig.enabled) {
        quickOrderConfig.productSelect?.addEventListener('change', updateQuickOrderPrice);
        quickOrderConfig.qtyInput?.addEventListener('input', updateQuickOrderPrice);
        quickOrderConfig.form?.addEventListener('submit', submitQuickOrder);
    }

    // --- 8. PRODUCT PAGE NAVIGATION ---

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function openProductPage(id) {
        window.location.href = 'product.html?id=' + id;
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
        }
    });

    // --- 9. PRODUCT GRID & CATEGORY CHIPS ---
    const chipsContainer = $('category-chips');
    const grid = $('products-grid');

    function renderChips() {
        chipsContainer.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.className = 'chip' + (state.activeCategory === 'all' ? ' active' : '');
        allBtn.textContent = 'All';
        allBtn.dataset.category = 'all';
        allBtn.addEventListener('click', () => selectCategory('all'));
        chipsContainer.appendChild(allBtn);

        state.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'chip' + (state.activeCategory === cat.id ? ' active' : '');
            btn.textContent = cat.name;
            btn.dataset.category = cat.id;
            btn.addEventListener('click', () => selectCategory(cat.id));
            chipsContainer.appendChild(btn);
        });
    }

    function selectCategory(id) {
        state.activeCategory = id;
        chipsContainer.querySelectorAll('.chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === String(id));
        });
        renderGrid();
    }

    function visibleProducts() {
        const products = state.products.filter(p => p.available);
        if (state.activeCategory === 'all') return products;
        return products.filter(p => p.category_id === state.activeCategory);
    }

    function renderGrid() {
        grid.innerHTML = '';
        const products = visibleProducts();
        $('shop-empty').hidden = products.length !== 0;

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = product.id;

            const img = (product.image_urls && product.image_urls[0]) || '';
            const outOfStock = !product.available || product.stock <= 0;
            const sponsoredBadge = product.sponsored ? '<span class="product-badge sponsored">Sponsored</span>' : '';

            card.innerHTML = `
                <div class="product-img-wrap">
                    <img class="product-img" src="${img}" alt="${escapeHtml(product.name)}" loading="lazy">
                    ${sponsoredBadge}
                    ${outOfStock ? '<span class="product-badge out">Out of stock</span>'
                        : product.stock <= 5 ? `<span class="product-badge low">Only ${product.stock} left</span>` : ''}
                    ${product.video_urls && product.video_urls.length
                        ? '<span class="product-video-tag">▶ Video</span>' : ''}
                </div>
                <div class="product-info">
                    <span class="product-category">${escapeHtml(product.category_name || '')}</span>
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <p class="product-desc">${escapeHtml(product.description || '')}</p>
                    <div class="product-bottom">
                        <span class="product-price">${formatPrice(product.price)}</span>
                        <button class="add-btn" data-id="${product.id}" ${outOfStock ? 'disabled' : ''}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>Add</span>
                        </button>
                    </div>
                </div>
            `;

            card.querySelector('.product-img-wrap').addEventListener('click', () => openProductPage(product.id));
            card.querySelector('.product-name').addEventListener('click', () => openProductPage(product.id));
            card.querySelector('.add-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addToCart(product.id);
            });

            grid.appendChild(card);
        });
    }

    // --- 10. SEO: inject Product structured data after load ---
    function injectProductJsonLd() {
        const existing = document.getElementById('products-jsonld');
        if (existing) existing.remove();

        const items = state.products
            .filter(p => p.available)
            .map(p => ({
                '@type': 'Product',
                name: p.name,
                description: p.description || undefined,
                image: (p.image_urls && p.image_urls[0]) || undefined,
                category: p.category_name || undefined,
                offers: {
                    '@type': 'Offer',
                    price: Number(p.price),
                    priceCurrency: 'TND',
                    availability: p.stock > 0
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock'
                }
            }));

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'products-jsonld';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'MyPlace Products',
            itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, item }))
        });
        document.head.appendChild(script);
    }

    // --- 11. DATA LOADING ---
    async function fetchFromSupabase(table, params = '') {
        if (!SUPABASE_BASE) throw new Error('Supabase URL not configured');
        const res = await fetch(`${SUPABASE_BASE}/rest/v1/${table}${params}`, {
            headers: {
                apikey: CONFIG.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            }
        });
        if (!res.ok) throw new Error(`Failed to load ${table}: ${res.status}`);
        return res.json();
    }

    async function loadStore() {
        if (!isConfigured) {
            grid.innerHTML = '';
            $('setup-banner').hidden = false;
            return;
        }

        try {
            const [categories, products] = await Promise.all([
                fetchFromSupabase('categories', '?select=*&order=sort_order.asc'),
                fetchFromSupabase('products',
                    '?select=id,category_id,name,description,price,image_urls,video_urls,stock,available,categories(name)&order=category_id.asc')
            ]);

            const catNames = {};
            categories.forEach(cat => { catNames[cat.id] = cat.name; });

            state.categories = categories;
            state.products = products.map(p => ({
                ...p,
                category_name: p.categories ? p.categories.name : (catNames[p.category_id] || '')
            }));

            renderChips();
            renderGrid();
            updateCartUI();
            renderQuickOrderProducts();
            injectProductJsonLd();
        } catch (err) {
            console.error(err);
            grid.innerHTML = '';
            const msg = document.createElement('div');
            msg.className = 'shop-error';
            msg.innerHTML = '<h3>Could not load products</h3><p>Please check your Supabase configuration and connection.</p>';
            grid.appendChild(msg);
        }
    }

    // --- 12. INTERACTIVE PARTICLE CANVAS BACKGROUND ---
    const canvas = $('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null, radius: 150 };

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
                this.color = Math.random() > 0.5 ? 'rgba(255, 59, 48, 0.35)' : 'rgba(255, 255, 255, 0.15)';
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
                if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;
                this.x += this.dx;
                this.y += this.dy;
                if (mouse.x != null && mouse.y != null) {
                    const xs = mouse.x - this.x;
                    const ys = mouse.y - this.y;
                    const distance = Math.sqrt(xs * xs + ys * ys);
                    if (distance < mouse.radius) {
                        this.x -= xs * 0.015;
                        this.y -= ys * 0.015;
                    }
                }
                this.draw();
            }
        }

        const initParticles = () => {
            particles = [];
            const count = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 100);
            for (let i = 0; i < count; i++) {
                const size = Math.random() * 2 + 1;
                particles.push(new Particle(
                    Math.random() * (canvas.width - size * 2) + size,
                    Math.random() * (canvas.height - size * 2) + size,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5,
                    size
                ));
            }
        };

        const connectParticles = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 110) {
                        const opacity = (1 - (distance / 110)) * 0.12;
                        const isRed = particles[a].color.includes('255, 59') || particles[b].color.includes('255, 59');
                        ctx.strokeStyle = isRed
                            ? `rgba(255, 59, 48, ${opacity})`
                            : `rgba(255, 255, 255, ${opacity * 0.5})`;
                        ctx.lineWidth = 0.8;
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

    // --- 13. SCROLL REVEAL ANIMATIONS ---
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));

    // --- 14. INIT ---
    updateCartUI();
    loadStore();
});
