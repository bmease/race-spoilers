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

    race = undefined
    session = undefined

    #containerElement = undefined
    #overlayElement = undefined

    #hidden = false

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
        this.#hidden = true

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
        this.#hidden = false

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

    get templateLabels() {
        const SESSION_NAMES = {
            'fp1': 'Free Practice 1',
            'fp2': 'Free Practice 2',
            'fp3': 'Free Practice 3',
            'qualifying': 'Qualifying',
            'sprintQualifying': 'Sprint Qualifying',
            'gp': 'Race',
        }

        const session = Object.keys(SESSION_NAMES).includes(this.session.name)
            ? SESSION_NAMES[this.session.name]
            : this.session.name

        return {
            'image': browser.runtime.getURL('/lib/images/monaco.png'),
            'title': this.race.name,
            'session': session
        }
    }

    get template() {
        const { image, title, session } = this.templateLabels

        return `
            <div class="${NS}-track">
                <img class="${NS}-track__image" src="${image}" />
                <h1 class="${NS}-track__title">${title}</h1>
                <h2 class="${NS}-track__session">${session}</h2>
            </div>

            <button class="${NS}-button ${NS}-button--primary">
                Reveal Post
            </button>
        `
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

        this.#overlayElement = document.createElement('div')
        this.#overlayElement.className = `${NS}-overlay`
        this.#overlayElement.innerHTML = this.template

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

    get isHidden() {
        return this.#hidden
    }
}



/**
 * SpoilerManager Class
 */
class PostManager {
    SPOILER_SUBREDDITS = [
        'formula1',
        'formuladank'
    ]

    SUBREDDIT_POST_QUERY = '.thing.link:not(.promoted)'

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
            'payload': { 'time': post.timestamp }
        })

        const isBlocked = response !== undefined

        if (isBlocked) {
            post.race = response.race
            post.session = response.session

            logger.info(
                `Post %c${post.url}%c is blocked`,
                'font-weight: bold;',
                'font-weight: normal;',
                post
            )
        }

        return isBlocked
    }


    /**
     * Hide a reddit post.
     *
     * @param {Post} post - Post to hide.
     */
    hidePost(post) {
        post.hide()
        logger.info(`Hide post: %c${post.url}`, 'font-weight: bold;')
    }

    /**
     * Show a reddit post.
     *
     * @param {Post} post - Post to show.
     */
    showPost(post) {
        post.show()
        logger.info(`Show post: %c${post.url}`, 'font-weight: bold;')
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

    logger.info('Init logger')
}

async function init() {
    await initLogger()
    logger.info('Init race-spoilers')

    // const storageItem = await browser.storage.local.get()
    // logger.table('storage: ', storageItem)

    injectFonts()

    const manager = new PostManager()
    await manager.hideBlockedPosts()
    // await manager.addSpoilerPosts()
    // manager.hideAllPosts()
    // browser.runtime.onMessage.addListener(manager.messageHandler)
    // browser.runtime.onMessage.addListener((message, options) => manager.messageHandler(message, options))
    // browser.runtime.onMessage.addListener((message, sender) => manager.messageHandler(message, sender))
}

init()
