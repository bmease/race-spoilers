import Logger from '../utilities/log.js'
import { Race, Sessions } from './race.js'
import { MESSAGE_TYPES } from '../defaults.js'

const logger = new Logger('spoilers')

async function loadRaceCalendar() {
    const url = browser.runtime.getURL('lib/data/f1-calendar-2021.json')
    const response = await fetch(url, { mode: 'same-origin' })

    return response.json()
}

const RACE_CALENDER = await loadRaceCalendar()


export class SpoilerManager {

    #races = []

    constructor() {
        this.#races = this.loadRaces()

        logger.debug('this: ', this)
        return this
    }

    loadRaces() {
        const calendar = RACE_CALENDER

        const toSessions = ([name, time]) => ({ name, time })
        const objToSessions = obj => new Sessions(Object.entries(obj).map(toSessions))

        const toRace = race => new Race(race.name, {
                location: race.location,
                latitude: race.latitude,
                longitude: race.longitude,
                round: race.round,
                sessions: objToSessions(race.sessions),
        })

        return calendar.races.map(toRace)
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

    messageHandler() {
    
        const MESSAGE_TYPE_HANDLERS = {
            [MESSAGE_TYPES.QUERY_BLOCKED_TIME]: payload => this.queryBlockedTime(payload),
            [MESSAGE_TYPES.GET_CALENDAR]: payload => this.getCalendar(payload),
            [MESSAGE_TYPES.GET_NEXT_RACE]: payload => this.getNextRace(payload)
        }
    
        return async (message, sender) => {
            logger.group('messageHandler')
    
            logger.debug('message: ', message)
            logger.debug('sender: ', sender)
    
            if (message.type === undefined) {
                logger.error('Missing message type')
                throw Error('Missing message type')
            }
    
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
