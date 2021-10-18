import Logger from '../utilities/log.js'

const logger = new Logger('race')

const RACE_END_RANGE = 6

export class Race {
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

    getSession(time) {
        return this.sessions.getSessionDuring(time)
    }
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

export class Sessions {

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

        // logger.table(this.#sessions)

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
     * Get the `Session` that occurs during a time.
     *
     * @param {Date} time - `Date` to check.
     *
     * @returns {Session?} - Session or undefined.
     */
    getSessionDuring(time) {
        return this.#sessions.find(s => s.start < time && time < s.end)
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
