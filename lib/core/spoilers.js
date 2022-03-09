import Logger from '../utilities/log.js'
import Race from './race.js'
import { MESSAGE_TYPES } from '../defaults.js'
import { IS_DEVELOPMENT } from '../utilities/utilities.js'

const logger = new Logger('spoilers')


/* Inject fake race data for testing */
const INJECT_RACES = IS_DEVELOPMENT

/* Races to inject if `INJECT_RACES` is set */
const INJECT_RACES_DATA = [
    {
        name: 'Fake Race',
        location: 'Fakeville Alafakama',
        latitude: 0.0,
        longitude: 0.0,
        round: 98,
        slug: 'bahrain-grand-prix',
        localKey: 'bahrain-grand-prix',
        sessions: {
            'fp1': new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
            'qualifying': new Date().toISOString(),
            'gp': new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
        }
    },
    {
        name: 'Upcoming Fake Race',
        location: 'La Fakalalma',
        latitude: 0.0,
        longitude: 0.0,
        round: 99,
        slug: 'australian-grand-prix',
        localKey: 'australian-grand-prix',
        sessions: {
            'fp1': new Date(new Date().setDate(new Date().getDate() + 8)).toISOString(),
            'qualifying': new Date(new Date().setDate(new Date().getDate() + 9)).toISOString(),
            'gp': new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
        }
    },
    {
        name: 'Previous Fake Race',
        location: 'Fakanco',
        latitude: 0.0,
        longitude: 0.0,
        round: 97,
        slug: 'monaco-grand-prix',
        localKey: 'monaco-grand-prix',
        sessions: {
            'fp1': new Date(new Date().setDate(new Date().getDate() - 8)).toISOString(),
            'qualifying': new Date(new Date().setDate(new Date().getDate() - 9)).toISOString(),
            'gp': new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
        }
    }
]

/**
 *
 * Race calendar JSON format for sessions. Key is the name of the session
 * and value is the date of the session.
 *
 * @typedef {Object.<string, date>} RaceCalendarSessions
 *
 * @global
 */

/**
 * Race calendar JSON format.
 *
 * @typedef RaceCalendar
 * @type {Object}
 * @property {string} name - Name of the race.
 * @property {string} location - Location of the race.
 * @property {number} latitude - latitude of the race.
 * @property {number} longitude - longitude of the race.
 * @property {number} round - Round of the race season.
 * @property {string} slug
 * @property {string} localKey
 * @property {RaceCalendarSessions[]} sessions
 *
 * @global
 */

export class SpoilerManager {

    #races = []

    ports = {}

    constructor() {
        return this
    }

    /**
     * Create a `SpoilerManager` and install the races from the calendar.
     *
     * @returns {SpoilerManager} - The `SpoilerManager` instance.
     */
    static async install() {
        const manager = new SpoilerManager()

        await manager.loadRacesFromCalendar()
        await manager.storeRaces()

        return manager
    }

    /**
     * Create a `SpoilerManager` and load the races from storage.
     *
     * @returns {SpoilerManager} - The `SpoilerManager` instance.
     */
    static async load() {
        const manager = new SpoilerManager

        const storage = await browser.storage.local.get()
        if (storage.races === undefined) {
            logger.warn('Tried loading races from empty storage!')
            await manager.loadRacesFromCalendar()
            await manager.storeRaces()
        }

        await manager.loadRacesFromStorage()

        return manager
    }

    async loadRaceCalendar() {
        const currentYear = new Date().getFullYear()
        const url = browser.runtime.getURL(`lib/data/f1-calendar-${currentYear}.json`)
        const response = await fetch(url, { mode: 'same-origin' })

        return response.json()
    }

    async loadRacesFromCalendar() {
        const calendar = await this.loadRaceCalendar()

        this.#races = calendar.races.map(race => new Race(race))
        logger.debug(
            `Load %c${this.#races.length}%c races from calendar`,
            'font-weight: bold;',
            'font-weight: normal',
            this.#races
        )

        if (INJECT_RACES) {
            this.#races = [...this.#races, ...INJECT_RACES_DATA.map(race => new Race(race))]
            logger.debug(
                `Inject %c${INJECT_RACES_DATA.length}%c races`,
                'font-weight: bold;',
                'font-weight: normal',
                this.#races
            )
        }
    }
    
    async storeRaces() {
        await browser.storage.local.set({ races: this.#races })
        logger.debug(
            `Save %c${this.#races.length}%c races in storage`,
            'font-weight: bold;',
            'font-weight: normal',
            this.#races
        )
    }

    async loadRacesFromStorage() {
        const storage = await browser.storage.local.get()

        this.#races = storage.races.map(race => new Race(race))
        logger.debug(
            `Load %c${this.#races.length}%c races from storage`,
            'font-weight: bold;',
            'font-weight: normal',
            this.#races
        )
    }

    /**
     * BlockedRaceSession.
     *
     * @typedef {Object} BlockedRaceSession
     * @property {Race} race - Race that is blocked.
     * @property {Session} session - Session of the race that is blocked.
     *
     * @global
     */

    /**
     * Find which race and session blocks a specific time.
     *
     * @param {Object} params - Message params.
     * @param {Date} params.time - Time to check.
     *
     * @returns {BlockedRaceSession?} - Race and Session that is blocked.
     */
    queryBlockedTime({ time }) {
        const race = this.blockedRaces.find(race => race.isDuringRace(time))

        if (race === undefined) {
            return undefined
        }

        const session = race.getSessionDuring(time)
        const sessionIsBlocked = race.blockedSessions.includes(session.name)

        if (!sessionIsBlocked) {
            return undefined
        }

        return { race, session: race.getSessionDuring(time) }
    }

    /**
     * Get all races on the calendar.
     *
     * @returns {Race[]}
     */
    getCalendar() {
        return this.#races
    }

    /**
     * Get the current race happening now.
     *
     * @returns {Race}
     */
    getCurrentRace() {
        const now = new Date()

        const afterRaceStart = race => race.dayRange.start <= now
        const afterRaceEnd = race => now <= race.dayRange.end
        const currentRace = race => afterRaceStart(race) && afterRaceEnd(race)

        return this.#races.find(currentRace)
    }

    /**
     * Get the current or next race.
     *
     * @returns {Race}
     */
    getNextRace() {
        if (this.getCurrentRace()) {
            return this.getCurrentRace()
        }

        const now = new Date()
        const nextRace = race => now < race.range.start

        return this.#races.find(nextRace)
    }

    /**
     * Get all races before the current round.
     *
     * @returns {Race[]}
     */
    getPreviousRaces() {
        const nextRace = this.getNextRace()

        if (nextRace === undefined) {
            return this.#races
        }

        return this.#races.filter(race => race.round < nextRace.round)
    }

    /**
     * Get all races after the current round.
     *
     * @returns {Race[]}
     */
    getUpcomingRaces() {
        const nextRace = this.getNextRace()

        if (nextRace === undefined) {
            return []
        }

        return this.#races.filter(race => race.round > nextRace.round)
    }

    /**
     * Get a race.
     *
     * @param {Object} params - Handler params.
     * @param {string} name - Name of the race.
     * @param {Number} round - Round of the race.
     *
     * @returns {Race} - Race.
     *
     * @throws {Error} - Throws `Error` if a race is not found.
     */
    getRace({ name, round }) {
        const findRound = race => race.round === Number.parseInt(round, 10)
        const findName = race => race.name === name
        const findRace = race => findRound(race) && findName(race)
        const RACE_NOT_FOUND = -1

        const index = this.#races.findIndex(findRace)

        if (index === RACE_NOT_FOUND) {
            logger.error(
                `Unable to get race %c${name}%c round %c${round}`,
                'font-weight: bold;', 'font-weight: normal;',
                'font-weight: bold;'
            )
            throw Error(`Unable to get race using params name: ${name}, round: ${round}`)
        }

        return this.#races[index]
    }

    /**
     * Set whether or not a race is blocked.
     *
     * __Note__: If unblocking a race, all `blockedSessions` are removed.
     *
     * @param {Object} params - Handler params.
     * @param {string} name - Name of the race.
     * @param {Number} round - Round of the race.
     * @param {Boolean} value - Value to set blocked.
     */
    setBlockedRace({ name, round, value }) {
        logger.groupCollapsed('setBlockedRace')

        const race = this.getRace({ name, round })
        const setUnblocked = race.blocked === true && value === false
        const now = new Date()
        const isAfterNow = time => now < time

        // Don't block sessions in the future
        if (isAfterNow(race.blockedRange.end) && setUnblocked) {
            race.blocked = true
            race.blockedSessions = race.orderedSessions
                                       .filter(({ time }) => isAfterNow(time))
                                       .map(({ name}) => name)

            logger.debug(
                `Not blocking %c${race.blockedSessions.length}%c future sessions`,
                'font-weight: bold;', 'font-weight: normal;',
                race.blockedSessions
            )
        }

        // Block races that have already occurred
        else if (setUnblocked) {
            race.blocked = false
            race.blockedSessions = []
        }

        // Unblock races
        else if (value === true) {
            race.blocked = true
            race.blockedSessions = race.orderedSessions.map(({ name}) => name)
        }

        logger.info(
            `Set %c${name}%c round %c${round}%c to %c${value}`,
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;',
            race
        )

        logger.debug('races:', this.#races)
        const type = MESSAGE_TYPES.UPDATE_BLOCKED_RACE
        const payload = {
            start: race.blockedRange.start,
            end: race.blockedRange.end
        }

        this.postMessage({ type, payload })

        logger.groupEnd()
    }

    /**
     * Set whether or not a race session is blocked.
     *
     * @param {Object} params - Handler params.
     * @param {String} name - Name of the race.
     * @param {Number} round - Round of the race.
     * @param {String} session - Session of the race.
     * @param {Boolean} value - Value to set blocked.
     */
    setBlockedSession({ name, round, session, value }) {
        const race = this.getRace({ name, round })
        const isBlocked = race.blockedSessions.includes(session)

        // Add session
        if (value === true && !isBlocked) {
            race.blockedSessions.push(session)
        }

        // Remove session
        if (value === false && isBlocked) {
            race.blockedSessions = race.blockedSessions.filter(s => s !== session)
        }

        logger.info(
            `Set %c${name}%c %c${session}%c to %c${value}`,
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;',
            race
        )

        const type = MESSAGE_TYPES.UPDATE_BLOCKED_RACE
        const payload = {
            start: race.blockedRange.start,
            end: race.blockedRange.end
        }

        this.postMessage({ type, payload })
    }

    /**
     * Get the web extension's install type.
     *
     * @returns {String} - Install type.
     */
    getInstallType() {
        return logger.installType
    }


    /**
     * Get the web extension development status.
     *
     * @returns {boolean} - True if extension is in development.
     */
    async getDevelopmentStatus() {
        return IS_DEVELOPMENT
    }

    connectionListener() {
        return port => {
            logger.debug(port)
            this.ports[port.sender.tab.id] = port

            const name = port.name ? port.name : `tab ${port.sender.tab.id}`

            port.onMessage.addListener(this.messageHandler())

            logger.debug(
                `New connection from %c${name}`,
                'font-weight: bold',
                port
            )
        }
    }

    postMessage(message) {
        Object.values(this.ports).map(port => port.postMessage(message))
    }

    messageHandler() {
    
        const MESSAGE_TYPE_HANDLERS = {
            [MESSAGE_TYPES.QUERY_BLOCKED_TIME]: p => this.queryBlockedTime(p),
            [MESSAGE_TYPES.GET_CALENDAR]: p => this.getCalendar(p),
            [MESSAGE_TYPES.GET_CURRENT_RACE]: p => this.getCurrentRace(p),
            [MESSAGE_TYPES.GET_NEXT_RACE]: p => this.getNextRace(p),
            [MESSAGE_TYPES.GET_PREVIOUS_RACES]: p => this.getPreviousRaces(p),
            [MESSAGE_TYPES.GET_UPCOMING_RACES]: p => this.getUpcomingRaces(p),
            [MESSAGE_TYPES.GET_RACE]: p => this.getRace(p),
            [MESSAGE_TYPES.SET_BLOCKED_RACE]: p => this.setBlockedRace(p),
            [MESSAGE_TYPES.SET_BLOCKED_SESSION]: p => this.setBlockedSession(p),
            [MESSAGE_TYPES.GET_DEVELOPMENT_STATUS]: p => this.getDevelopmentStatus(p)
        }
    
        return async ({ type, payload={} }, sender) => {
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
            const response = handlerFn(payload)
            logger.debug('response: ', response)
    
            logger.groupEnd()
    
            return response
        }
    }

    get blockedRaces() {
        return this.#races.filter(race => race.blocked)
    }

}

export default SpoilerManager
