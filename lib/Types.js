
// See Chapter 8 in the ECMA-262 specification for full explanations of these types and their properties

var util = require("util"),
	Exceptions = require("../Exceptions.js");
	TiUtil = require("../TiUtil.js");

// ******** Non-spec helpers ********

function isPrimitive(o) {
	return !~["Number", "String", "Boolean"].indexOf(o.className);
}
exports.isPrimitive = isPrimitive;

function type(t) {
	return t.className;
}
exports.type = type;

function sameDesc(x, y) {
	var keys = Object.keys(x),
		same = true;

	if (keys.length !== Object.keys(y).length) {
		return false;
	}
	for(var i in keys) {
		same = same && x[i] === y[i];
	}

	return same;
};
exports.sameDesc = sameDesc;

// ******** Property Type Classes ********

function TypeDataProperty() {

	this.value = undefined;
	this.writeable = false;
	this.enumerable = false;
	this.configurable = false;
};
exports.TypeDataProperty = TypeDataProperty;

function TypeAccessorProperty() {

	this.get = undefined;
	this.set = undefined;
	this.enumerable = false;
	this.configurable = false;
};
exports.TypeAccessorProperty = TypeAccessorProperty;

// ******** Property Descriptor Query Methods ********

function isDataDescriptor(desc) {
	if (!desc) {
		return false;
	}
	if (!desc.value && !desc.writeable) {
		return false;
	}
	return true;
};
exports.isDataDescriptor = isDataDescriptor;

function isAccessorDescriptor(desc) {
	if (!desc) {
		return false;
	}
	if (!desc.get && !desc.set) {
		return false;
	}
	return true;
};
exports.isAccessorDescriptor = isAccessorDescriptor;

function isGenericDescriptor(desc) {
	if (!desc) {
		return false;
	}
	return !exports.isAccessorDescriptor(desc) && !exports.isDataDescriptor(desc);
};
exports.isGenericDescriptor = isGenericDescriptor;

function fromPropertyDescriptor(desc) {
	if (!desc) {
		return undefined;
	}
	var obj = new TypeObject();
	if (exports.isDataDescriptor(desc)) {
		obj.defineOwnProperty("value", {
			value: desc.value,
			writeable: true,
			enumerable: true,
			configurable: true
		}, false);
		obj.defineOwnProperty("writeable", {
			value: desc.writeable,
			writeable: true,
			enumerable: true,
			configurable: true
		}, false);
	} else {
		obj.defineOwnProperty("get", {
			value: desc.get,
			writeable: true,
			enumerable: true,
			configurable: true
		}, false);
		obj.defineOwnProperty("set", {
			value: desc.get,
			writeable: true,
			enumerable: true,
			configurable: true
		}, false);
	}
	obj.defineOwnProperty("configurable", {
		value: desc.configurable,
		writeable: true,
		enumerable: true,
		configurable: true
	}, false);
	obj.defineOwnProperty("enumerable", {
		value: desc.enumerable,
		writeable: true,
		enumerable: true,
		configurable: true
	}, false);
	return obj;
};
exports.fromPropertyDescriptor = fromPropertyDescriptor;

function toPropertyDescriptor(obj) {
	if (!type(obj) !== "Object") {
		throw new Exceptions.TypeError();
	}
	var desc = {};
	if (obj.hasProperty("enumerable")) {
		desc.enumerable = toBoolean(obj.get("enumerable"));
	}
	if (obj.hasProperty("configurable")) {
		desc.configurable = toBoolean(obj.get("configurable"));
	}
	if (obj.hasProperty("value")) {
		desc.value = obj.get("value");
	}
	if (obj.hasProperty("writeable")) {
		desc.writeable = toBoolean(obj.get("writeable"));
	}
	if (obj.hasProperty("get")) {
		var getter = obj.get("get");
		if (TiUtil.isDef(getter) && !isCallable(getter)) {
			throw new Exceptions.TypeError();
		}
		desc.get = getter;
	}
	if (obj.hasProperty("set")) {
		var setter = obj.get("set");
		if (TiUtil.isDef(setter) && !isCallable(setter)) {
			throw new Exceptions.TypeError();
		}
		desc.set = setter;
	}
	if((desc.get || desc.set) && (TiUtil.isDef(desc.value) || TiUtil.isDef(desc.writeable))) {
		throw new Exceptions.TypeError();
	}
	return desc;
};
exports.toPropertyDescriptor = toPropertyDescriptor;

// ******** Base Type Class ********

function TypeBase(className) {
	this.className = className;
};

// ******** Object Type Class ********

function TypeObject(type) {
	TypeBase.call(this, type || "Object");

	this._properties = {};

	this.objectPrototype = null;
	this.extensible = true;
};
util.inherits(exports.TypeObject = TypeObject, TypeBase);

TypeObject.prototype.get = function get(p) {
	var desc = this.getProperty(p);
	if (desc === undefined) {
		return undefined;
	}
	if (isDataDescriptor(x)) {
		return x.value;
	} else {
		return desc.get && desc.get.call(this);
	}
};

TypeObject.prototype.getOwnProperty = function getOwnProperty(p) {
	if (!this._properties[p]) {
		return undefined;
	}
	var d = {},
		x = this._properties[p];
	if (isDataDescriptor(x)) {
		d.value = x.value;
		d.writeable = x.writeable;
	} else {
		d.get = x.get;
		d.set = x.set;
	}
	d.enumerable = x.enumerable;
	d.configurable = x.configurable;
	return d;
};

TypeObject.prototype.getProperty = function getProperty(p) {
	var prop = this.getOwnProperty(p);
	if (prop) {
		return prop;
	}
	return this.objectPrototype && this.objectPrototype.getProperty(p);
};

TypeObject.prototype.put = function put(p, v, throwFlag) {
	if (!this.canPut(p)) {
		if (throwFlag) {
			throw new Exceptions.TypeError("Cannot put argument");
		} else {
			return;
		}
	}

	var ownDesc = this.getOwnProperty(p);
	if (isDataDescriptor(ownDesc)) {
		this.defineOwnProperty(p, { value: v }, throwFlag);
		return;
	}

	var desc = this.getProperty(p);
	if (isAccessorDescriptor(desc)) {
		desc.set.call(this, v);
	} else {
		this.defineOwnProperty(p, {
			value: v,
			writeable: true,
			enumerable: true,
			configurable: true
		}, throwFlag);
	}
};

TypeObject.prototype.canPut = function canPut(p) {
	var desc = this.getOwnProperty(p);
	if (desc) {
		if (isAccessorDescriptor(desc)) {
			return !!desc.set;
		} else {
			return desc.writeable;
		}
	}

	if (!this.objectPrototype) {
		return this.extensible;
	}

	var inherited = this.objectPrototype.getProperty(p);
	if (inherited === undefined) {
		return this.extensible;
	}

	if (isAccessorDescriptor(inherited)) {
		return !!inherited.set;
	} else {
		if (!inherited.extensible) {
			return false;
		} else {
			return inherited.writeable;
		}
	}
};

TypeObject.prototype.hasProperty = function hasProperty(p) {
	return !!this.getProperty(p);
};

TypeObject.prototype["delete"] = function objDelete(p, throwFlag) {
	var desc = this.getOwnProperty(p);
	if (desc === undefined) {
		return true;
	}
	if (desc.configurable) {
		delete this._properties[p];
		return true;
	}
	if (throwFlag) {
		throw new Exceptions.TypeError("Unable to delete '" + p + "'");
	}
	return false;
};

TypeObject.prototype.defaultValue = function defaultValue(hint) {

	function defaultToString() {
		var toString = this.get("toString"),
			str;
		if (isCallable(toString)) {
			str = toString.call(this);
			if (isPrimitive(str)) {
				return str;
			}
		}
		return undefined;
	}

	function defaultValueOf() {
		var valueOf = this.get("valueOf");
		if (isCallable(valueOf)) {
			var val = valueOf.call(this);
			if (isPrimitive(val)) {
				return val;
			}
		}
		return undefined;
	}

	if (hint === "String") {
		if (!defaultToString.call(this)) {
			if (!defaultValueOf.call(this)) {
				throw new Exceptions.TypeError();
			}
		}
	} else {
		if (!defaultValueOf.call(this)) {
			if (!defaultToString.call(this)) {
				throw new Exceptions.TypeError();
			}
		}
	}
};

TypeObject.prototype.defineOwnProperty = function defineOwnProperty(p, desc, throwFlag) {
	var current = this.getOwnProperty(p),
		newProp,
		descKeys = Object.keys(desc);
	
	if (current === undefined && !this.extensible) {
		if (throwFlag) {
			throw new Exceptions.TypeError();
		}
		return false;
	}

	if (current === undefined && this.extensible) {
		if (isGenericDescriptor(desc) || isDataDescriptor(desc)) {
			newProp = new TypeDataProperty();
			if (TiUtil.isDef(desc.configurable)) {
				newProp.configurable = desc.configurable;
			}
			if (TiUtil.isDef(desc.enumerable)) {
				newProp.enumerable = desc.enumerable;
			}
			if (TiUtil.isDef(desc.value)) {
				newProp.value = desc.value;
			}
			if (TiUtil.isDef(desc.writeable)) {
				newProp.writeable = desc.writeable;
			}
		} else {
			newProp = new TypeAccessorProperty();
			if (TiUtil.isDef(desc.configurable)) {
				newProp.configurable = desc.configurable;
			}
			if (TiUtil.isDef(desc.enumerable)) {
				newProp.enumerable = desc.enumerable;
			}
			if (TiUtil.isDef(desc.get)) {
				newProp.value = desc.value;
			}
			if (TiUtil.isDef(desc.set)) {
				newProp.writeable = desc.writeable;
			}
		}
		this._properties[p] = newProp;
		return true;
	}

	if (descKeys.length === 0) {
		return true;
	}

	if (sameDesc(current, desc)) {
		return true;
	}
	if (!current.configurable) {
		if (desc.configurable || (isDef(desc.enumerable) && desc.enumerable != current.enumerable)) {
			if (throwFlag) {
				throw new Exceptions.TypeError();
			}
			return false;
		}
	}

	if (isDataDescriptor(desc) != isDataDescriptor(current)) {
		if(!current.configurable) {
			if (throwFlag) {
				throw new Exceptions.TypeError();
			}
			return false;
		}

		if (isDataDescriptor(current)) {
			newProp = new TypeAccessorProperty();
			newProp.configurable = current.configurable;
			newProp.enumerable = current.enumerable;
		} else {
			newProp = new TypeDataProperty();
			newProp.configurable = current.configurable;
			newProp.enumerable = current.enumerable;
		}
		current = newProp;
	} else if (isDataDescriptor(desc) && isDataDescriptor(current)) {
		if (!current.configurable) {
			if (!current.writeable && desc.writeable) {
				if (throwFlag) {
					throw new Exceptions.TypeError();
				}
				return false;
			}
			if (!current.writeable && TiUtil.isDef(desc.value) && !sameDesc(desc.value, current.value)) {
				if (throwFlag) {
					throw new Exceptions.TypeError();
				}
				return false;
			}
		}
	} else if (isAccessorDescriptor(desc) && isAccessorDescriptor(current)) {
		if (!current.configurable) {
			if(TiUtil.isDef(desc.set) && !sameDesc(desc.set, current.set)) {
				if (throwFlag) {
					throw new Exceptions.TypeError();
				}
				return false;
			}
			if(TiUtil.isDef(desc.get) && !sameDesc(desc.get, current.get)) {
				if (throwFlag) {
					throw new Exceptions.TypeError();
				}
				return false;
			}
		}
	}
	for(var i in descKeys) {
		current[i] = desc[i];
	}
	this._properties[p] = newProp;
	return true;
};

// ******** Number Type Class ********

function TypeNumber(className) {
	TypeBase.call(this, "Number");
};
util.inherits(exports.TypeNumber = TypeNumber, TypeBase);

// ******** Boolean Type Class ********

function TypeBoolean(className) {
	TypeBase.call(this, "Boolean");
	this.value = false;
};
util.inherits(exports.TypeBoolean = TypeBoolean, TypeBase);

// ******** String Type Class ********

function TypeString(className) {
	TypeObject.call(this, "String");
};
util.inherits(exports.TypeString = TypeString, TypeBase);

// ******** Number Object Type Class ********

function TypeNumberObject(className) {
	TypeBase.call(this, "Object");
};
util.inherits(exports.TypeNumber = TypeNumber, TypeObject);

// ******** Boolean Object Type Class ********

function TypeBooleanObject(className) {
	TypeBase.call(this, "Object");
	this.value = false;
};
util.inherits(exports.TypeBoolean = TypeBoolean, TypeObject);

// ******** String Object Type Class ********

function TypeStringObject(className) {
	TypeObject.call(this, "Object");
};
util.inherits(exports.TypeString = TypeString, TypeObject);

// ******** Reference Methods ********

var Reference = exports.Reference = function() {
	this.baseValue = undefined;
	this.referencedName = "";
	this.strictReference = false;
	this._isReference = true;
};

var getBase = exports.getBase = function(v) {
	return v.baseValue;
}

var getReferencedName = exports.getReferencedName = function(v) {
	return v.referencedName;
};

var isStrictReference = exports.isStrictReference = function(v) {
	return v.strictReference;
};

var hasPrimitiveBase = exports.hasPrimitiveBase = function(v) {
	var className = getBase(v).className;
	return !~["Number", "String", "Boolean"].indexOf(className);
};

var isPropertyReference = exports.isPropertyReference = function(v) {
	return hasPrimitiveBase(v) || getBase(v).className === "Object";
};

var isUnresolvableReference = exports.isUnresolvableReference = function(v) {
	return getBase(v) === undefined;
};

var getValue = exports.getValue = function(v) {
	if (v._isReference) {
		var base = getBase(v);
		if (isUnresolvableReference(v)) {
			throw new Exceptions.ReferenceError();
		}
		var get;
		if (isPropertyReference(v)) {
			if (hasPrimitiveBase(v)) {
				get = function(p) {
					var o = toObject(base),
						desc = o.getProperty(p);
					if (desc === undefined) {
						return undefined;
					}
					if (isDataDescriptor(desc)) {
						return desc.value;
					} else {
						if (!desc.get) {
							return undefined;
						}
						return desc.get.call(base);
					}
				};
			} else {
				get = base.get;
			}
			return get(getReferencedName(v));
		} else {
			return base.getBindingValue(v);
		}
	} else {
		return v;
	}
}

var putValue = exports.putValue = function(v, w) {
	if (!v._isReference) {
		throw new Exceptions.ReferenceError();
	}
}

// ******** Type Conversions ********

exports.toPrimitive = function toPrimitive(input, preferredType) {
	if (type(input) === "Object") {
		return input.getDefaultValue(preferredType);
	} else {
		return input;
	}
};

exports.toBoolean = function toBoolean(input) {
	var newBoolean = new TypeBoolean();
	switch(type(input)) {
		case "Undefined":
			newBoolean.value = false;
			break;
		case "Null":
			newBoolean.value = false;
			break;
		case "Boolean":
			newBoolean.value = input.value;
			break;
		case "Number":
			newBoolean.value = !(input.value === 0 || input.value === NaN);
			break;
		case "String":
			newBoolean.value = input.value.length !== 0;
			break;
		case "Object":
			newBoolean.value = true;
			break;
	}
	return newBoolean;
};

exports.toNumber = function toNumber(input) {
	var newNumber = new TypeNumber();
	switch(type(input)) {
		case "Undefined":
			newNumber.value = NaN;
			break;
		case "Null":
			newNumber.value = 0;
			break;
		case "Boolean":
			newNumber.value = input.value ? 1 : 0;
			break;
		case "Number":
			newNumber.value = input.value;
			break;
		case "String":
			newNumber.value = parseFloat(input.value);
			break;
		case "Object":
			newNumber.value = toNumber(toPrimitive(input, "Number"));
			break;
	}
};

exports.toInteger = function toInteger(input) {
	var newNumber = toNumber(input);
	if (newNumber.value === NaN) {
		newNumber.value = 0;
	}
	if (newNumber.value !== Infinity && newNumber.value !== -Infinity) {
		newNumber.value = Math.floor(number.value);
	}
	return newNumber;
};

exports.toInt32 = function toInteger(input) {
	var newNumber = toNumber(input);
	if (newNumber.value === NaN || newNumber.value !== Infinity && newNumber.value !== -Infinity) {
		newNumber.value = 0;
	} else {
		newNumber.value = Math.floor(newNumber.value) % Math.pow(2,32);
		if (newNumber.value >= Math.pow(2,31)) {
			newNumber.value -= Math.pow(2,32);
		}
	}
	return newNumber;
};

exports.toUint32 = function toInteger(input) {
	var newNumber = toNumber(input);
	if (newNumber.value === NaN || newNumber.value !== Infinity && newNumber.value !== -Infinity) {
		newNumber.value = 0;
	} else {
		newNumber.value = Math.floor(newNumber.value) % Math.pow(2,32);
	}
	return newNumber;
};

exports.toUint16 = function toInteger(input) {
	var newNumber = toNumber(input);
	if (newNumber.value === NaN || newNumber.value !== Infinity && newNumber.value !== -Infinity) {
		newNumber.value = 0;
	} else {
		newNumber.value = Math.floor(newNumber.value) % Math.pow(2,16);
	}
	return newNumber;
};

exports.toString = function toString(input) {
	var newString = new TypeString();
	if (type(input) === "Object") {
		newString.value = toString(toPrimitive(input, "String"));
	} else {
		newString.value = input + "";
	}
};

exports.toObject = function toObject(input) {
	var newObject;
	switch(type(input)) {
		case "Boolean":
			newObject = new TypeBooleanObject();
			newObject.value = input.value;
			return newObject;
		case "Number":
			newObject = new TypeNumberObject();
			newObject.value = input.value;
			return newObject;
		case "String":
			newObject = new TypeStringObject();
			newObject.value = input.value;
			return newObject;
		case "Object":
			return input;
		default:
			throw new Exceptions.TypeError();
	}
};

exports.checkObjectCoercible = function checkObjectCoercible(input) {
	var inputType = type(input);
	if (inputType === "Undefined" || inputType === "Null") {
		throw new Exceptions.TypeError();
	}
};

exports.isCallable = function isCallable(input) {
	if (type(input) === "Object") {
		return !!input.call;
	} else {
		return false;
	}
};

exports.sameValue = function sameValue(x, y) {
	var typex = type(x),
		typey = type(y);
	if (typex !== typey) {
		return false;
	}
	if (typex === "Undefined" || typex === "Null") {
		return true;
	}
	if (typex === "Object") {
		return x === y;
	}
	return x.value === y.value;
};