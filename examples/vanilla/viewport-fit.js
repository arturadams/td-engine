// viewport-fit.js
// Fit the canvas to available space, subtracting header + toolbar (with margins),
// handling mobile visual viewport, and refitting on resize and element size changes.

export function attachViewportFit(canvas, {
    headerSelector,
    toolbarSelector,
    maxScale = 1,
} = {}) {
    const header = headerSelector ? document.querySelector(headerSelector) : null;
    const toolbar = toolbarSelector ? document.querySelector(toolbarSelector) : null;

    // return element's outer height including margins
    function outerHeight(el) {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const mt = parseFloat(cs.marginTop) || 0;
        const mb = parseFloat(cs.marginBottom) || 0;
        return r.height + mt + mb;
    }

    // choose the most accurate viewport height we can
    function viewportHeight() {
        const vv = window.visualViewport;
        return vv ? Math.floor(vv.height) : Math.floor(window.innerHeight);
    }

    // main fit routine
    function fit() {
        // logical canvas size (set by app from map size)
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        if (!cw || !ch) return;

        // available css box
        const vw = Math.floor(document.documentElement.clientWidth);
        const vh = viewportHeight();

        // subtract UI
        const headerH = outerHeight(header);
        const toolbarH = outerHeight(toolbar);
        const usableH = Math.max(0, vh - headerH - toolbarH);

        // scale to contain, then clamp to maxScale if provided
        let scale = Math.min(vw / cw, usableH / ch);
        if (Number.isFinite(maxScale)) scale = Math.min(scale, maxScale);
        scale = Math.max(scale, 0); // guard

        // apply css box (do not touch canvas.width/height here)
        canvas.style.width = `${Math.floor(cw * scale)}px`;
        canvas.style.height = `${Math.floor(ch * scale)}px`;
        canvas.style.display = 'block';
        canvas.style.marginLeft = 'auto';
        canvas.style.marginRight = 'auto';

        // prevent body scrolling caused by tiny rounding mismatches
        document.documentElement.style.overflowY = 'hidden';
        document.body.style.overflowY = 'hidden';
    }

    // refit on viewport changes
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onResize);
        window.visualViewport.addEventListener('scroll', onResize);
    }

    // refit when devicePixelRatio changes
    let dprMql = null;
    function watchDpr() {
        if (dprMql) dprMql.removeEventListener('change', onDprChange);
        dprMql = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        dprMql.addEventListener('change', onDprChange);
    }
    function onDprChange() {
        fit();
        watchDpr();
    }
    watchDpr();

    // refit when header / toolbar change size (responsive, dynamic content)
    const ro = 'ResizeObserver' in window ? new ResizeObserver(onResize) : null;
    if (ro) {
        if (header) ro.observe(header);
        if (toolbar) ro.observe(toolbar);
    }

    // expose fit and a cleanup
    return {
        fit,
        destroy() {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', onResize);
                window.visualViewport.removeEventListener('scroll', onResize);
            }
            if (dprMql) dprMql.removeEventListener('change', onDprChange);
            if (ro) ro.disconnect();
            document.documentElement.style.overflowY = '';
            document.body.style.overflowY = '';
        }
    };
}
