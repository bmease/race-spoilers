import Logger from '../utilities/log.js'
import { Race, Sessions } from './race.js'

const logger = new Logger('spoilers')

export class SpoilerManager {

    #races = []

    constructor() {
        this.#races = this.loadRaces()

        return this
    }

    async loadRaceCalendar() {
        const url = browser.runtime.getURL('lib/data/f1-calendar-2021.json')
        const response = await fetch(url, { mode: 'same-origin' })

        return response.json()
    }

    async loadRaces() {
        const calendar = await this.loadRaceCalendar()

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

    messageHandler(message, { tab }) {
        logger.debug(message)

        browser.tabs.sendMessage(tab.id, 'pong')

    }

}

export default SpoilerManager
