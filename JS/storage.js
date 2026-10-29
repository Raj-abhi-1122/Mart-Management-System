
/* =========================================================
   MART MANAGEMENT SYSTEM
   PHASE 2 - STEP 1
   LOCAL STORAGE ENGINE
   ========================================================= */

const Storage = {

    // Save data to Local Storage.
    set: function (key, value) {
        try {
            if (typeof key !== "string" || key.trim() === "") {
                console.error("Storage Error: Invalid key.");
                return false;
            }

            const serializedData = JSON.stringify(value);

            // JSON.stringify(undefined) returns undefined.
            if (serializedData === undefined) {
                console.error("Storage Error: Value cannot be serialized.");
                return false;
            }

            localStorage.setItem(key, serializedData);
            return true;

        } catch (error) {
            console.error("Storage Error:", error);
            return false;
        }
    },

    // Commit related collections together and restore their previous values
    // if any write fails. This is best-effort because browser storage itself
    // does not provide a true multi-key transaction.
    setMany: function (entries) {
        if (!Array.isArray(entries) || entries.length === 0) return false;
        const staged = [];
        const previous = new Map();
        try {
            for (const entry of entries) {
                if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || !entry[0].trim()) return false;
                const serialized = JSON.stringify(entry[1]);
                if (serialized === undefined) return false;
                staged.push([entry[0], serialized]);
                if (!previous.has(entry[0])) previous.set(entry[0], localStorage.getItem(entry[0]));
            }
            for (const [key, serialized] of staged) localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            Array.from(previous.entries()).reverse().forEach(([key, oldValue]) => {
                try {
                    if (oldValue === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, oldValue);
                } catch (rollbackError) {
                    console.error("Storage rollback error:", rollbackError);
                }
            });
            console.error("Storage transaction error:", error);
            return false;
        }
    },

    // Read data from Local Storage.
    get: function (key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);

            if (data === null) {
                return defaultValue;
            }

            return JSON.parse(data);

        } catch (error) {
            console.error("Storage Read Error:", error);
            return defaultValue;
        }
    },

    // Remove one specific key.
    remove: function (key) {
        try {
            localStorage.removeItem(key);
            return true;

        } catch (error) {
            console.error("Storage Remove Error:", error);
            return false;
        }
    },

    // Check whether a key exists.
    exists: function (key) {
        try {
            return localStorage.getItem(key) !== null;

        } catch (error) {
            console.error("Storage Exists Error:", error);
            return false;
        }
    },

    // Clear only Mart Management System data.
    clear: function () {
        try {
            const prefix = "mms_";

            const applicationKeys = Object.keys(localStorage)
                .filter(function (key) {
                    return key.startsWith(prefix);
                });

            applicationKeys.forEach(function (key) {
                localStorage.removeItem(key);
            });

            return true;

        } catch (error) {
            console.error("Storage Clear Error:", error);
            return false;
        }
    }

};
