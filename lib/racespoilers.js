/**
 * Logger Class.
 */
class Logger {

    /**
     * Logger constructor.
     *
     * @param {string} [name=''] - Name of the logger.
     *
     * @returns {Logger} - Returns a `Logger` instance.
     */
    constructor(name = '') {
        this.name = name

        return this
    }

    /**
     * Getter showing if logging is enabled or disabled. Will return instead
     * of logging if disabled.
     *
     * @returns {boolean} True when logger is disabled.
     */
    get isDisabled() {
        return false
    }

    /**
     * Wrap console functions to return without logging if the logger is disabled.
     *
     * @param {function} fn - Function to wrap.
     *
     * @returns {function} - Wrapped function.
     *
     * @private
     */
    #logWrapper(fn) {
        return function(...args) {
            if (this.isDisabled) {
                return
            }

            return fn(...args)
        }
    }

    log = this.#logWrapper(console.log)
    info = this.#logWrapper(console.info)
    debug = this.#logWrapper(console.debug)
    warn = this.#logWrapper(console.warn)
}

const NAMESPACE = 'rs'
const NS = NAMESPACE

const logger = new Logger(NS)


/**
 * Wrapper class around Reddit.com Posts.
 */
class Post {

    postElement = undefined

    #containerElement = undefined
    #overlayElement = undefined

    /**
     * @param {HTMLElement} postElement - Element of the Reddit post to wrap.
     *
     * @returns {Post} - Returns a `Post` instance.
     */
    constructor(postElement) {
        this.postElement = postElement
        logger.debug(`Init Post: ${this.url}`)

        return this
    }

    /**
     * Hide a `Post` by placing it in a container with an overlay.
     *
     * @returns {Post} - Returns the `Post` instance.
     */
    hide() {
        this.postElement.parentNode.insertBefore(this.container, this.postElement)

        this.container.appendChild(this.postElement)
        this.container.appendChild(this.overlay)
        logger.info(`Hide Post: ${this.url}`)

        return this
    }

    show() {}

    /**
     * Get or create a container to hold the post.
     *
     * @returns {HTMLElement} - Container element.
     */
    get container() {
        if (this.#containerElement !== undefined) {
            return this.#containerElement
        }

        this.#containerElement = document.createElement('div')
        this.#containerElement.className = `${NS}-container`

        return this.#containerElement
    }

    /**
     * Get or create an overlay to cover the post.
     *
     * @returns {HTMLElement} - Overlay element.
     */
    get overlay() {
        if (this.#overlayElement !== undefined) {
            return this.#overlayElement
        }

        const trackImageURL = browser.runtime.getURL('/lib/images/monaco.png')
        const trackName = 'Monaco Grand Prix'
        const trackSession = 'Qualifying'

        const template = `
            <div class="${NS}-track">
                <img class="${NS}-track__image" src="${trackImageURL}" />
                <h1 class="${NS}-track__title">${trackName}</h1>
                <h2 class="${NS}-track__session">${trackSession}</h2>
            </div>

            <button class="${NS}-button ${NS}-button--primary">
                Reveal Post
            </button>
        `

        this.#overlayElement = document.createElement('div')
        this.#overlayElement.className = `${NS}-overlay`
        this.#overlayElement.innerHTML = template

        return this.#overlayElement
    }

    get url() {
        return this.postElement.querySelector('a.title').getAttribute('href')
    }

    get subreddit() {}
    get time() {}

    get isSpoiler() {}
}


function injectFont() {
    const fontURL = browser.runtime.getURL('/lib/fonts/TitilliumWeb-Regular.ttf')
    const font = new FontFace('Titillium Web', `url('${fontURL}')`)

    document.fonts.add(font)
}

function init() {
    logger.info('Init race-spoilers')
    injectFont()

    const posts = document.querySelectorAll('.thing.link')
    logger.info(`Found ${posts.length} posts`)

    new Post(posts[0]).hide()
    new Post(posts[2]).hide()
    new Post(posts[4]).hide()
}


init()
