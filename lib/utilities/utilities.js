import { SESSION_NAMES } from '../defaults.js'


export function getSessionName(name) {
    if (!Object.keys(SESSION_NAMES).includes(name)) {
        return name
    }

    return SESSION_NAMES[name]
}
