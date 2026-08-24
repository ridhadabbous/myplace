/* ==========================================================================
   MYPLACE.TN PRODUCT PAGE SCRIPTS
   Loads a single product by ?id= via the Cloudflare Worker (/api/products/:id)
   and handles direct orders via the Worker (/api/orders).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIG & STATE ---
    const CONFIG = window.CONFIG || {};
    const normalizeBase = (u) => {
        if (!u) return '';
        const trimmed = String(u).trim().replace(/\/+$/, '');
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return 'https://' + trimmed;
    };
    const API_BASE = normalizeBase(CONFIG.API_URL || '');

    const isConfigured = CONFIG.API_URL && !CONFIG.API_URL.includes('__API_URL__');

    const state = {
        product: null,
        media: 'image',
        qty: 1
    };

    const $ = (id) => document.getElementById(id);
    const productId = Number(new URLSearchParams(window.location.search).get('id'));

    const formatPrice = (value) => {
        const v = Number(value);
        const fixed = v.toFixed(3);
        return fixed.replace(/\.?0+$/, '') + ' DT';
    };

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function fetchProduct() {
        if (!API_BASE) throw new Error('API URL not configured');
        if (!Number.isInteger(productId) || productId <= 0) return [];
        const res = await fetch(`${API_BASE}/api/products/${productId}`);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(`Failed to load product: ${res.status}`);
        const row = await res.json();
        return [row];
    }

    // --- 2. NAV (hamburger + scroll state) ---
    const hamburger = $('nav-hamburger');
    const mobileMenu = $('nav-mobile');

    if (hamburger && mobileMenu) {
        const toggleMenu = () => {
            const isOpen = hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', isOpen);
        };
        hamburger.addEventListener('click', toggleMenu);
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                if (hamburger.classList.contains('active')) toggleMenu();
            });
        });
    }

    const navbar = $('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // --- 3. PAGE STATES ---
    const views = {
        loading: $('pd-loading'),
        notFound: $('pd-notfound'),
        error: $('pd-error-state'),
        product: $('pd-product')
    };

    function showView(name) {
        Object.keys(views).forEach(k => { views[k].hidden = k !== name; });
    }

    function showError(message) {
        $('pd-error-message').textContent = message || 'حدث خطأ أثناء تحميل هذا المنتج.';
        showView('error');
    }

    $('pd-retry').addEventListener('click', () => {
        showView('loading');
        load();
    });

    // --- 4. RENDER ---
    const stage = $('pd-stage');
    const tabs = $('pd-tabs');
    const thumbs = $('pd-thumbs');

    function renderMediaTabs() {
        tabs.innerHTML = '';
        const p = state.product;
        const hasImages = p.image_urls && p.image_urls.length;
        const hasVideos = p.video_urls && p.video_urls.length;

        if (hasImages) {
            const btn = document.createElement('button');
            btn.className = 'lb-tab' + (state.media === 'image' ? ' active' : '');
            btn.textContent = 'صور';
            btn.addEventListener('click', () => { state.media = 'image'; renderMedia(); renderMediaTabs(); });
            tabs.appendChild(btn);
        }
        if (hasVideos) {
            const btn = document.createElement('button');
            btn.className = 'lb-tab' + (state.media === 'video' ? ' active' : '');
            btn.textContent = '▶ فيديو';
            btn.addEventListener('click', () => { state.media = 'video'; renderMedia(); renderMediaTabs(); });
            tabs.appendChild(btn);
        }
    }

    function renderStageImage(url) {
        stage.innerHTML = '';
        const img = document.createElement('img');
        img.className = 'lb-image';
        img.src = url;
        img.alt = state.product.name;
        stage.appendChild(img);
    }

    function renderMedia() {
        const p = state.product;
        if (state.media === 'video' && p.video_urls && p.video_urls.length) {
            stage.innerHTML = '';
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.src = p.video_urls[0];
            video.className = 'lb-video';
            stage.appendChild(video);
        } else if (p.image_urls && p.image_urls.length) {
            renderStageImage(p.image_urls[0]);
        } else {
            stage.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'lb-placeholder';
            div.textContent = 'لا توجد وسائط متوفرة';
            stage.appendChild(div);
        }
    }

    function renderThumbs() {
        thumbs.innerHTML = '';
        const images = state.product.image_urls || [];
        if (images.length <= 1) return;

        images.forEach((url, i) => {
            const thumb = document.createElement('img');
            thumb.className = 'lb-thumb' + (i === 0 ? ' active' : '');
            thumb.src = url;
            thumb.alt = `${state.product.name} ${i + 1}`;
            thumb.addEventListener('click', () => {
                state.media = 'image';
                renderMediaTabs();
                renderStageImage(url);
                thumbs.querySelectorAll('.lb-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbs.appendChild(thumb);
        });
    }

    function maxQty() {
        const p = state.product;
        return Math.max(1, Math.min(Number(p.stock) || 1, 99));
    }

    function updateQtyUI() {
        $('pd-qty').textContent = state.qty;
        $('pd-total').textContent = formatPrice(Number(state.product.price) * state.qty);
    }

    function renderStock() {
        const p = state.product;
        const stockLabel = $('pd-stock');
        const orderCard = $('pd-order-card');
        const outOfStock = !p.available || Number(p.stock) <= 0;

        if (outOfStock) {
            stockLabel.textContent = 'غير متوفر';
            stockLabel.classList.add('out');
            orderCard.hidden = true;
        } else {
            stockLabel.textContent = Number(p.stock) <= 5 ? `بقي ${p.stock} فقط` : 'متوفر';
            stockLabel.classList.remove('out');
        }
    }

    function updateMetaTags(p) {
        const price = formatPrice(p.price);
        const img = (p.image_urls && p.image_urls[0]) || 'https://myplace.tn/og-image.png';
        const desc = p.description || `اطلب ${p.name} أونلاين من MyPlace بسعر ${price} — الدفع عند الاستلام في كل ولايات تونس.`;
        const url = window.location.origin + '/product.html?id=' + p.id;

        document.title = `${p.name} — ${price} | MyPlace تونس`;
        const setMeta = (selector, attr, value) => {
            const el = document.querySelector(selector);
            if (el) el.setAttribute(attr, value);
        };
        setMeta('meta[name="description"]', 'content', desc);
        setMeta('meta[property="og:title"]', 'content', `${p.name} — ${price}`);
        setMeta('meta[property="og:description"]', 'content', desc);
        setMeta('meta[property="og:image"]', 'content', img);
        setMeta('meta[property="og:url"]', 'content', url);
        setMeta('meta[name="twitter:title"]', 'content', `${p.name} — ${price}`);
        setMeta('meta[name="twitter:description"]', 'content', desc);
        setMeta('meta[name="twitter:image"]', 'content', img);

        let ld = document.getElementById('product-jsonld');
        if (!ld) {
            ld = document.createElement('script');
            ld.type = 'application/ld+json';
            ld.id = 'product-jsonld';
            document.head.appendChild(ld);
        }
        ld.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.name,
            description: p.description || undefined,
            image: (p.image_urls && p.image_urls[0]) || undefined,
            category: p.category_name || undefined,
            offers: {
                '@type': 'Offer',
                url,
                price: Number(p.price),
                priceCurrency: 'TND',
                availability: Number(p.stock) > 0 && p.available
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock'
            }
        });
    }

    function renderProduct() {
        const p = state.product;
        p.category_name = p.categories ? p.categories.name : '';

        $('pd-category').textContent = p.category_name || '';
        $('pd-name').textContent = p.name;
        $('pd-desc').textContent = p.description || '';
        $('pd-price').textContent = formatPrice(p.price);

        state.media = p.video_urls && p.video_urls.length ? 'video' : 'image';
        state.qty = 1;

        renderMedia();
        renderMediaTabs();
        renderThumbs();
        renderStock();
        updateQtyUI();
        updateMetaTags(p);

        showView('product');
        guidedPurchaseFlow();
    }

    // --- 4b. MOBILE GUIDED PURCHASE FLOW ---
    // On phones: the image reveals with a slow cinematic zoom (CSS), then the
    // page glides down to the order form. Any touch/swipe/key cancels it.
    const mobileMQ = window.matchMedia('(max-width: 900px)');
    const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function guidedPurchaseFlow() {
        if (!mobileMQ.matches || !motionOK) return;

        const orderCard = $('pd-order-card');
        if (!orderCard || orderCard.hidden) return;

        let cancelled = false;
        const cancel = () => { cancelled = true; };
        const events = ['touchstart', 'wheel', 'keydown'];
        const watch = () => events.forEach(ev => window.addEventListener(ev, cancel, { passive: true }));
        const unwatch = () => events.forEach(ev => window.removeEventListener(ev, cancel));

        // Hold phase: let the user take in the image first; any interaction skips the flow.
        watch();
        setTimeout(() => {
            unwatch();
            if (cancelled) return;

            // Glide phase: interactions abort the scroll mid-way.
            watch();
            glideTo(orderCard, () => cancelled).then(unwatch);
        }, 2200);
    }

    function glideTo(target, isCancelled) {
        return new Promise((resolve) => {
            const navbar = document.querySelector('.navbar');
            const navH = navbar ? navbar.offsetHeight + 10 : 80;
            const start = window.scrollY;
            const goal = target.getBoundingClientRect().top + start - navH;
            const dist = goal - start;
            if (Math.abs(dist) < 40) {
                resolve();
                return;
            }

            // Native smooth scrolling is too abrupt for the "slow motion" feel,
            // so animate manually with an ease-in-out curve (~1.3s).
            const duration = 1300;
            const t0 = performance.now();
            const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

            const step = (now) => {
                if (isCancelled && isCancelled()) {
                    resolve();
                    return;
                }
                const progress = Math.min(1, (now - t0) / duration);
                window.scrollTo(0, start + dist * ease(progress));
                if (progress < 1) requestAnimationFrame(step);
                else resolve();
            };
            requestAnimationFrame(step);
        });
    }

    // --- 5. QTY STEPPER ---
    $('pd-qty-minus').addEventListener('click', () => {
        if (state.qty > 1) { state.qty -= 1; updateQtyUI(); }
    });
    $('pd-qty-plus').addEventListener('click', () => {
        if (state.qty < maxQty()) { state.qty += 1; updateQtyUI(); }
    });

    // --- 6. ORDER FORM ---
    const form = $('pd-order-form');
    const formError = $('pd-form-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formError.textContent = '';

        const name = $('p-name').value.trim();
        const phone = $('p-phone').value.trim();
        const city = $('p-city').value.trim();
        const address = $('p-address').value.trim();
        const notes = $('p-notes').value.trim();

        // Client-side validation mirroring the Worker's rules for instant feedback.
        if (name.length < 2 || name.length > 120) {
            formError.textContent = 'يرجى إدخال اسمك الكامل.';
            return;
        }
        if (!/^[+0-9 ()-]{6,20}$/.test(phone)) {
            formError.textContent = 'يرجى إدخال رقم هاتف صحيح.';
            return;
        }
        if (city.length < 2 || city.length > 120) {
            formError.textContent = 'يرجى اختيار مدينتك.';
            return;
        }
        if (address.length < 5 || address.length > 500) {
            formError.textContent = 'يرجى إدخال عنوان التوصيل.';
            return;
        }

        const payload = {
            customer_name: name,
            phone,
            city,
            address,
            notes,
            items: [{ id: state.product.id, qty: state.qty }]
        };

        const submitBtn = $('pd-submit');
        const originalText = submitBtn.querySelector('span').textContent;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.querySelector('span').textContent = 'جارٍ إرسال الطلب...';

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
                $('pd-order-ref').textContent = data.order_id ? `Reference: #PD-${data.order_id}` : '';
                form.hidden = true;
                $('pd-success').hidden = false;
            } else {
                formError.textContent = data.error || 'تعذّر إرسال طلبك. حاول مرة أخرى.';
            }
        } catch (err) {
            console.error(err);
            formError.textContent = 'خطأ في الشبكة. تحقق من اتصالك وحاول مجددا.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.querySelector('span').textContent = originalText;
        }
    });

    $('pd-done').addEventListener('click', () => {
        window.location.href = 'index.html#shop';
    });

    // --- 7. LOAD ---
    async function load() {
        if (!isConfigured) {
            showError('المتجر غير مهيّأ بعد.');
            return;
        }
        if (!Number.isInteger(productId) || productId <= 0) {
            showView('notFound');
            return;
        }
        try {
            const rows = await fetchProduct();
            if (!rows || !rows.length) {
                showView('notFound');
                return;
            }
            state.product = rows[0];
            renderProduct();
        } catch (err) {
            console.error(err);
            showError();
        }
    }

    load();
});
