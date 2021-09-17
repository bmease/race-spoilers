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

function sessionElement(text) {
    const session = document.createElement('h1')
    session.innerText = text
    session.className = `${NAMESPACE}-button`

    return session
}

function buttonElement(text) {
    const button = document.createElement('button')
    button.innerText = text
    button.className = `${NAMESPACE}-button`

    return button
}


function overlayElement() {
    const overlay = document.createElement('div')
    overlay.className = `${NAMESPACE}-overlay`

    overlay.appendChild(sessionElement('Qualifying'))
    overlay.appendChild(buttonElement('Reveal Post'))

    return overlay
}


function hidePost(post) {
    const container = document.createElement('div')
    container.className = `${NAMESPACE}-container`

    post.parentNode.insertBefore(container, post)

    container.appendChild(post)
    container.appendChild(overlayElement())
}


logger.info('Init race-spoilers')

const posts = document.querySelectorAll('.thing.link')
logger.info(`Found ${posts.length} posts`)

hidePost(posts[0])
hidePost(posts[2])
