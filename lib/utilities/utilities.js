import { SESSION_NAMES } from '../defaults.js'


export function getSessionName(name) {
    if (!Object.keys(SESSION_NAMES).includes(name)) {
        return name
    }

    return SESSION_NAMES[name]
}

export function getDisplayTime(time) {
    return new Intl.DateTimeFormat('default', {
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
    }).format(time)
}
