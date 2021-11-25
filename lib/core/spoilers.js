import Logger from '../utilities/log.js'
import Race from './race.js'
import { MESSAGE_TYPES } from '../defaults.js'

const logger = new Logger('spoilers')

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

    constructor() {
        return this
    }

    async load() {
        await this.loadRacesFromCalendar()
        await this.storeRaces()
        await this.loadRacesFromStorage()
    }

    async loadRaceCalendar() {
        const url = browser.runtime.getURL('lib/data/f1-calendar-2021.json')
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

        return { race, session: race.getSessionDuring(time) }
    }

    getCalendar() {
        return this.#races
    }

    getCurrentRace() {
        const now = new Date()

        const afterRaceStart = race => race.dayRange.start <= now
        const afterRaceEnd = race => now <= race.dayRange.end
        const currentRace = race => afterRaceStart(race) && afterRaceEnd(race)

        return this.#races.find(currentRace)
    }

    getNextRace() {
        if (this.getCurrentRace()) {
            return this.getCurrentRace()
        }

        const now = new Date()
        const nextRace = race => now < race.range.start

        return this.#races.find(nextRace)
    }

    getPreviousRaces() {
        const nextRace = this.getNextRace()

        if (nextRace === undefined) {
            return this.#races
        }

        return this.#races.filter(race => race.round < nextRace.round)
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
        const findRound = race => race.round === round
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
        const race = this.getRace({ name, round })

        race.blocked = value
        if (value === false) {
            race.blockedSessions = []
        }

        logger.info(
            `Set %c${name}%c round %c${round}%c to %c${value}`,
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;', 'font-weight: normal;',
            'font-weight: bold;',
            race
        )
    }

    // getRemainingRaces() {
    //     const now = new Date()
    //     return this.#races.filter(race => race.sessions)
    // }

    messageHandler() {
    
        const MESSAGE_TYPE_HANDLERS = {
            [MESSAGE_TYPES.QUERY_BLOCKED_TIME]: p => this.queryBlockedTime(p),
            [MESSAGE_TYPES.GET_CALENDAR]: p => this.getCalendar(p),
            [MESSAGE_TYPES.GET_NEXT_RACE]: p => this.getNextRace(p),
            [MESSAGE_TYPES.GET_PREVIOUS_RACES]: p => this.getPreviousRaces(p),
            [MESSAGE_TYPES.GET_RACE]: p => this.getRace(p),
            [MESSAGE_TYPES.SET_BLOCKED_RACE]: p => this.setBlockedRace(p)
            // [MESSAGE_TYPES.GET_REMAINING_RACES]: p => this.getRemainingRaces(p)
        }
    
        return async (message, sender) => {
            if (message.type === undefined) {
                logger.error('Missing message type')
                throw Error('Missing message type')
            }
    
            logger.groupCollapsed(
                `messageHandler: %c${message.type}`,
                'font-weight: bold;'
            )
    
            logger.debug('payload: ', message.payload)
            logger.debug('sender: ', sender)
    
            if (!Object.keys(MESSAGE_TYPE_HANDLERS).includes(message.type)) {
                logger.error(`Message type '${message.type}' does not have a handler`)
                throw Error(`Message type '${message.type}' does not have a handler`)
            }
    
            const handlerFn = MESSAGE_TYPE_HANDLERS[message.type]
            const response = handlerFn(message.payload)
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
