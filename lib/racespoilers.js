class Logger {

    constructor(name = '') {
        this.name = name

        return this
    }

    info(msg) {
        console.info(msg)
    }
}

const NAMESPACE = 'rs'
const NS = NAMESPACE

const logger = new Logger(NS)


function overlayElement() {
    const trackImageURL = browser.runtime.getURL('/lib/images/monaco.png')
    const trackName = 'Monaco Grand Prix'
    const trackSession = 'Qualifying'

    const template = `
        <div class="${NS}-track">
            <img class="${NS}-track__image" src="${trackImageURL}" />
            <h1 class="${NS}-track__title">${trackName}</h1>
            <h2 class="${NS}-track__session">${trackSession}</h2>
        </div>

        <button class="${NS}-button ${NS}-button--primary">
            Reveal Post
        </button>
    `

    const overlay = document.createElement('div')
    overlay.className = `${NS}-overlay`
    overlay.innerHTML = template

    return overlay
}


function injectFont() {
    const fontURL = browser.runtime.getURL('/lib/fonts/TitilliumWeb-Regular.ttf')
    const font = new FontFace('Titillium Web', `url('${fontURL}')`)

    document.fonts.add(font)
}


function hidePost(post) {
    const container = document.createElement('div')
    container.className = `${NS}-container`

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

