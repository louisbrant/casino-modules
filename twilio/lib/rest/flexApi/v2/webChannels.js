"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Flex
 * This is the public Twilio REST API.
 *
 * NOTE: This class is auto generated by OpenAPI Generator.
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebChannelsInstance = exports.WebChannelsListInstance = void 0;
const util_1 = require("util");
const deserialize = require("../../../base/deserialize");
const serialize = require("../../../base/serialize");
function WebChannelsListInstance(version) {
    const instance = {};
    instance._version = version;
    instance._solution = {};
    instance._uri = `/WebChats`;
    instance.create = function create(params, callback) {
        if (params === null || params === undefined) {
            throw new Error('Required parameter "params" missing.');
        }
        if (params["addressSid"] === null || params["addressSid"] === undefined) {
            throw new Error("Required parameter \"params['addressSid']\" missing.");
        }
        let data = {};
        data["AddressSid"] = params["addressSid"];
        if (params["chatFriendlyName"] !== undefined)
            data["ChatFriendlyName"] = params["chatFriendlyName"];
        if (params["customerFriendlyName"] !== undefined)
            data["CustomerFriendlyName"] = params["customerFriendlyName"];
        if (params["preEngagementData"] !== undefined)
            data["PreEngagementData"] = params["preEngagementData"];
        const headers = {};
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        let operationVersion = version, operationPromise = operationVersion.create({
            uri: instance._uri,
            method: "post",
            data,
            headers,
        });
        operationPromise = operationPromise.then((payload) => new WebChannelsInstance(operationVersion, payload));
        operationPromise = instance._version.setPromiseCallback(operationPromise, callback);
        return operationPromise;
    };
    instance.toJSON = function toJSON() {
        return instance._solution;
    };
    instance[util_1.inspect.custom] = function inspectImpl(_depth, options) {
        return (0, util_1.inspect)(instance.toJSON(), options);
    };
    return instance;
}
exports.WebChannelsListInstance = WebChannelsListInstance;
class WebChannelsInstance {
    constructor(_version, payload) {
        this._version = _version;
        this.conversationSid = payload.conversation_sid;
        this.identity = payload.identity;
    }
    /**
     * Provide a user-friendly representation
     *
     * @returns Object
     */
    toJSON() {
        return {
            conversationSid: this.conversationSid,
            identity: this.identity,
        };
    }
    [util_1.inspect.custom](_depth, options) {
        return (0, util_1.inspect)(this.toJSON(), options);
    }
}
exports.WebChannelsInstance = WebChannelsInstance;