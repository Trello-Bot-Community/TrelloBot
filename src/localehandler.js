const fs = require('fs');
const M = require('mustache');
const path = require('path');
const reload = require('require-reload')(require);
const lodash = require('lodash');
const moment = require('moment');
require('moment-duration-format');

class LocaleHandler {
  constructor(client, cPath) {
    this.locales = new Map();
    this.path = path.resolve(cPath);
    this.config = client.config;
  }

  /**
   * Loads locales from a folder
   * @param {String} folderPath
   */
  iterateFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    files.map(file => {
      const filePath = path.join(folderPath, file);
      const stat = fs.lstatSync(filePath);
      if (stat.isSymbolicLink()) {
        const realPath = fs.readlinkSync(filePath);
        if (stat.isFile() && file.endsWith('.json')) {
          this.load(realPath);
        } else if (stat.isDirectory()) {
          this.iterateFolder(realPath);
        }
      } else if (stat.isFile() && file.endsWith('.json'))
        this.load(filePath);
      else if (stat.isDirectory())
        this.iterateFolder(filePath);
    });
  }

  /**
   * The source locale JSON
   * @type {Object}
   */
  get source() {
    return this.locales.get(this.config.sourceLocale);
  }

  /**
   * The array pairs of all locales
   * @returns {Array<Array<string|Object>>}
   */
  array() {
    const array = [];
    this.locales.forEach((json, locale) => array.push([locale, json]));
    return array;
  }

  /**
   * Loads a locale
   * @param {string} filePath
   */
  load(filePath) {
    console.fileload('Loading locale', filePath);
    const json = reload(filePath);
    this.locales.set(path.parse(filePath).name, json);
  }

  /**
   * Reloads all locales
   */
  reload() {
    this.locales.clear();
    this.iterateFolder(this.path);
  }

  /**
   * Creates a localization module
   * @param {string} locale The locale to use
   * @param {Object} prefixes The prefixes to use
   */
  createModule(locale, prefixes = {}){
    const _ = (string, params = {}) => {
      const localeJSON = this.locales.get(locale);
      const source = this.locales.get(this.config.sourceLocale);
      const localeBase = localeJSON ? lodash.defaultsDeep(localeJSON, source) : source;
      const localeString = lodash.get(localeBase, string);
      if (!params.prefix) params.prefix = prefixes.raw;
      if (!params.cleanPrefix) params.cleanPrefix = prefixes.clean;
      if (!localeString)
        throw new Error(`No string named '${string}' was found in the source translation.`);
      return M.render(localeString, params);
    };

    _.valid = string => {
      const localeJSON = this.locales.get(locale);
      const source = this.locales.get(this.config.sourceLocale);
      const localeBase = localeJSON ? lodash.defaultsDeep(localeJSON, source) : source;
      return lodash.has(localeBase, string);
    };

    _.numSuffix = (string, value, params) => {
      const suffixTable = [
        [0, 'zero'], [1, 'one'], [2, 'two'],
        [3, 'three'], [4, 'four'], [5, 'five']
      ];

      for (const i in suffixTable) {
        const suffix = suffixTable[i];
        if (value !== suffix[0]) continue;
        if (value === suffix[0] && _.valid(`${string}.${suffix[1]}`))
          return _(`${string}.${suffix[1]}`, params);
      }
      return _(`${string}.many`, params);
    };

    _.toLocaleString = number =>
      number.toLocaleString((locale || this.config.sourceLocale).replace('_', '-'));

    _.moment = (...args) =>
      moment(...args).locale((locale || this.config.sourceLocale).replace('_', '-'));

    /**
     * @example 514279423 equals "5 d, 22 h, 51 m and 19 s"
     * @author Hugo Vidal <hugo.vidal.ferre@gmail.com>
     */
    _.toDurationFormat = number => {
      return moment
        .duration(number)
        .format(`y [y], M [M], w [w], d [d], h [h], m [m] [${_('words.and')}] s [s]`);
    };

    _.dateJS = (date, query) => {
      const countryCodeMap = {
        da: 'da-DK',
        fil: 'en-US', // Does not have a translation in DateJS
        ko: 'ko-KR',
        ms: 'ms-MY',
        sv: 'sv-SE',
        uk: 'uk-UA'
      };

      const currentLocale = (locale || this.config.sourceLocale).replace('_', '-');
      const countryCode = countryCodeMap[currentLocale] ||
        !currentLocale.includes('-') ? `${currentLocale}-${currentLocale.toUpperCase()}` : currentLocale;

      date.i18n.setLanguage(countryCode);
      return date.parse(query);
    };

    _.locale = locale || this.config.sourceLocale;

    _.prefixes = prefixes;

    _.json = () => {
      const localeJSON = this.locales.get(locale);
      const source = this.locales.get(this.config.sourceLocale);
      const localeBase = localeJSON ? lodash.defaultsDeep(localeJSON, source) : source;
      return localeBase;
    };

    return _;
  }
}

module.exports = LocaleHandler;