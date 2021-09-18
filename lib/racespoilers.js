class Logger {

    constructor(name = '') {
        this.name = name

        return this
    }

    info(msg) {
        console.info(msg)
    }
}


const NAMESPACE = 'race-spoilers'

const logger = new Logger(NAMESPACE)

function trackImageElement() {
    const track = document.createElement('img')
    track.src = browser.runtime.getURL('/lib/images/monaco.png')
    track.className = `${NAMESPACE}-track__image`

    return track
}

function trackTitleElement(text) {
    const session = document.createElement('h1')
    session.innerText = text
    session.className = `${NAMESPACE}-track__title`

    return session
}

function sessionElement(text) {
    const session = document.createElement('h2')
    session.innerText = text
    session.className = `${NAMESPACE}-track__session`

    return session
}

function buttonElement(text) {
    const button = document.createElement('button')
    button.innerText = text
    button.className = `${NAMESPACE}-button ${NAMESPACE}-button--primary`

    return button
}


function overlayElement() {
    const overlay = document.createElement('div')
    overlay.className = `${NAMESPACE}-overlay`

    overlay.appendChild(trackImageElement())
    overlay.appendChild(trackTitleElement('Monaco Grand Prix'))
    overlay.appendChild(sessionElement('Qualifying'))
    overlay.appendChild(buttonElement('Reveal Post'))

    return overlay
}


function injectFont() {
    const fontURL = browser.runtime.getURL('/lib/fonts/TitilliumWeb-Regular.ttf')
    const font = new FontFace('Titillium Web', `url('${fontURL}')`)

    document.fonts.add(font)
}


function hidePost(post) {
    const container = document.createElement('div')
    container.className = `${NAMESPACE}-container`

    post.parentNode.insertBefore(container, post)

    container.appendChild(post)
    container.appendChild(overlayElement())
}

function init() {
    injectFont()

    const posts = document.querySelectorAll('.thing.link')
    logger.info(`Found ${posts.length} posts`)

    hidePost(posts[0])
    hidePost(posts[2])
}


logger.info('Init race-spoilers')
init()

