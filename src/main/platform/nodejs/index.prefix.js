module.exports = {};
const atob = require('atob');
const btoa = require('btoa');
const JDB = require('@nimiq/jungle-db');
const fs = require('fs');
const dns = require('dns');
const https = require('https');
const http = require('http');
const cpuid = require('cpuid-git');
const chalk = require('chalk');

// Allow the user to specify the WebSocket engine through an environment variable. Default to ws
const WebSocket = require(process.env.NIMIQ_WS_ENGINE || 'ws');

global.Class = {
    scope: module.exports,
    register: clazz => {
        module.exports[clazz.prototype.constructor.name] = clazz;
    }
};

// Use CPUID to get the available processor extensions
// and choose the right version of the nimiq_node native module
const cpuSupport = function() {
    try {
        const cpu = cpuid();
        return ['avx512f', 'avx2', 'sse2'].find(f => cpu.features[f]) || 'compat';
    } catch (e) {
        return 'compat';
    }
}();

const NodeNative = require('bindings')(`nimiq_node_${cpuSupport}.node`);
