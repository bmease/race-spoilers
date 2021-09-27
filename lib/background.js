import Logger from './utilities/log.js'

const logger = new Logger('background')

function onInstalledHandler() {
    logger.debug('onInstalledHandler')
}

async function init() {
    logger.debug('init')

    browser.runtime.onInstalled.addListener(onInstalledHandler)
}


init()
