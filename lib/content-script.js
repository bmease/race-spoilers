const NAMESPACE = 'rs'
const NS = NAMESPACE

const FONTS = [
    {
        name: 'Titillium Web',
        url: '/lib/fonts/TitilliumWeb-Regular.ttf'
    }
]


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

    static timestamp(post) {
        return new this(post).timestamp
    }

    static url(post) {
        return new this(post).url
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

    /**
     * Get the permalink url for the post.
     *
     * @returns {string} - Permalink url.
     */
    get url() {
        return this.postElement.getAttribute('data-permalink')
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
class PostManager {
    SPOILER_SUBREDDITS = [
        'formula1',
        'formuladank'
    ]

    #hiddenPosts = new Set()
    #spoilerPosts = new Set()

    #trackedPosts = []
    #blockedPosts = []

    /**
     * SpoilerManager constructor.
     *
     * @returns {PostManager} - Returns a `SpoilerManager` instance.
     */
    constructor() {
        this.addTrackedPosts()
        logger.info(
            `Tracking %c${this.#trackedPosts.length}%c posts`,
            'font-weight: bold;',
            'font-weight: normal;',
            this.#trackedPosts
        )

        return this
    }

    addTrackedPosts() {
        const toPost = postEl => new Post(postEl)
        const spoilerPosts = post => this.SPOILER_SUBREDDITS.includes(post.subreddit)

        this.#trackedPosts = this.postElements.map(toPost)
                                              .filter(spoilerPosts)
    }

    async hideBlockedPosts() {
        this.#trackedPosts.map(post => this.hideBlockedPost(post))
    }

    async hideBlockedPost(post) {
        const isBlocked = await this.isPostDuringBlockedTime(post)

        if (isBlocked) {
            this.hidePost(post)
        }
    }

    async isPostDuringBlockedTime(post) {
        const response = await browser.runtime.sendMessage({
            'type': 'QUERY_BLOCKED_TIME',
            'payload': {
                'url': post.url,
                'time': post.timestamp
            }
        })

        logger.debug(`Post ${post.url} is ${response ? 'blocked' : 'not blocked'}`)

        return response
    }


    /**
     * Hide a reddit post.
     *
     * @param {Post} post - Post to hide.
     */
    hidePost(post) {
        post.hide()
        logger.info(`Hide post: ${post.url}`)
    }

    /**
     * Show a reddit post.
     *
     * @param {Post} post - Post to show.
     */
    showPost(post) {
        post.show()
        logger.info(`Show post: ${post.url}`)
    }

    /**
     * Get a list of reddit posts.
     *
     * __Note__: Promoted posts are not selected.
     *
     * @returns {HTMLElement[]} - Array of reddit posts.
     */
    get postElements() {
        return Array.from(document.querySelectorAll(this.SUBREDDIT_POST_QUERY))
    }
}


function injectFonts() {
    FONTS.map(({ name, url }) => injectFont(name, url))
}

function injectFont(name, url) {
    const fontURL = browser.runtime.getURL(url)
    const font = new FontFace(name, `url('${fontURL}')`)

    document.fonts.add(font)

    logger.info(`Inject font %c${name}`, 'font-weight: bold;')
}


/**
 * Dynamically load the logging module.
 *
 * Content scripts can not load javascript modules unless they are dynamically
 * imported. The logging module is added to the `web_accessible_resources`
 * in the manifest. We then instanciate the Logger and attach it globally to
 * window.
 */
async function initLogger() {
    const src = browser.runtime.getURL('/lib/utilities/log.js')
    const module = await import(src)

    window.Logger = module.default
    window.logger = new Logger('content-script')
}

function handleMessage(message) {
    logger.debug(message)
}

async function init() {
    await initLogger()
    logger.info('Init race-spoilers')

    const storageItem = await browser.storage.local.get()
    logger.table('storage: ', storageItem)

    injectFonts()

    const manager = new PostManager()
    await manager.hideBlockedPosts()
    // browser.runtime.onMessage.addListener(manager.messageHandler)
    // browser.runtime.onMessage.addListener((message, options) => manager.messageHandler(message, options))
    // browser.runtime.onMessage.addListener((message, sender) => manager.messageHandler(message, sender))
}

init()
