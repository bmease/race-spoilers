export const NAMESPACE = 'rs'
export const NS = NAMESPACE

export const FONTS = [
    {
        name: 'Titillium Web',
        url: '/lib/fonts/TitilliumWeb-Regular.ttf'
    }
]

export const SESSION_NAMES = {
    'fp1': 'Free Practice 1',
    'fp2': 'Free Practice 2',
    'fp3': 'Free Practice 3',
    'qualifying': 'Qualifying',
    'sprintQualifying': 'Sprint Qualifying',
    'gp': 'Race',
}

export const MESSAGE_TYPES = {
    QUERY_BLOCKED_TIME: 'QUERY_BLOCKED_TIME',
    GET_CALENDAR: 'GET_CALENDAR',
    GET_CURRENT_RACE: 'GET_CURRENT_RACE',
    GET_NEXT_RACE: 'GET_NEXT_RACE',
    GET_PREVIOUS_RACES: 'GET_PREVIOUS_RACES',
    GET_UPCOMING_RACES: 'GET_UPCOMING_RACES',
    GET_RACE: 'GET_RACE',
    SET_BLOCKED_RACE: 'SET_BLOCKED_RACE',
    SET_BLOCKED_SESSION: 'SET_BLOCKED_SESSION',
    UPDATE_BLOCKED_RACE: 'UPDATE_BLOCKED_RACE'
}

export const DEFAULT_RACE_NAME = 'TBC'
export const DEFAULT_RACE_LOCALKEY = 'tbc-grand-prix'
export const DEFAULT_RACE_SLUG = 'tbc-grand-prix'

/**
 * Days after a race ends to block.
 * @type {number}
 */
export const RACE_END_RANGE = 6
