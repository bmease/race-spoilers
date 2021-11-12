import Logger from '../utilities/log.js'
import { Race, Sessions } from './race.js'
import { MESSAGE_TYPES } from '../defaults.js'

const logger = new Logger('spoilers')


export class SpoilerManager {

    #races = []

    constructor() {
        return this
    }

    async load() {
        await this.loadRacesFromCalendar()
        logger.debug(
            `Load %c${this.#races.length}%c races from calendar`,
            'font-weight: bold;',
            'font-weight: normal',
            this.#races
        )

        await this.storeRaces()
        
        await this.loadRacesFromStorage()
        
        logger.debug(
            `Load %c${this.#races.length}%c races from storage`,
            'font-weight: bold;',
            'font-weight: normal',
            this.#races
        )
    }

    async loadRaceCalendar() {
        const url = browser.runtime.getURL('lib/data/f1-calendar-2021.json')
        const response = await fetch(url, { mode: 'same-origin' })

        return response.json()
    }

    async loadRacesFromCalendar() {
        const calendar = await this.loadRaceCalendar()
        this.#races = this.racesFromObj(calendar.races)
    }
    
    racesFromObj(obj) {
        const toSessions = ([name, time]) => ({ name, time })
        const objToSessions = o => new Sessions(Object.entries(o).map(toSessions))
        const toRace = race => new Race(race.name, {
                location: race.location,
                latitude: race.latitude,
                longitude: race.longitude,
                round: race.round,
                sessions: objToSessions(race.sessions),
        })

        return obj.map(toRace)
    }

    async storeRaces() {
        const races = this.#races.map(race => race.toObject())

        await browser.storage.local.set({ races })
        logger.debug('Store races', races)
    }

    async loadRacesFromStorage() {
        const storage = await browser.storage.local.get()

        const toRace = race => new Race(race.name, {
                location: race.location,
                latitude: race.latitude,
                longitude: race.longitude,
                round: race.round,
                sessions: new Sessions(race.sessions),
        })

        this.#races = storage.races.map(toRace)
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
        const race = this.#races.find(race => race.isDuringSession(time))

        return race
            ? { race, session: race.getSession(time) }
            : undefined
    }

    getCalendar() {
        return this.#races
    }

    getNextRace() {
        const now = new Date()
        return this.#races.find(race => (race.sessions.start <= now && now <= race.sessions.end) || (now < race.start))
                          .toObject()
    }

    getPreviousRaces() {
        const now = new Date()
        return this.#races.filter(race => race.sessions.end < now)
                          .map(race => race.toObject())
    }

    messageHandler() {
    
        const MESSAGE_TYPE_HANDLERS = {
            [MESSAGE_TYPES.QUERY_BLOCKED_TIME]: p => this.queryBlockedTime(p),
            [MESSAGE_TYPES.GET_CALENDAR]: p => this.getCalendar(p),
            [MESSAGE_TYPES.GET_NEXT_RACE]: p => this.getNextRace(p),
            [MESSAGE_TYPES.GET_PREVIOUS_RACES]: p => this.getPreviousRaces(p)
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

}

export default SpoilerManager
