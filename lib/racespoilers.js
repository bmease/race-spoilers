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

    table = this.#logWrapper(console.table)
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

        return this
    }

    static subreddit(post) {
        return new this(post).subreddit
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

    /**
     * Show a hidden `Post` by removing the container and overlay.
     *
     * @returns {Post} - Returns the `Post` instance.
     */
    show() {
        this.container.parentNode.insertBefore(this.postElement, this.container)
        this.container.remove()
        logger.info(`Show Post: ${this.url}`)

        return this
    }

    revealHandler() {
        logger.debug(`Reveal Post ${this.url}`)
        this.show()
    }

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

        this.#overlayElement
            .querySelector(`.${NS}-button`)
            .addEventListener('click', () => this.revealHandler())

        return this.#overlayElement
    }

    get url() {
        return this.postElement.querySelector('a.title').getAttribute('href')
    }

    /**
     * Get the subreddit for the post.
     *
     * @returns {string} - Subreddit name.
     */
    get subreddit() {
        return this.postElement.getAttribute('data-subreddit')
    }

    /**
     * Get the timestamp for the post.
     *
     * @returns {Date} - Post timestamp as Date.
     */
    get timestamp() {
        const element = this.postElement.querySelector('time')
        return new Date(element.getAttribute('datetime'))
    }

    get isSpoiler() {}
}


/**
 * SpoilerManager Class
 */
class SpoilerManager {
    SPOILER_SUBREDDITS = [
        'formula1',
        'formuladank'
    ]

    #hiddenPosts = new Set()
    #spoilerPosts = new Set()

    /**
     * SpoilerManager constructor.
     *
     * @returns {SpoilerManager} - Returns a `SpoilerManager` instance.
     */
    constructor() {
        this.addSpoilerPosts()
        this.hideAllPosts()

        return this
    }

    /**
     * Check if a `Post` is in a subreddit that has spoilers.
     *
     * @param {Post} post - Post to check subreddit.
     *
     * @returns {Boolean} - True if post is in a spoiler subreddit.
     */
    isSpoilerSubreddit(post) {
        return this.SPOILER_SUBREDDITS.includes(Post.subreddit(post))
    }

    /**
     * Add all reddit posts as spoilers.
     */
    addSpoilerPosts() {
        this.posts.filter(post => this.isSpoilerSubreddit(post))
                  .map(post => this.addSpoilerPost(post))
    }

    /**
     * Add a reddit post as a spoiler.
     *
     * @param {Post} post - Post to add.
     */
    addSpoilerPost(post) {
        this.#spoilerPosts.add(new Post(post))
    }

    /**
     * Hide a reddit post.
     *
     * @param {Post} post - Post to hide.
     */
    hidePost(post) {
        this.#spoilerPosts.delete(post)
        this.#hiddenPosts.add(post)
        post.hide()
    }

    /**
     * Show a reddit post.
     *
     * @param {Post} post - Post to show.
     */
    showPost(post) {
        this.#hiddenPosts.delete(post)
        this.#spoilerPosts.add(post)
        post.show()
    }

    /**
     * Hide all spoiler posts.
     *
     * @returns {SpoilerManager} - Returns the `SpoilerManager` instance.
     */
    hideAllPosts() {
        this.#spoilerPosts.forEach(post => this.hidePost(post))

        return this
    }

    /**
     * Show all hidden posts.
     *
     * @returns {SpoilerManager} - Returns the `SpoilerManager` instance.
     */
    showAllPosts() {
        this.#hiddenPosts.forEach(post => this.showPost(post))

        return this
    }

    /**
     * Get a list of reddit posts.
     *
     * @returns {Array} - Array of reddit posts.
     */
    get posts() {
        return Array.from(document.querySelectorAll('.thing.link'))
    }
}


function injectFont() {
    const fontURL = browser.runtime.getURL('/lib/fonts/TitilliumWeb-Regular.ttf')
    const font = new FontFace('Titillium Web', `url('${fontURL}')`)

    document.fonts.add(font)
}

function init() {
    logger.info('Init race-spoilers')
    injectFont()

    const manager = new SpoilerManager()
}


init()
