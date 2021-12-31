import Logger from './utilities/log.js'
import SpoilerManager from './core/spoilers.js'

const logger = new Logger('background')

async function onInstalledHandler({ reason, /* temporary */ }) {
    logger.groupCollapsed('onInstalled')

    if (reason == 'install') {
        logger.debug('The extension has been %cinstalled', 'font-weight: bold;')

        // install database
        logger.debug('Install extension race database')
        await SpoilerManager.install()

        // onboarding
    }

    if (reason === 'update') {
        logger.debug('The extension has been %cupdated', 'font-weight: bold;')
        // update database
    }

    logger.groupEnd()
}

async function init() {
    logger.debug('init')

    const manager = await SpoilerManager.load()
    browser.runtime.onMessage.addListener(manager.messageHandler())
    browser.runtime.onConnect.addListener(manager.connectionListener())
}


browser.runtime.onInstalled.addListener(onInstalledHandler)

init()
