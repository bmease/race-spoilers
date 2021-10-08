import Logger from '../utilities/log.js'
import { Race, Sessions } from './race.js'

const logger = new Logger('spoilers')

async function loadRaceCalendar() {
    const url = browser.runtime.getURL('lib/data/f1-calendar-2021.json')
    const response = await fetch(url, { mode: 'same-origin' })

    return response.json()
}

const RACE_CALENDER = await loadRaceCalendar()

const QUERY_BLOCKED_TIME = 'QUERY_BLOCKED_TIME'
const RESPONSE_BLOCKED_TIME = 'RESPONSE_BLOCKED_TIME'


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

    queryBlockedTime({ url, time }) {
        logger.group('queryBlockedTime')
        logger.debug('url: ', url)
        logger.debug('time: ', time)

        const blockedRaces = this.#races.filter(race => race.isDuringSession(time))
        logger.debug('blockedRaces: ', blockedRaces)

        logger.groupEnd()

        // return this.#races.some(race => race.isDuringSession(time))
        return blockedRaces.length > 0
    }

    messageHandler() {
    
        const MESSAGE_TYPE_HANDLERS = {
            [QUERY_BLOCKED_TIME]: payload => this.queryBlockedTime(payload)
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
