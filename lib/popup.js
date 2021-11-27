import { NS, MESSAGE_TYPES } from './defaults.js'
import { getSessionName, getDisplayTime } from './utilities/utilities.js'
import Logger from './utilities/log.js'

const logger = new Logger('popup')

const POPUP_CONTAINER_SELECTOR = '.popup-container'

function sessionTableEl(sessions) {
    const now = new Date()
    const isUpcoming = time => now < time
    const rowDisabledClass = session => isUpcoming(session.start)
        ? `${NS}-session__row--disabled`
        : ''

    const li = sessions.map(session => `
        <tr class="${NS}-session__row ${rowDisabledClass(session)}">
            <td class="${NS}-session__item ${NS}-session__item--name">
                ${getSessionName(session.name)}
            </td>
            <td class="${NS}-session__item ${NS}-session__item--time">
                ${getDisplayTime(session.start)}
            </td>
            <td class="${NS}-session__item ${NS}-session__item--blocked">
                <input type="checkbox" ${session.blocked ? 'checked' : ''} ${isUpcoming ? 'disabled': ''} />
            </td>
        </tr>
    `).join('\n')

    return `
        <table class="${NS}-session">
            <tr class="${NS}-session__row ${NS}-session__row--heading">
                <th class="${NS}-session__item">Session</th>
                <th class="${NS}-session__item">Time</th>
                <th class="${NS}-session__item">Blocked</th>
            </tr>
            ${li}
        </table>
    `
}

async function nextRaceEl() {
    const race = await browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.GET_NEXT_RACE,
        'payload': {}
    })

    const sessions = Object.entries(race.sessions)
                           .map(([name, start]) => ({ name, start: new Date(start) }))

    return `
        <div>
            <h1>${race.name} ${race.blocked}</h1>
            <h2>${race.location}</h2>
            ${sessionTableEl(sessions)}
        </div>
    `
}

async function previousRacesEl() {
    const previousRaces = await browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.GET_PREVIOUS_RACES,
        'payload': {}
    })

    const previousRaceTemplate = race => `
        <li class="${NS}-race">
            <span class="${NS}-race--name">
                <span class="${NS}-race--expand">▶</span>
                ${race.name}
            </span>
            <span class="${NS}-race--blocked">
                <input type="checkbox" ${race.blocked ? 'checked' : ''} />
            </span>
        </li>
    `

    // const previousLi = previousRaces.map(race => `<li>${race.name} ${race.blocked}</li>`)
    const previousLi = previousRaces.map(previousRaceTemplate)
                                    .reverse()
                                    .join('\n')

    return `
        <h1>Previous Races</h1>
        <ul class="${NS}-previous">
            ${previousLi}
        </ul>
    `
}

async function popupEl() {
    return `
        <div>
            ${getDisplayTime(new Date())}
            ${await nextRaceEl()}
            ${await previousRacesEl()}
        </div>
    `
}

async function init() {
    const containerEl = document.querySelector(POPUP_CONTAINER_SELECTOR)
    containerEl.innerHTML = await popupEl()

    logger.debug('Init popup')
}

init()
