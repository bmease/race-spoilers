import Logger from './utilities/log.js'
import SpoilerManager from './core/spoilers.js'

const logger = new Logger('background')

function onInstalledHandler() {
    logger.debug('onInstalledHandler')
}

async function init() {
    logger.debug('init')

    const manager = new SpoilerManager()
    await manager.load()
    browser.runtime.onMessage.addListener(manager.messageHandler())

    browser.runtime.onInstalled.addListener(onInstalledHandler)
}


init()
