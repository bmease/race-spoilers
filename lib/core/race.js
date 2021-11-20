import Logger from '../utilities/log.js'
import {
    DEFAULT_RACE_NAME,
    DEFAULT_RACE_SLUG,
    DEFAULT_RACE_LOCALKEY,
    RACE_END_RANGE
} from '../defaults.js'

const logger = new Logger('race')


/**
 * Range.
 *
 * @typedef {Object} Range
 * @property {Date} start - JS Date for the start of the range.
 * @property {Date} end - JS Date for the end of the range.
 *
 * @global
 */

export class Race {
    constructor({
        name = DEFAULT_RACE_NAME,
        location,
        latitude,
        longitude,
        round,
        slug = DEFAULT_RACE_SLUG,
        localKey = DEFAULT_RACE_LOCALKEY,
        sessions
    }) {
        this.name = name
        this.location = location
        this.latitude = latitude
        this.longitude = longitude
        this.round = round

        this.sessions = sessions

        return this
    }

    /**
     * Gets the range of a race. From the start of Free Practice 1 to the end
     * of the Grand Prix.
     *
     * __Note__: Does not include extended blocked times.
     *
     * @returns {Range}
     */
    get range() {
        const start = new Date(this.sessions[this.firstSession])
        const end = new Date(this.sessions[this.lastSession])

        return { start, end }
    }

    /**
     * Gets the blocked range for the entire race. From the start of Free
     * Practice 1 to the end of the Grand Prix plus the blocked time.
     *
     * @returns {Range}
     */
    get blockedRange() {
        const start = this.blockedSessionRange(this.firstSession).start
        const end = this.blockedSessionRange(this.lastSession).end

        return { start, end }
    }

    /**
     * Gets the range of a race over entire days. From the beginning of the
     * day of Free Practice 1 to the end of the day of the Grand Prix.
     *
     * @returns {Range}
     */
    get dayRange() {
        const start = this.range.start
        start.setHours(0, 0, 0, 0)

        const end = this.range.end
        end.setHours(23, 59, 59, 999)

        return { start, end }
    }

    /**
     * Gets the blocked range of a race over entire days. From the beginning
     * of the day of Free Practice 1 to the end of the day of the Grand Prix
     * plus the blocked time.
     *
     * @returns {Range}
     */
    get blockedDayRange() {
        const start = this.blockedRange.start
        start.setHours(0, 0, 0, 0)

        const end = this.blockedRange.end
        end.setHours(23, 59, 59, 999)

        return { start, end }
    }

    /**
     * Gets the first session (Free Practice 1) of the race.
     *
     * @returns {string} - First session key.
     */
    get firstSession() {
        return this.orderedSessions[0].name
    }

    /**
     * Gets the last session (Grand Prix) of the race.
     *
     * @returns {string} - Last session key.
     */
    get lastSession() {
        return this.orderedSessions[this.orderedSessions.length - 1].name
    }

    /**
     * Sorts the races sessions by time.
     *
     * @returns {{ name: string, time: Date }[]} - Returns a sorted array of
     *  sessions with the properties name and time.
     */
    get orderedSessions() {
        const toDate = ([ name, time ]) => ({ name, time: new Date(time) })
        const byTime = (a, b) => a.time - b.time

        return Object.entries(this.sessions).map(toDate)
                                            .sort(byTime)
    }

    /**
     * Gets the name of the next session key or undefined if the last session.
     *
     * @returns {string?} - Key of the next session.
     */
    getNextSessionKey(name) {
        const index = this.orderedSessions.findIndex(session => session.name === name)
        const LAST_SESSION = this.orderedSessions.length - 1

        return index !== LAST_SESSION
            ? this.orderedSessions[index + 1].name
            : undefined
    }

    /**
     * Gets the name of the previous session key or undefined if the first session.
     *
     * @returns {string?} - Key of the previous session.
     */
    getPreviousSessionKey(name) {
        const index = this.orderedSessions.findIndex(session => session.name === name)
        const FIRST_SESSION = 0

        return index !== FIRST_SESSION
            ? this.orderedSessions[index - 1].name
            : undefined
    }

    /**
     * Gets the blocked time range for a session.
     *
     * Sessions only have a start time. To block spoilers we need a time range 
     * to block. For example: Free Practice 1 starts at Friday 8:30am and
     * spoilers should be blocked until Free Practice 2 starts at 1pm.
     *
     * @FIXME Only the current session is passed in so we can't grab the next
     * sessions start time to create a range for race. Instead we take the start
     * of the race and set the end time to `RACE_END_RANGE` days after the race.
     *
     * @param {string} name - Name of the session.
     * @returns {Range}
     */
    blockedSessionRange(name) {
        const time = this.sessions[name]
        const start = new Date(time)
        const nextSession = this.getNextSessionKey(name)

        const end = nextSession !== undefined
            ? new Date(this.sessions[nextSession])
            : new Date(new Date(start).setDate(start.getDate() + RACE_END_RANGE))

        return { start, end }
    }

    /**
     *
     * @param {Date} time - Time to check.
     *
     * @returns {boolean} - True if time is during the race.
     */
    isDuringRace(time) {
        const afterStart = this.blockedRange.start < time
        const beforeEnd = time < this.blockedRange.end

        return afterStart && beforeEnd
    }

    /**
     * Gets the session during a specific time.
     *
     * @param {Date} time - Time to check.
     *
     * @returns {{
     *    name: string,
     *    time: Date,
     *    blockedRange: Range,
     *    start: Date,
     *    end: Date
     * }?} - Session info or undefined.
     */
    getSessionDuring(time) {
        const toBlockedRange = ({ name, time }) => ({
            name,
            time,
            range: this.blockedSessionRange(name)}
        )

        const afterStart = s => s.range.start < time
        const beforeEnd = s => time < s.range.end
        const duringTime = s => afterStart(s) && beforeEnd(s)

        const session = this.orderedSessions.map(toBlockedRange)
                                            .find(duringTime)

        if (session === undefined) {
            return undefined
        }

        return {
            name: session.name,
            time: session.time,
            blockedRange: session.range,

            start: session.range.start,
            end: session.range.end
        }
    }
}


export default Race
