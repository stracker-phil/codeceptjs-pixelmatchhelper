import {describe, expect, test} from '@jest/globals';
import { _deleteFile, _getDriver, _toBool } from '../../utils/common';

describe('_toBool()', () => {
  test('should return true when passing yes', () => {
    expect(_toBool('yes')).toBeTruthy();
  });

  test('should return false when passing n', () => {
    expect(_toBool('n')).toBeFalsy();
  });

  test('should return false when passing any', () => {
    expect(_toBool('any')).toBeFalsy();
  });

  test(`should return any when passing any 'any', ['any', 'all']`, () => {
    expect(_toBool('any', ['any', 'all'])).toEqual('any');
  });

  test(`should return any when passing any 'Any', ['any', 'all']`, () => {
    expect(_toBool('Any', ['any', 'all'])).toBeFalsy();
  });
});

describe('_getDriver()', () => {
    test('should return error when there is no matching helper', () => {
        try {
            _getDriver();
        } catch (error) {
            expect(error.message).toEqual('Unsupported driver. The pixelmatch helper supports Playwright|WebDriver|Appium|Puppeteer|TestCafe')
        }
    });
  });

  describe('_deleteFile()', () => {
    test('should return error when file could not be deleted', () => {
        try {
            _deleteFile('123.log');
        } catch (error) {
            expect(error.message).toEqual('Could not delete target file \"123.log\" - is it read-only?')
        }
    });
  });