import { SESSION_NAMES, FONTS } from '../defaults.js'


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

export function injectFonts() {
    FONTS.map(({ name, url }) => injectFont(name, url))
}

export function injectFont(name, url) {
    const fontURL = browser.runtime.getURL(url)
    const font = new FontFace(name, `url('${fontURL}')`)

    document.fonts.add(font)

    if (window.logger !== undefined) {
        logger.info(`Inject font %c${name}`, 'font-weight: bold;')
    }
}

/**
 * Returns the url for the races image.
 *
 * @param {String} slug - Race slug.
 * @returns {String} - url for the races image.
 */
export function getRaceImageURL(slug) {
    return browser.runtime.getURL(`/lib/images/${slug}.png`)
}
