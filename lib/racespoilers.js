const NAMESPACE = 'rs'
const NS = NAMESPACE

const RACE_END_RANGE = 6


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
 * Session.
 *
 * @typedef {Object} Session
 * @property {string} name - An array of Todos.
 * @property {string} time - Time of session.
 *
 * @global
 */

class Sessions {

    #sessions = []

    /**
     * Sessions constructor.
     *
     * @param {Session[]} sessions - Array of `Session`.
     *
     * @returns {Sessions} - Returns `Sessions` instance.
     */
    constructor(sessions) {
        const toDate = ({ name, time }) => ({ name, time: new Date(time) }) 
        const byTime = (a, b) => a.time - b.time

        const sortedSessions = sessions.map(toDate)
                                       .sort(byTime)


        this.#sessions = this.generateSessionRange(sortedSessions)

        logger.table(this.#sessions)

        return this
    }

    /**
     * Generate start and end times for a session.
     *
     * Sessions only have a start time. To block spoilers we need a time range 
     * to block. For example: Free Practice 1 starts at Friday 8:30am and
     * spoilers should be blocked until Free Practice 2 starts at 1pm.
     *
     * @FIXME Only the current session is passed in so we can't grab the next
     * sessions start time to create a range for race. Instead we take the start
     * of the race and set the end time to `RACE_END_RANGE` days after the race.
     *
     * @param {Session[]} session - Sorted array of `Session`.
     *
     * @returns {Object} - `Session` with start and end keys added.
     */
    generateSessionRange(session) {
        const toTimeRange = ({ name, time }, i, original) => {
            const nextSession = original[i+1]
            const start = time
            const end = nextSession !== undefined
                ? nextSession.time
                : new Date(new Date(time).setDate(time.getDate() + RACE_END_RANGE))

            return { name, time, start, end }
        }

        return session.map(toTimeRange)
    }


    /**
     * Check if a time is during the session.
     *
     * @param {Date} time - `Date` to check.
     *
     * @returns {Boolean} - True if during the session.
     */
    isDuringSession(time) {
        return this.start < time && time < this.end
    }

    /**
     * Start and end of a session.
     *
     * @returns {Date[]} - Start and end `Date` in a two element array.
     */
    get range() {
        return [this.start, this.end]
    }
    
    /**
     * Session start time.
     *
     * @returns {Date} - Earliest session start time as `Date`.  
     */
    get start() {
        return new Date(Math.min(...this.#sessions.map(session => session.start)))
    }
    
    /**
     * Session end time.
     *
     * @returns {Date} - Latest session end time as `Date`.  
     */
    get end() {
        return new Date(Math.max(...this.#sessions.map(session => session.end)))
    }
}


class Race {
    constructor(name = '', { location, latitude, longitude, round, sessions }) {
        this.name = name
        this.location = location
        this.latitude = latitude
        this.longitude = longitude
        this.round = round
        this.sessions = sessions

        return this
    }

    isDuringSession(time) {
        return this.sessions.isDuringSession(time)
    }
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
     * @param {Race[]} races - Array of races.
     *
     * @returns {SpoilerManager} - Returns a `SpoilerManager` instance.
     */
    constructor(races) {
        this.races = races

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
     * Check if a time is during any race session.
     *
     * @param {Date} time - `Date` to check.
     *
     * @returns {Boolean} - True if during any race session.
     */
    isDuringRaceSession(time) {
        return this.races.some(race => race.isDuringSession(time))
    }

    /**
     * Add all reddit posts as spoilers.
     */
    addSpoilerPosts() {
        this.posts.filter(post => this.isSpoilerSubreddit(post))
                  .filter(post => this.isDuringRaceSession(Post.timestamp(post)))
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
    window.logger = new Logger('racespoilers')
}

async function init() {
    await initLogger()

    const storageItem = await browser.storage.local.get()
    logger.debug('storage: ', storageItem)

    logger.info('Init race-spoilers')
    injectFont()

    const races = [
        new Race('Italian', {
            location: 'Monza',
            latitude: 45.6169,
            longitude: 9.2825,
            round: 14,
            sessions: new Sessions([
                { name: 'fp1', time: '2021-09-10T12:30:00Z' },
                { name: 'qualifying', time: '2021-09-10T16:00:00Z' },
                { name: 'fp2', time: '2021-09-11T10:00:00Z' },
                { name: 'sprintQualifying', time: '2021-09-11T14:30:00Z' },
                { name: 'gp', time: '2021-09-12T13:00:00Z' },
            ])
        })
    ]

    const manager = new SpoilerManager(races)
}

init()
