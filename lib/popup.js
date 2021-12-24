import { NS, MESSAGE_TYPES } from './defaults.js'
import { getSessionName, getDisplayTime, injectFonts, getRaceImageURL } from './utilities/utilities.js'
import Logger from './utilities/log.js'

const logger = new Logger('popup')
window.logger = logger

const POPUP_CONTAINER_SELECTOR = '.popup-container'

function sessionTableEl(sessions, race) {
    const blockedSessions = race.blockedSessions
    const now = new Date()
    const isUpcoming = time => now < time
    const isBlocked = name => blockedSessions.includes(name)
    const rowDisabledClass = session => isUpcoming(session.start)
        ? `${NS}-session__row--disabled`
        : ''

    const checkedAttr = name => isBlocked(name) ? 'checked' : ''
    const disabledAttr = start => isUpcoming(start) ? 'disabled' : ''

    const li = sessions.map(session => `
        <tr class="${NS}-session__row ${rowDisabledClass(session)}">
            <td class="${NS}-session__item ${NS}-session__item__name">
                ${getSessionName(session.name)}
            </td>
            <td class="${NS}-session__item ${NS}-session__item__time">
                ${getDisplayTime(session.start)}
            </td>
            <td class="${NS}-session__item ${NS}-session__item__blocked">
                <input
                    type="checkbox"
                    ${checkedAttr(session.name)}
                    ${disabledAttr(session.start)}
                    data-name="${race.name}"
                    data-round="${race.round}"
                    data-session="${session.name}"
                />
            </td>
        </tr>
    `).join('\n')

    return `
        <table class="${NS}-session">
            <tr class="${NS}-session__row ${NS}-session__row--heading">
                <th class="${NS}-session__item">Session</th>
                <th class="${NS}-session__item">Time</th>
                <th class="${NS}-session__item"></th>
            </tr>
            ${li}
        </table>
    `
}

async function detailsEl(race, title) {
    const sessions = Object.entries(race.sessions)
                           .map(([name, start]) => ({ name, start: new Date(start) }))
    const image = getRaceImageURL(race.slug)

    return `
        <section class="${NS}-details">
            ${headerEl(title, true)}
            <div class="${NS}-details__container">
                <img src="${image}" class="${NS}-details__image" />
                <div class="${NS}-details__info">
                    <h2 class="${NS}-details__name">${race.name}</h1>
                    <h3 class="${NS}-details__location">${race.location}</h2>
                </div>
            </div>
            ${sessionTableEl(sessions, race)}
        </section>
    `

}

async function nextOrCurrentRaceEl() {
    const currentRace = await browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.GET_CURRENT_RACE,
        'payload': {}
    })

    logger.debug('currentRace', currentRace)

    const nextRace = await browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.GET_NEXT_RACE,
        'payload': {}
    })

    if (currentRace === undefined && nextRace === undefined) {
        return ''
    }

    return currentRace
        ? detailsEl(currentRace, 'Now')
        : detailsEl(nextRace, 'Next')
}

/**
 * @param {String} title - Header title.
 * @param {Boolean} main - Is this the main title.
 * @returns {HTMLElement}
 */
function headerEl(title, main=false) {
    return main
        ? `
            <header class="${NS}-header ${NS}-header--main">
                <h1 class="${NS}-header__title">${title}</h1>
                <div class="${NS}-header__line">&nbsp;</div>
            </header>
        `
        : `
            <header class="${NS}-header">
                <h1 class="${NS}-header__title">${title}</h1>
            </header>
        `
}

/**
 * @returns {HTMLElement} - Previous races element.
 */
async function previousRacesEl() {
    const previousRaces = await browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.GET_PREVIOUS_RACES,
        'payload': {}
    })

    const races = previousRaces.reverse()

    return `
        <section class="${NS}-section">
            ${headerEl('Previous')}
            ${raceListEl(races)}
        </section>
    `
}

/**
 * @returns {HTMLElement} - Upcoming races element.
 */
async function upcomingRacesEl() {
    const races = await browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.GET_UPCOMING_RACES,
        'payload': {}
    })

    if (races.length === 0) {
        return ''
    }

    return `
        <section class="${NS}-section">
            ${headerEl('Upcoming')}
            ${raceListEl(races, true)}
        </section>
    `
}

/**
 * Generate an HTMLElement of an unordered list of Races.
 *
 * @param {Race} races - List of races to display.
 * @returns {HTMLElement}
 */
function raceListEl(races, disabled = false) {
    const disabledAttr = disabled ? 'disabled' : ''
    const disabledClass = disabled ? `${NS}-race--disabled` : ''
    const checkedAttr = race => race.blocked ? 'checked' : ''

    const raceTemplateEl = race => `
        <li class="${NS}-race ${disabledClass}">
            <span class="${NS}-race__name">
                <span class="${NS}-race__expand">▶</span>
                ${race.name}
            </span>
            <input
                type="checkbox"
                class="${NS}-race__blocked"
                data-name="${race.name}"
                data-round="${race.round}"
                ${checkedAttr(race)}
                ${disabledAttr}
            />
        </li>
    `

    const racesLi = races.map(raceTemplateEl)
                         .join('\n')

    return `
        <ul class="${NS}-races">
            ${racesLi}
        </ul>
    `
}

function addBlockedHandler(el) {
    // FIXME: Ignore disabled elements
    el.addEventListener('click', blockedHandler)
}

function blockedHandler(event) {
    const { name, round } = event.target.dataset
    const value = event.target.checked
    logger.debug({ name, round, value })

    browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.SET_BLOCKED_RACE,
        'payload': { name, round, value }
    })
}

function addBlockedSessionHandler(el) {
    // TODO: Ignore disabled elements
    el.addEventListener('click', blockedSessionHandler)
}

function blockedSessionHandler(event) {
    const { name, round, session } = event.target.dataset
    const value = event.target.checked
    logger.debug({ name, round, session, value })

    browser.runtime.sendMessage({
        'type': MESSAGE_TYPES.SET_BLOCKED_SESSION,
        'payload': { name, round, session, value }
    })

}

async function popupContainerEl() {
    return `
        ${await nextOrCurrentRaceEl()}
        ${await previousRacesEl()}
        ${await upcomingRacesEl()}
    `
}

async function init() {
    injectFonts()

    const containerEl = document.querySelector(POPUP_CONTAINER_SELECTOR)
    containerEl.innerHTML = await popupContainerEl()

    Array.from(containerEl.querySelectorAll(`.${NS}-race__blocked`)).map(el => addBlockedHandler(el))
    Array.from(containerEl.querySelectorAll(`.${NS}-session__item__blocked`)).map(el => addBlockedSessionHandler(el))

    logger.debug('Init popup')
}

init()
