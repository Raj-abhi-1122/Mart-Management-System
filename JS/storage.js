
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
