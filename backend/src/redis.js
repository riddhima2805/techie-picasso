
require("dotenv").config();
const EventEmitter = require("events");


let pub;
let subscriber;

try {
	if (process.env.REDIS_URL) {
		const Redis = require("ioredis");
		const redisOpts = { lazyConnect: false, enableOfflineQueue: true };
		pub  = new Redis(process.env.REDIS_URL, redisOpts);

		subscriber = new Redis(process.env.REDIS_URL, redisOpts);

		pub.on(
            "error",  (e) => console.error("[redis:pub]", e.message)
    );
		subscriber.on(
            "error", (e) => console.error("[redis:sub]", e.message)
        );
	} else {
		throw new Error("no-redis-url");
	}
} catch (e) {
	console.warn("[redis] falling back to in-memory pub/sub", e && e.message);
	const ee = new EventEmitter();
	const patterns = new Set();

	pub = {
		publish(channel, message) {
			// async emit so callers that await promise behavior work similarly
			process.nextTick(() => ee.emit("message", channel, message));
			return Promise.resolve(1);
		},
		on(ev, fn) { ee.on(ev, fn); },
	};

	subscriber = {
		psubscribe(pattern, cb) {
			patterns.add(pattern);
			process.nextTick(() => cb && cb(null, pattern));
		},
		on(ev, fn) {
			if (ev === "pmessage") {
				ee.on("message", (channel, message) => {
					for (const pattern of patterns) {
						if (pattern.endsWith("*")) {
							const prefix = pattern.slice(0, -1);
							if (channel.startsWith(prefix)) fn(pattern, channel, message);
						} else if (pattern === channel) {
							fn(pattern, channel, message);}
					}
				});
			} else if (ev === "error") {
				// no fallback
			}
		},
	};
}

module.exports = { pub, subscriber };
