"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Microvisor
 * This is the public Twilio REST API.
 *
 * NOTE: This class is auto generated by OpenAPI Generator.
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceConfigPage = exports.DeviceConfigListInstance = exports.DeviceConfigInstance = exports.DeviceConfigContextImpl = void 0;
const util_1 = require("util");
const Page_1 = __importDefault(require("../../../../base/Page"));
const deserialize = require("../../../../base/deserialize");
const serialize = require("../../../../base/serialize");
const utility_1 = require("../../../../base/utility");
class DeviceConfigContextImpl {
    constructor(_version, deviceSid, key) {
        this._version = _version;
        if (!(0, utility_1.isValidPathParam)(deviceSid)) {
            throw new Error("Parameter 'deviceSid' is not valid.");
        }
        if (!(0, utility_1.isValidPathParam)(key)) {
            throw new Error("Parameter 'key' is not valid.");
        }
        this._solution = { deviceSid, key };
        this._uri = `/Devices/${deviceSid}/Configs/${key}`;
    }
    remove(callback) {
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.remove({
            uri: instance._uri,
            method: "delete",
        });
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    }
    fetch(callback) {
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.fetch({
            uri: instance._uri,
            method: "get",
        });
        operationPromise = operationPromise.then((payload) => new DeviceConfigInstance(operationVersion, payload, instance._solution.deviceSid, instance._solution.key));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    }
    update(params, callback) {
        if (params === null || params === undefined) {
            throw new Error('Required parameter "params" missing.');
        }
        if (params["value"] === null || params["value"] === undefined) {
            throw new Error("Required parameter \"params['value']\" missing.");
        }
        let data = {};
        data["Value"] = params["value"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        const instance = this;
        let operationVersion = instance._version, operationPromise = operationVersion.update({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new DeviceConfigInstance(operationVersion, payload, instance._solution.deviceSid, instance._solution.key));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return this._solution;
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.DeviceConfigContextImpl = DeviceConfigContextImpl;
class DeviceConfigInstance {
    constructor(_version, payload, deviceSid, key) {
        this._version = _version;
        this.deviceSid = payload.device_sid;
        this.key = payload.key;
        this.value = payload.value;
        this.dateUpdated = deserialize.iso8601DateTime(payload.date_updated);
        this.url = payload.url;
        this._solution = { deviceSid, key: key || this.key };
    }
    get _proxy() {
        this._context =
            this._context ||
                new DeviceConfigContextImpl(this._version, this._solution.deviceSid, this._solution.key);
        return this._context;
    }
    /**
     * Remove a DeviceConfigInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed boolean
     */
    remove(callback) {
        return this._proxy.remove(callback);
    }
    /**
     * Fetch a DeviceConfigInstance
     *
     * @param callback - Callback to handle processed record
     *
     * @returns Resolves to processed DeviceConfigInstance
     */
    fetch(callback) {
        return this._proxy.fetch(callback);
    }
    update(params, callback) {
        return this._proxy.update(params, callback);
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return {
            deviceSid: this.deviceSid,
            key: this.key,
            value: this.value,
            dateUpdated: this.dateUpdated,
            url: this.url,
        };
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.DeviceConfigInstance = DeviceConfigInstance;
function DeviceConfigListInstance(version, deviceSid) {
    if (!(0, utility_1.isValidPathParam)(deviceSid)) {
        throw new Error("Parameter 'deviceSid' is not valid.");
    }
    const instance = ((key) => instance.get(key));
    instance.get = function get(key) {
        return new DeviceConfigContextImpl(version, deviceSid, key);
    };
    instance._version = version;
    instance._solution = { deviceSid };
    instance._uri = `/Devices/${deviceSid}/Configs`;
    instance.create = function create(params, callback) {
        if (params === null || params === undefined) {
            throw new Error('Required parameter "params" missing.');
        }
        if (params["key"] === null || params["key"] === undefined) {
            throw new Error("Required parameter \"params['key']\" missing.");
        }
        if (params["value"] === null || params["value"] === undefined) {
            throw new Error("Required parameter \"params['value']\" missing.");
        }
        let data = {};
        data["Key"] = params["key"];
        data["Value"] = params["value"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        let operationVersion = version, operationPromise = operationVersion.create({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new DeviceConfigInstance(operationVersion, payload, instance._solution.deviceSid));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    };
    instance.page = function page(params, callback) {
        if (params instanceof Function) {
            callback = params;
            params = {};
        }
        else {
            params = params || {};
        }
        let data = {};
        if (params["pageSize"] !== undefined)
            data["PageSize"] = params["pageSize"];
        if (params.pageNumber !== undefined)
            data["Page"] = params.pageNumber;
        if (params.pageToken !== undefined)
            data["PageToken"] = params.pageToken;
        const headers = {};
        let operationVersion = version, operationPromise = operationVersion.page({
            uri: instance._uri,
            method: "get",
            params: data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new DeviceConfigPage(operationVersion, payload, instance._solution));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    };
    instance.each = instance._version.each;
    instance.list = instance._version.list;
    instance.getPage = function getPage(targetUrl, callback) {
        const operationPromise = instance._version._domain.twilio.request({
            method: "get",
            uri: targetUrl,
        });
        let pagePromise = operationPromise.then((payload) => new DeviceConfigPage(instance._version, payload, instance._solution));
        pagePromise = instance._version.setPromiseCallback(pagePromise, callback);
        return pagePromise;
    };
    instance.toJSON = function toJSON() {
        return instance._solution;
    };
    instance[util_1.inspect.custom] = function inspectImpl(_depth, options) {
        return (0, util_1.inspect)(instance.toJSON(), options);
    };
    return instance;
}
exports.DeviceConfigListInstance = DeviceConfigListInstance;
class DeviceConfigPage extends Page_1.default {
    /**
     * Initialize the DeviceConfigPage
     *
     * @param version - Version of the resource
     * @param response - Response from the API
     * @param solution - Path solution
     */
    constructor(version, response, solution) {
        super(version, response, solution);
    }
    /**
     * Build an instance of DeviceConfigInstance
     *
     * @param payload - Payload response from the API
     */
    getInstance(payload) {
        return new DeviceConfigInstance(this._version, payload, this._solution.deviceSid);
    }
    [util_1.inspect.custom](depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.DeviceConfigPage = DeviceConfigPage;
