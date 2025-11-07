class DropRevealList {
    static styleInjected = false;

    constructor(container, options = {}) {
        // Callbacks
        this.onReveal = options.onReveal || null;
        this.onEnd = options.onEnd || null;

        // Configurable class names
        this.classNames = {
            list: options.classList || 'drl-list',
            listItem: options.classListItem || 'drl-list-item',
            placeholder: options.classPlaceholder || 'drl-placeholder',
            card: options.classCard || 'drl-card',
            visible: options.classVisible || 'drl-visible'
        };

        this.texts = {
            placeholderText: options.placeholderText || '+',
            placeholderTitle: options.placeholderTitle || 'Tap to reveal'
        }

        this.container = container;
        this.currentIndex = 0;
        this.listItems = [];

        if (!DropRevealList.styleInjected) {
            this.injectStyles();
            DropRevealList.styleInjected = true;
        }

        this.init();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.dataset.name = this.classNames.list;
        style.textContent = `
        /* Reset styles for this widget */
        .${this.classNames.list}, .${this.classNames.list} li {
            all: unset;
            display: block;
            box-sizing: border-box;
        }
        .${this.classNames.list} {
            margin-inline: unset !important;
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .${this.classNames.listItem} {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            &:not(:last-of-type) { margin-bottom: .5rem; }
        }
        .${this.classNames.placeholder} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 1ch;
            border-radius: 9999px;
            line-height: 1;
            min-height: 2.5em;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            background: var(--color-theme-tint, #00000020);
            color: var(--color-theme-contrast-complementary, black);
            user-select: none;
            box-shadow: inset 0 0 4px rgba(0,0,0,0.2);
            transition: background 0.2s;
        }
        .${this.classNames.placeholder}:hover {
            background: var(--color-theme, #bbb);
            color: var(--color-theme-contrast, black);
        }
        .${this.classNames.card} {
            background: white;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            padding: 15px 20px;
            width: 100%;
            opacity: 0;
            transform: translateY(-50px) rotate(0deg);
            box-sizing: border-box;
        }
        @keyframes drl-dropBounce {
            0%   { opacity: 0; transform: translateY(-50px) rotate(var(--start-rot)); }
            40%  { opacity: 1; transform: translateY(10px) rotate(0deg); }
            60%  { transform: translateY(-5px) rotate(0deg); }
            80%  { transform: translateY(3px) rotate(0deg); }
            100% { opacity: 1; transform: translateY(0) rotate(0deg); }
        }
        .${this.classNames.card}.${this.classNames.visible} {
            animation: drl-dropBounce 0.6s ease forwards;
        }
        `;
        document.head.appendChild(style);
    }

    init() {
        const lists = this.container.querySelectorAll('ul');
        lists.forEach(ul => {
            ul.classList.add(this.classNames.list);
            const items = Array.from(ul.querySelectorAll('li'));
            items.forEach(li => {
                li.classList.add(this.classNames.listItem);
                const text = li.innerHTML;
                li.innerHTML = '';
                const placeholder = document.createElement('div');
                placeholder.className = this.classNames.placeholder;
                placeholder.innerHTML = this.texts.placeholderText;
                placeholder.title = this.texts.placeholderTitle;
                placeholder.dataset.text = text;
                li.appendChild(placeholder);
            });
            this.listItems.push(items);
        });

        // For each list, setup reveal sequence
        this.listItems.forEach(items => {
            items.forEach((li, index) => {
                const placeholder = li.querySelector(`.${this.classNames.placeholder}`);
                if (index !== 0) placeholder.style.display = 'none';
                placeholder.addEventListener('click', () => this.showNextBullet(items, index));
            });
        });
    }

    showNextBullet(items, index) {
        const li = items[index];
        const placeholder = li.querySelector(`.${this.classNames.placeholder}`);
        const text = placeholder.dataset.text;

        const card = document.createElement('div');
        card.className = this.classNames.card;
        card.innerHTML = text;

        const rot = (Math.random() * 10 - 5).toFixed(2) + 'deg';
        card.style.setProperty('--start-rot', rot);

        li.innerHTML = '';
        li.appendChild(card);

        requestAnimationFrame(() => {
            card.classList.add(this.classNames.visible);
        });

        card.addEventListener('animationend', () => {
            if (typeof this.onReveal === 'function') {
                this.onReveal(li, text, this.container);
            }
            // If this was the last element in the list, trigger onEnd
            if (index === items.length - 1 && typeof this.onEnd === 'function') {
                this.onEnd(this.container);
            }
        }, { once: true });

        if (index + 1 < items.length) {
            const nextPlaceholder = items[index + 1].querySelector(`.${this.classNames.placeholder}`);
            if (nextPlaceholder) nextPlaceholder.style.display = 'inline-flex';
        }
    }
}