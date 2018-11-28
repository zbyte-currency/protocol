class Address extends Serializable {
    /**
     * @param {Address} o
     * @returns {Address}
     */
    static copy(o) {
        if (!o) return o;
        const obj = new Uint8Array(o._obj);
        return new Address(obj);
    }

    /**
     * @param {Hash} hash
     * @returns {Address}
     */
    static fromHash(hash) {
        return new Address(hash.subarray(0, Address.SERIALIZED_SIZE));
    }

    constructor(arg) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== Address.SERIALIZED_SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    /**
     * Create Address object from binary form.
     * @param {SerialBuffer} buf Buffer to read from.
     * @return {Address} Newly created Account object.
     */
    static unserialize(buf) {
        return new Address(buf.read(Address.SERIALIZED_SIZE));
    }

    /**
     * Serialize this Address object into binary form.
     * @param {?SerialBuffer} [buf] Buffer to write to.
     * @return {SerialBuffer} Buffer from `buf` or newly generated one.
     */
    serialize(buf) {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    subarray(begin, end) {
        return this._obj.subarray(begin, end);
    }

    /**
     * @type {number}
     */
    get serializedSize() {
        return Address.SERIALIZED_SIZE;
    }

    /**
     * @param {Serializable} o
     * @return {boolean}
     */
    equals(o) {
        return o instanceof Address
            && super.equals(o);
    }

    static fromString(str) {
        try {
            return Address.fromUserFriendlyAddress(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Address.fromHex(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Address.fromBase64(str);
        } catch (e) {
            // Ignore
        }

        throw new Error('Invalid address format');
    }

    /**
     * @param {string} base64
     * @return {Address}
     */
    static fromBase64(base64) {
        return new Address(BufferUtils.fromBase64(base64));
    }

    /**
     * @param {string} hex
     * @return {Address}
     */
    static fromHex(hex) {
        return new Address(BufferUtils.fromHex(hex));
    }

    /**
     * @param {string} str
     * @return {Address}
     */
    static fromUserFriendlyAddress(str) {
        if (str.substr(0, 2).toUpperCase() !== Address.MAGIC) {
            throw new Error('Invalid Address: Wrong country code');
        }
        if (str.length !== 36) {
            throw new Error('Invalid Address: Should be 36 chars (ignoring spaces)');
        }
        if (Address._ibanCheck(str.substr(4) + str.substr(0, 4)) !== 1) {
            throw new Error('Invalid Address: Checksum invalid');
        }
        return new Address(BufferUtils.fromBase32(str.substr(4)));
    }

    static _ibanCheck(str) {
        const num = str.split('').map((c) => {
            const code = c.toUpperCase().charCodeAt(0);
            return code >= 48 && code <= 57 ? c : (code - 55).toString();
        }).join('');
        let tmp = '';

        for (let i = 0; i < Math.ceil(num.length / 6); i++) {
            tmp = (parseInt(tmp + num.substr(i * 6, 6)) % 97).toString();
        }

        return parseInt(tmp);
    }

    /**
     * @return {string}
     */
    toUserFriendlyAddress() {
        const base32 = BufferUtils.toBase32(this.serialize());
        // eslint-disable-next-line prefer-template
        const check = ('00' + (98 - Address._ibanCheck(base32 + Address.MAGIC + '00'))).slice(-2);
        return Address.MAGIC + check + base32;
    }
}
Address.MAGIC = 'ZB';
Address.SERIALIZED_SIZE = 20;
Address.HEX_SIZE = 40;
Address.NULL = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
Address.CONTRACT_CREATION = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
Class.register(Address);
