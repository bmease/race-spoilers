/**
 * Logging module
 *
 * @module log
 */

import { MESSAGE_TYPES } from '../defaults.js'


/**
 * Logger Class.
 */
class Logger {

    installType = undefined

    /**
     * Logger constructor.
     *
     * @param {string} [name=''] - Name of the logger.
     *
     * @returns {Logger} - Returns a `Logger` instance.
     */
    constructor(name = '') {
        this.name = name
        this.checkInstallType()

        return this
    }

    async checkInstallType() {
        try {
            const info = await browser.management.getSelf()
            this.installType = info.installType
        } catch {
            // Content Scripts can't use `browser.management` so we query the
            // background script for install type instead.
            this.installType = await browser.runtime.sendMessage({
                'type': MESSAGE_TYPES.GET_INSTALL_TYPE
            })
        }

        if (!this.isDisabled) {
            console.info(
                `%c${this.name}%c : Logging is %cenabled%c for installType %c${this.installType}`,
                'font-weight: bold;', 'font-weight: normal;',
                'font-weight: bold;', 'font-weight: normal;',
                'font-weight: bold;',
            )
        }
    }

    /**
     * Getter showing if logging is enabled or disabled. Will return instead
     * of logging if disabled.
     *
     * @returns {boolean} True when logger is disabled.
     */
    get isDisabled() {
        // return false
        return this.installType !== 'development'
    }

    /**
     * Wrap console functions to return without logging if the logger is disabled.
     *
     * @param {function} fn - Function to wrap.
     *
     * @returns {function} - Wrapped function.
     *
     * @private
     */
    #logWrapper(fn, { useStyle=true }={}) {
        return (...args) => {
            if (this.isDisabled) {
                return
            }

            const styleTxt = `%c${this.name} : `
            const hasStringMsg = typeof args[0] === 'string'

            // Combine messages to allow styling log messages.
            // __Note__: Only the first argument sent to console.log allows %c
            // CSS styling. Since we're already formatting the message to
            // include the logger name if we want to allow logging with
            // additional formatting we need to combine them together.
            if (useStyle && hasStringMsg) {
                const [msg, ...rargs] = args
                const txt = `${styleTxt}%c${msg}`

                return fn(txt, 'font-weight: bold;', 'font-weight: normal;', ...rargs)
            }

            return (useStyle)
                ? fn(styleTxt, 'font-weight: bold;', ...args)
                : fn(...args)
        }
    }

    log = this.#logWrapper(console.log)
    info = this.#logWrapper(console.info)
    debug = this.#logWrapper(console.debug)
    warn = this.#logWrapper(console.warn)
    error = this.#logWrapper(console.error)

    table = this.#logWrapper(console.table, { useStyle: false })

    group = this.#logWrapper(console.group)
    groupCollapsed = this.#logWrapper(console.groupCollapsed)
    groupEnd = this.#logWrapper(console.groupEnd, { useStyle: false })
}

export default Logger
