export const NAMESPACE = 'rs'
export const NS = NAMESPACE

export const FONTS = [
    {
        name: 'Titillium Web',
        url: '/lib/fonts/TitilliumWeb-Regular.ttf'
    }
]

export const SESSION_NAMES = {
    'fp1': browser.i18n.getMessage('sessionNameFP1'),
    'fp2': browser.i18n.getMessage('sessionNameFP2'),
    'fp3': browser.i18n.getMessage('sessionNameFP3'),
    'qualifying': browser.i18n.getMessage('sessionNameQualifying'),
    'sprintQualifying': browser.i18n.getMessage('sessionNameSprintQualifying'),
    'gp': browser.i18n.getMessage('sessionNameRace'),
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
    UPDATE_BLOCKED_RACE: 'UPDATE_BLOCKED_RACE',
    GET_DEVELOPMENT_STATUS: 'GET_DEVELOPMENT_STATUS'
}

export const DEFAULT_RACE_NAME = 'TBC'
export const DEFAULT_RACE_LOCALKEY = 'tbc-grand-prix'
export const DEFAULT_RACE_SLUG = 'tbc-grand-prix'

/**
 * Days after a race ends to block.
 * @type {number}
 */
export const RACE_END_RANGE = 6
