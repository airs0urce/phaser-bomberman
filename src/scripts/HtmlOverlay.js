class HtmlOverlay {

    constructor(scene) {
        this.scene = scene;
        this.zoom = scene.game.config.zoom;
        this.container = scene.game.canvas.parentElement;
        this.elements = [];

        scene.events.once('shutdown', () => this.destroyAll());
        scene.events.once('destroy', () => this.destroyAll());
    }

    showText(gameX, gameY, text, options = {}) {
        const {
            fontSize = 36,
            fontWeight = 'normal',
            color = '#fff',
            originX = 0.5,
            originY = 0.5,
            fadeOutDelay = 0,
            fadeOutDuration = 500,
            background = true,
        } = options;

        const el = document.createElement('div');
        el.textContent = text;

        const pixelX = gameX * this.zoom;
        const pixelY = gameY * this.zoom;

        const bgStyle = background
            ? 'background: rgba(0, 0, 0, 0.75); padding: 4px 14px; border-radius: 4px;'
            : '';

        el.style.cssText = `
            position: absolute;
            left: ${pixelX}px;
            top: ${pixelY}px;
            transform: translate(${-originX * 100}%, ${-originY * 100}%);
            font-family: Arial, sans-serif;
            font-size: ${fontSize}px;
            font-weight: ${fontWeight};
            color: ${color};
            text-shadow: 2px 2px 3px rgba(0,0,0,0.9);
            white-space: nowrap;
            pointer-events: none;
            z-index: 10;
            ${bgStyle}
        `;

        this.container.appendChild(el);
        this.elements.push(el);

        if (fadeOutDelay > 0) {
            setTimeout(() => {
                el.style.transition = `opacity ${fadeOutDuration}ms ease`;
                el.style.opacity = '0';
                setTimeout(() => {
                    this._removeElement(el);
                }, fadeOutDuration);
            }, fadeOutDelay);
        }

        return el;
    }

    showPanel(gameX, gameY, lines, options = {}) {
        const {
            originX = 0.5,
            originY = 0.5,
            fadeOutDelay = 0,
            fadeOutDuration = 500,
        } = options;

        const container = document.createElement('div');
        const pixelX = gameX * this.zoom;
        const pixelY = gameY * this.zoom;

        container.style.cssText = `
            position: absolute;
            left: ${pixelX}px;
            top: ${pixelY}px;
            transform: translate(${-originX * 100}%, ${-originY * 100}%);
            background: rgba(0, 0, 0, 0.75);
            padding: 10px 20px;
            border-radius: 6px;
            pointer-events: none;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        `;

        for (const line of lines) {
            const el = document.createElement('div');
            el.textContent = line.text;
            el.style.cssText = `
                font-family: Arial, sans-serif;
                font-size: ${line.fontSize || 36}px;
                font-weight: ${line.fontWeight || 'normal'};
                color: ${line.color || '#fff'};
                white-space: nowrap;
            `;
            container.appendChild(el);
        }

        this.container.appendChild(container);
        this.elements.push(container);

        if (fadeOutDelay > 0) {
            setTimeout(() => {
                container.style.transition = `opacity ${fadeOutDuration}ms ease`;
                container.style.opacity = '0';
                setTimeout(() => {
                    this._removeElement(container);
                }, fadeOutDuration);
            }, fadeOutDelay);
        }

        return container;
    }

    _removeElement(el) {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
        this.elements = this.elements.filter(e => e !== el);
    }

    destroyAll() {
        for (const el of this.elements) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }
        this.elements = [];
    }
}

module.exports = HtmlOverlay;
