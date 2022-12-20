import path from 'path';
import fs from 'fs';
const supportedDrivers = ['Playwright', 'WebDriver', 'Appium', 'Puppeteer', 'TestCafe']

/**
 * Casts the given value into a boolean. Several string terms are translated
 * to boolean true. If validTerms are specified, and the given value matches
 * one of those validTerms, the term is returned instead of a boolean.
 *
 * Sample:
 *
 * _toBool('yes')                 --> true
 * _toBool('n')                   --> false
 * _toBool('any')                 --> false
 * _toBool('any', ['any', 'all']) --> 'any'
 *
 * @param {any} value - The value to cast.
 * @param {array} validTerms - List of terms that should not be cast to a boolean but returned directly.
 * @return {bool|string} Either a boolean or a lowercase string.
 * @private
 */
    export function _toBool(value, validTerms?): boolean | string {
        if (validTerms && Array.isArray(validTerms) && validTerms.indexOf(value) !== -1) {
            return value;
        }

        if (true === value || false === value) {
            return value;
        }

        if (value && 'string' === typeof value) {
            value = value.toLowerCase();
            return -1 !== ['1', 'on', 'y', 'yes', 'true', 'always'].indexOf(value);
        }
        
        return !!value;
}


/**
 * Builds the absolute path to a relative folder.
 *
 * @param {string} dir - The relative folder name.
 * @returns {string}
 * @private
 */
export function _resolvePath(dir) {
    if (!path.isAbsolute(dir)) {
        return path.resolve(global.codecept_dir, dir) + '/';
    }
    return dir;
}

/**
 * Tests, if the given file exists..
 *
 * @param {string} file - The file to check.
 * @param {string} mode - Optional. Either empty, or 'read'/'write' to
 *        validate that the current user can either read or write the file.
 * @private
 */
    export function _isFile(file, mode?) {
    let accessFlag = fs.constants.F_OK;

    if ('read' === mode) {
        accessFlag |= fs.constants.R_OK;
    } else if ('write' === mode) {
        accessFlag |= fs.constants.W_OK;
    }

    try {
        // If access permission fails, an error is thrown.
        fs.accessSync(file, accessFlag);
        return true;
    } catch (err) {
        if ('ENOENT' !== err.code) {
            console.error(err.code + ':  ' + file);
        }

        return false;
    }
}

	/**
	 * Recursively creates the specified directory.
	 *
	 * @param dir
	 * @private
	 */
     export function _mkdirp(dir) {
		fs.mkdirSync(dir, {recursive: true});
	}

	/**
	 * Deletes the specified file, if it exists.
	 *
	 * @param {string} file - The file to delete.
	 * @private
	 */
     export function _deleteFile(file) {
		try {
			if (this._isFile(file)) {
				fs.unlinkSync(file);
			}
		} catch (err) {
			throw new Error(`Could not delete target file "${file}" - is it read-only?`);
		}
	}

    	/**
	 * Returns the instance of the current browser driver.
	 *
	 * @return {Playwright|Puppeteer|WebDriver|Appium|WebDriverIO|TestCafe}
	 * @private
	 */
	export function _getDriver() {
		let driver:any;

		for (const item of supportedDrivers) {
            if (this?.helpers && this?.helpers[item]) {
                driver = this.helpers[item];
				driver['_which'] = item;
                break;
            }
        }

        if (!driver || !this?.helpers) throw Error(`Unsupported driver. The pixelmatch helper supports ${supportedDrivers.join('|')}`);
		return driver;
	}