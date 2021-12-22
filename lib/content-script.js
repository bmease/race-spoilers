const EVENTS = {
    REVEAL_RACE: 'REVEAL_RACE'
}


/**
 * Wrapper class around Reddit.com Posts.
 */
class Post {

    postElement = undefined
    emit = undefined

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
    constructor(postElement, eventHandler) {
        this.postElement = postElement
        this.emit = eventHandler

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
        console.log('RACE: ', this.race)
        return {
            'image': browser.runtime.getURL(`/lib/images/${this.race.slug}.png`),
            'title': this.race.name,
            'session': getSessionName(this.session.name),
            'datetime': this.session.time.toISOString(),
            'time': getDisplayTime(this.session.time)
        }
    }

    get template() {
        const { image, title, session, datetime, time } = this.templateLabels

        return `
            <div class="${NS}-track">
                <div class="${NS}-track__heading">
                    <img class="${NS}-track__image" src="${image}" />
                    <h1 class="${NS}-track__title">${title}</h1>
                </div>

                <div class="${NS}-track__info">
                    <h2 class="${NS}-track__session">
                        ${session}
                        <time class="${NS}-track__time" datetime="${datetime}">
                            ${time}
                        </time>

                    </h2>
                </div>

                <div class="${NS}-track__controls">
                    <button class="${NS}-button ${NS}-button--primary">
                        Reveal Post
                    </button>

                    <button class="${NS}-button ${NS}-button--primary ${NS}-button--reveal-race">
                        Reveal Race
                    </button>
                </div>
            </div>
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

        this.addRevealRacehandler()

        return this.#overlayElement
    }

    addRevealRacehandler() {
        const payload = {
            name: this.race.name,
            round: this.race.round,
            value: false
        }

        this.#overlayElement
            .querySelector(`.${NS}-button--reveal-race`)
            .addEventListener('click', () => this.emit(EVENTS.REVEAL_RACE, payload))
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
        const toPost = postEl => new Post(postEl, this.eventHandler())
        const spoilerPosts = post => this.SPOILER_SUBREDDITS.includes(post.subreddit)

        this.#trackedPosts = this.postElements.map(toPost)
                                              .filter(spoilerPosts)
    }

    /**
     * Handles events emitted by `Post`s
     *
     * @returns {function}
     *
     * @throws {Error} - Throws if the passed event doesn't have a handler.
     */
    eventHandler() {
        const EVENT_HANDLERS = {
            [EVENTS.REVEAL_RACE]: this.setBlockedRace
        }

        return async (name, payload={}) => {
            logger.groupCollapsed(
                `eventHandler: %c${name}`,
                'font-weight: bold;'
            )

            if (!Object.keys(EVENTS).includes(name)) {
                logger.error(`Event type '${name}' does not have a handler`)
                throw Error(`Event type '${name}' does not have a handler`)
            }

            logger.debug('event name: ', name)
            logger.debug('payload: ', payload)

            EVENT_HANDLERS[name](payload)

            logger.groupEnd()
        }

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

    async updateBlockedPost(post) {
        const isBlocked = await this.isPostDuringBlockedTime(post)

        const blockedAndHidden = isBlocked && post.isHidden
        const notBlockedAndVisible = !isBlocked && !post.isHidden

        // Post visiblity matches blocked state
        if (blockedAndHidden || notBlockedAndVisible) {
            return
        }

        isBlocked ? this.hidePost(post) : this.showPost(post)
    }

    async isPostDuringBlockedTime(post) {
        const response = await browser.runtime.sendMessage({
            'type': MESSAGE_TYPES.QUERY_BLOCKED_TIME,
            'payload': { 'time': post.timestamp }
        })

        const isBlocked = response !== undefined

        post.race = isBlocked ? response.race : undefined
        post.session = isBlocked ? response.session : undefined

        // logger.debug(
        //     `Post %c${post.url}%c is blocked`,
        //     'font-weight: bold;',
        //     'font-weight: normal;',
        //     post
        // )

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


    async setBlockedRace({ name, round, value }) {
        const response = await browser.runtime.sendMessage({
            'type': MESSAGE_TYPES.SET_BLOCKED_RACE,
            'payload': { name, round, value }
        })
    }

    async updateBlockedRace({ start, end  }) {
        const afterStart = post => start < post.timestamp
        const beforeEnd = post => post.timestamp < end
        const duringUpdate = post => afterStart(post) && beforeEnd(post)

        const posts = this.#trackedPosts.filter(duringUpdate)
        posts.map(post => this.updateBlockedPost(post))

        logger.debug(
            `Update %c${posts.length}%c posts from %c${start}%c to %c${end}`,
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;',
            posts
        )
    }

    messageHandler() {
        const MESSAGE_TYPE_HANDLERS = {
            [MESSAGE_TYPES.UPDATE_BLOCKED_RACE]: this.updateBlockedRace
        }
    
        return ({ type, payload={} }, sender) => {
            if (type === undefined) {
                logger.error('Missing message type')
                throw Error('Missing message type')
            }
    
            logger.groupCollapsed(
                `messageHandler: %c${type}`,
                'font-weight: bold;'
            )
    
            logger.debug('payload: ', payload)
            logger.debug('sender: ', sender)
    
            if (!Object.keys(MESSAGE_TYPE_HANDLERS).includes(type)) {
                logger.error(`Message type '${type}' does not have a handler`)
                throw Error(`Message type '${type}' does not have a handler`)
            }
    
            const handlerFn = MESSAGE_TYPE_HANDLERS[type]
            handlerFn.bind(this)(payload)
    
            logger.groupEnd()
        }
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


/**
 * Dynamically load a JavaScript module.
 *
 * Content scripts can not load JavaScript modules unless they are dynamically
 * imported. A modules file path needs to be added to the `web_accessible_resources`
 * in the manifest.
 *
 * @param {String} url - URL of the module to load.
 * @param {String[]} exportKeys - List of module exports to add to `window`.
 *
 * @returns {Object} - Returns the loaded module.
 */
async function dynamicImport(url, exportKeys=[]) {
    const src = browser.runtime.getURL(url)

    // If the logger hasn't been setup just ignore logging
    const importLogger = window.logger !== undefined
        ? logger
        : { error: () => {}, debug: () => {} }

    let module

    try {
        module = await import(src)
    } catch (error) {
        importLogger.error(`Unable to import %c${url}:`, 'font-weight: bold;', error)
    }

    importLogger.debug(`Dynamic import %c${url}`, 'font-weight: bold;')

    exportKeys.map(key => window[key] = module[key])
    importLogger.debug(
        `Add module exports from %c${url}%c to window`,
        'font-weight: bold;',
        'font-weight: normal;',
        exportKeys
    )

    return module
}

async function init() {
    const { default: Logger } = await dynamicImport('/lib/utilities/log.js')
    window.logger = new Logger('content-script')

    logger.info('Init race-spoilers')

    await dynamicImport('/lib/utilities/utilities.js', [
        'getSessionName',
        'getDisplayTime',
        'injectFonts'
    ])

    await dynamicImport('/lib/defaults.js', [
        'NS',
        'FONTS',
        'MESSAGE_TYPES'
    ])

    injectFonts()

    const manager = new PostManager()

    browser.runtime.onMessage.addListener(manager.messageHandler())

    const port = browser.runtime.connect({ name: 'content-script' })
    port.onMessage.addListener(manager.messageHandler())

    await manager.hideBlockedPosts()
}


init()
