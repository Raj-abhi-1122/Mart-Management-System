/* =========================================================
   MART MANAGEMENT SYSTEM
   DATABASE CONFIGURATION & SEED ENGINE
   ========================================================= */

const STORAGE_KEYS = {
    PRODUCTS: "mms_products",
    INVENTORY: "mms_inventory",
    STOCK_ADJUSTMENTS: "mms_stock_adjustments",
    SUPPLIERS: "mms_suppliers",
    PURCHASES: "mms_purchases",
    BILLS: "mms_bills",
    CUSTOMERS: "mms_customers",
    EMPLOYEES: "mms_employees",
    ATTENDANCE: "mms_attendance",
    LEAVES: "mms_leaves",
    PAYROLL: "mms_payroll",
    EXPENSES: "mms_expenses",
    NOTIFICATIONS: "mms_notifications",
    ACTIVITY_LOGS: "mms_activity_logs",
    SETTINGS: "mms_settings",
    AUTH_USER: "mms_auth_user"
};

const DEFAULT_SETTINGS = {
    store: {
        name: "My Mart Supermarket",
        code: "MART001",
        owner: "Admin Owner",
        type: "Retail Supermarket",
        phone: "+91 98765 43210",
        email: "owner@mymart.com",
        address: "Shop 12-15, Main Market, Jalandhar, Punjab",
        gstNumber: "03AAAAA0000A1Z5",
        panNumber: "ABCDE1234F",
        currency: "INR"
    },
    billing: {
        invoicePrefix: "BILL",
        startingNumber: 1001,
        gstEnabled: true,
        gstPercentage: 12,
        discountEnabled: true,
        maxDiscount: 20,
        creditEnabled: true,
        creditLimit: 10000,
        roundingEnabled: true,
        autoPrint: false,
        preventInsufficientStock: true,
        allowNegativeStock: false,
        allowBillCancellation: true,
        allowBillEditing: false
    },
    inventory: {
        lowStockAlerts: true,
        expiryAlerts: true,
        expiryDays: 30,
        allowNegativeStock: false,
        stockAdjustment: true
    },
    employee: {
        overtimeEnabled: true,
        leaveEnabled: true,
        payrollEnabled: true
    },
    notifications: {
        enabled: true,
        lowStock: true,
        outOfStock: true,
        expiry: true,
        duePayment: true,
        supplierDue: true,
        leaveRequest: true,
        payroll: true
    }
};

/* Seed Data for Mart Owner */
function getInitialSeedData() {
    const today = typeof getToday === "function" ? getToday() : new Date().toISOString().split("T")[0];

    const products = [
        {
            id: "PROD-101",
            name: "Basmati Rice (1kg)",
            category: "Groceries",
            brand: "India Gate",
            purchasePrice: 75,
            sellingPrice: 95,
            stock: 85,
            minimumStock: 20,
            supplierId: "SUP-101",
            expiryDate: "2027-06-30",
            description: "Premium aged long grain basmati rice.",
            status: "Active",
            createdAt: today
        },
        {
            id: "PROD-102",
            name: "Refined Sugar (1kg)",
            category: "Groceries",
            brand: "Madhur",
            purchasePrice: 38,
            sellingPrice: 46,
            stock: 60,
            minimumStock: 15,
            supplierId: "SUP-101",
            expiryDate: "2027-12-31",
            description: "Sulphur-free clean refined crystal sugar.",
            status: "Active",
            createdAt: today
        },
        {
            id: "PROD-103",
            name: "Fortune Mustard Oil (1L)",
            category: "Groceries",
            brand: "Fortune",
            purchasePrice: 135,
            sellingPrice: 160,
            stock: 8,
            minimumStock: 15,
            supplierId: "SUP-102",
            expiryDate: "2027-08-15",
            description: "Kachi Ghani pure mustard oil bottle.",
            status: "Active",
            createdAt: today
        },
        {
            id: "PROD-104",
            name: "Dettol Bath Soap (125g)",
            category: "Personal Care",
            brand: "Dettol",
            purchasePrice: 32,
            sellingPrice: 42,
            stock: 4,
            minimumStock: 10,
            supplierId: "SUP-102",
            expiryDate: "2028-01-01",
            description: "Original antibacterial bathing bar.",
            status: "Active",
            createdAt: today
        },
        {
            id: "PROD-105",
            name: "Amul Butter (500g)",
            category: "Dairy & Bakery",
            brand: "Amul",
            purchasePrice: 240,
            sellingPrice: 275,
            stock: 25,
            minimumStock: 8,
            supplierId: "SUP-103",
            expiryDate: "2027-04-10",
            description: "Pasteurised delicious salted table butter.",
            status: "Active",
            createdAt: today
        },
        {
            id: "PROD-106",
            name: "Colgate Total Toothpaste (150g)",
            category: "Personal Care",
            brand: "Colgate",
            purchasePrice: 85,
            sellingPrice: 110,
            stock: 35,
            minimumStock: 10,
            supplierId: "SUP-102",
            expiryDate: "2027-11-20",
            description: "12-hour whole mouth antibacterial protection.",
            status: "Active",
            createdAt: today
        },
        {
            id: "PROD-107",
            name: "Whole Wheat Atta (10kg)",
            category: "Groceries",
            brand: "Aashirvaad",
            purchasePrice: 380,
            sellingPrice: 440,
            stock: 0,
            minimumStock: 5,
            supplierId: "SUP-101",
            expiryDate: "2027-05-15",
            description: "100% whole wheat sharbati flour bag.",
            status: "Active",
            createdAt: today
        }
    ];

    const inventory = products.map(product => {
        let status = "In Stock";
        if (product.stock <= 0) status = "Out of Stock";
        else if (product.stock <= product.minimumStock) status = "Low Stock";
        return {
            id: "INV-" + product.id,
            productId: product.id,
            productName: product.name,
            category: product.category,
            currentStock: product.stock,
            minimumStock: product.minimumStock,
            unitCost: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stockStatus: status,
            lastUpdated: today
        };
    });

    const suppliers = [
        {
            id: "SUP-101",
            name: "Royal Grain Wholesale",
            companyName: "Royal Grain Traders Pvt Ltd",
            contactPerson: "Rajesh Sharma",
            phone: "9876543211",
            alternatePhone: "9876543299",
            email: "rajesh@royalgrain.com",
            address: "Warehouse 4, Grain Market",
            city: "Jalandhar",
            state: "Punjab",
            pinCode: "144001",
            category: "Groceries",
            productsSupplied: "Rice, Sugar, Flour, Pulses",
            gstNumber: "03AAACR1234Q1Z1",
            paymentTerms: "15 Days",
            openingBalance: 0,
            status: "Active",
            notes: "Primary supplier for rice and flour.",
            createdAt: today,
            updatedAt: today
        },
        {
            id: "SUP-102",
            name: "Metro FMCG Distributors",
            companyName: "Metro Consumer Goods LLP",
            contactPerson: "Suresh Patel",
            phone: "9876543212",
            alternatePhone: "",
            email: "orders@metrofmcg.com",
            address: "Phase 3 Industrial Focal Point",
            city: "Ludhiana",
            state: "Punjab",
            pinCode: "141010",
            category: "Personal Care",
            productsSupplied: "Soaps, Oils, Toothpaste, Shampoos",
            gstNumber: "03AABCM9876P1Z3",
            paymentTerms: "30 Days",
            openingBalance: 12000,
            status: "Active",
            notes: "Authorized distributor for Unilever and ITC.",
            createdAt: today,
            updatedAt: today
        },
        {
            id: "SUP-103",
            name: "Fresh Dairy Supplies",
            companyName: "Fresh Daily Milk Products",
            contactPerson: "Gurpreet Singh",
            phone: "9876543213",
            alternatePhone: "",
            email: "contact@freshdairy.com",
            address: "GT Road, Near Milk Plant",
            city: "Jalandhar",
            state: "Punjab",
            pinCode: "144008",
            category: "Dairy & Bakery",
            productsSupplied: "Milk, Butter, Paneer, Curd",
            gstNumber: "03AAEFD4567M1Z8",
            paymentTerms: "Immediate",
            openingBalance: 0,
            status: "Active",
            notes: "Daily morning deliveries.",
            createdAt: today,
            updatedAt: today
        }
    ];

    const customers = [
        {
            id: "CUS-101",
            name: "Rahul Kumar",
            phone: "9876543210",
            email: "rahul.kumar@gmail.com",
            address: "128 Model Town",
            city: "Jalandhar",
            state: "Punjab",
            pinCode: "144003",
            dob: "1992-05-14",
            customerType: "Regular Customer",
            paymentTerms: "7 Days",
            creditLimit: 5000,
            totalPurchases: 25450,
            amountPaid: 25000,
            amountDue: 450,
            status: "Active",
            notes: "Loyal customer since 2024.",
            createdAt: today
        },
        {
            id: "CUS-102",
            name: "Priya Sharma",
            phone: "9823456781",
            email: "priya.sharma@gmail.com",
            address: "45 Civil Lines",
            city: "Jalandhar",
            state: "Punjab",
            pinCode: "144001",
            dob: "1995-11-20",
            customerType: "Regular Customer",
            paymentTerms: "Cash Only",
            creditLimit: 0,
            totalPurchases: 14200,
            amountPaid: 14200,
            amountDue: 0,
            status: "Active",
            notes: "Weekly grocery shopper.",
            createdAt: today
        },
        {
            id: "CUS-103",
            name: "Amit Verma",
            phone: "9811223344",
            email: "amit.verma@yahoo.com",
            address: "Flat 4B, Green Park Apartments",
            city: "Jalandhar",
            state: "Punjab",
            pinCode: "144002",
            dob: "1988-02-18",
            customerType: "VIP Customer",
            paymentTerms: "15 Days",
            creditLimit: 10000,
            totalPurchases: 38900,
            amountPaid: 37700,
            amountDue: 1200,
            status: "Active",
            notes: "High-value corporate customer.",
            createdAt: today
        }
    ];

    const employees = [
        {
            id: "EMP-001",
            name: "Ramesh Patel",
            position: "Store Manager",
            department: "Management",
            phone: "9871112233",
            email: "ramesh@mymart.com",
            salary: 35000,
            joinDate: "2024-01-15",
            address: "Near Bus Stand, Jalandhar",
            status: "Active",
            notes: "Responsible for overall mart operations."
        },
        {
            id: "EMP-002",
            name: "Neha Gupta",
            position: "Cashier",
            department: "Billing",
            phone: "9872223344",
            email: "neha@mymart.com",
            salary: 20000,
            joinDate: "2024-03-01",
            address: "Lajpat Nagar, Jalandhar",
            status: "Active",
            notes: "Primary billing and cash counter lead."
        },
        {
            id: "EMP-003",
            name: "Vikas Singh",
            position: "Store Keeper",
            department: "Inventory",
            phone: "9873334455",
            email: "vikas@mymart.com",
            salary: 18000,
            joinDate: "2024-06-10",
            address: "Rama Mandi, Jalandhar",
            status: "Active",
            notes: "Manages warehouse and stock loading."
        },
        {
            id: "EMP-004",
            name: "Sunita Rani",
            position: "Sales Executive",
            department: "Sales",
            phone: "9874445566",
            email: "sunita@mymart.com",
            salary: 16000,
            joinDate: "2025-01-05",
            address: "Adarsh Nagar, Jalandhar",
            status: "Active",
            notes: "Assists customers on the mart floor."
        }
    ];

    const bills = [
        {
            id: "BILL1001",
            billNumber: "BILL1001",
            customerId: "CUS-101",
            customerName: "Rahul Kumar",
            customerPhone: "9876543210",
            billDate: today,
            items: [
                {
                    productId: "PROD-101",
                    productName: "Basmati Rice (1kg)",
                    quantity: 4,
                    price: 95,
                    discount: 0,
                    lineTotal: 380
                },
                {
                    productId: "PROD-105",
                    productName: "Amul Butter (500g)",
                    quantity: 2,
                    price: 275,
                    discount: 10,
                    lineTotal: 540
                }
            ],
            subtotal: 930,
            taxAmount: 111.6,
            discount: 10,
            grandTotal: 1031.6,
            paidAmount: 1031.6,
            dueAmount: 0,
            paymentMethod: "Cash",
            paymentStatus: "Paid",
            createdAt: today
        },
        {
            id: "BILL1002",
            billNumber: "BILL1002",
            customerId: "CUS-102",
            customerName: "Priya Sharma",
            customerPhone: "9823456781",
            billDate: today,
            items: [
                {
                    productId: "PROD-102",
                    productName: "Refined Sugar (1kg)",
                    quantity: 5,
                    price: 46,
                    discount: 0,
                    lineTotal: 230
                },
                {
                    productId: "PROD-106",
                    productName: "Colgate Total Toothpaste (150g)",
                    quantity: 2,
                    price: 110,
                    discount: 0,
                    lineTotal: 220
                }
            ],
            subtotal: 450,
            taxAmount: 54,
            discount: 0,
            grandTotal: 504,
            paidAmount: 504,
            dueAmount: 0,
            paymentMethod: "UPI",
            paymentStatus: "Paid",
            createdAt: today
        }
    ];

    const purchases = [
        {
            id: "PUR-101",
            invoiceNumber: "INV-8901",
            supplierId: "SUP-101",
            supplierName: "Royal Grain Wholesale",
            purchaseDate: today,
            paymentMethod: "Bank Transfer",
            items: [
                {
                    productId: "PROD-101",
                    productName: "Basmati Rice (1kg)",
                    quantity: 50,
                    purchasePrice: 75,
                    lineSubtotal: 3750,
                    discount: 0,
                    lineTotal: 3750
                },
                {
                    productId: "PROD-102",
                    productName: "Refined Sugar (1kg)",
                    quantity: 50,
                    purchasePrice: 38,
                    lineSubtotal: 1900,
                    discount: 0,
                    lineTotal: 1900
                }
            ],
            subtotal: 5650,
            discount: 0,
            grandTotal: 5650,
            paidAmount: 5650,
            dueAmount: 0,
            paymentStatus: "Paid",
            notes: "Monthly staples restock order.",
            createdAt: today
        }
    ];

    const expenses = [
        {
            id: "EXP-001",
            expenseNumber: "EXP-001",
            date: today,
            category: "Electricity",
            description: "Store air-conditioning and light bill",
            amount: 6850,
            paymentMethod: "Bank Transfer",
            status: "Paid",
            reference: "EB-OCT-2026",
            createdAt: today
        },
        {
            id: "EXP-002",
            expenseNumber: "EXP-002",
            date: today,
            category: "Supplies",
            description: "Thermal POS billing paper & shopping bags",
            amount: 1450,
            paymentMethod: "Cash",
            status: "Paid",
            reference: "REC-4412",
            createdAt: today
        }
    ];

    const attendance = [
        {
            id: "ATT-" + today + "-EMP-001",
            date: today,
            employeeId: "EMP-001",
            employeeName: "Ramesh Patel",
            position: "Store Manager",
            checkIn: "08:45 AM",
            checkOut: "07:00 PM",
            workingHours: "10h 15m",
            status: "Present"
        },
        {
            id: "ATT-" + today + "-EMP-002",
            date: today,
            employeeId: "EMP-002",
            employeeName: "Neha Gupta",
            position: "Cashier",
            checkIn: "09:00 AM",
            checkOut: "06:30 PM",
            workingHours: "9h 30m",
            status: "Present"
        },
        {
            id: "ATT-" + today + "-EMP-003",
            date: today,
            employeeId: "EMP-003",
            employeeName: "Vikas Singh",
            position: "Store Keeper",
            checkIn: "09:10 AM",
            checkOut: "06:00 PM",
            workingHours: "8h 50m",
            status: "Present"
        },
        {
            id: "ATT-" + today + "-EMP-004",
            date: today,
            employeeId: "EMP-004",
            employeeName: "Sunita Rani",
            position: "Sales Executive",
            checkIn: "09:00 AM",
            checkOut: "01:30 PM",
            workingHours: "4h 30m",
            status: "Half Day"
        }
    ];

    const notifications = [
        {
            id: "NOTIF-001",
            title: "Out of Stock Warning",
            message: "Whole Wheat Atta (10kg) is completely out of stock. Please place an order.",
            type: "Inventory",
            priority: "Critical",
            date: today,
            read: false
        },
        {
            id: "NOTIF-002",
            title: "Low Stock Alert",
            message: "Dettol Bath Soap (125g) is running low: only 4 units remaining.",
            type: "Inventory",
            priority: "High",
            date: today,
            read: false
        },
        {
            id: "NOTIF-003",
            title: "Low Stock Alert",
            message: "Fortune Mustard Oil (1L) has 8 units left (below minimum 15).",
            type: "Inventory",
            priority: "High",
            date: today,
            read: false
        },
        {
            id: "NOTIF-004",
            title: "Supplier Payment Due",
            message: "Pending payment of ₹12,000 due to Metro FMCG Distributors.",
            type: "Purchase",
            priority: "Medium",
            date: today,
            read: false
        }
    ];

    const activityLogs = [
        {
            id: "ACT-001",
            timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            date: today,
            user: "Admin Owner",
            action: "System Started",
            module: "System",
            details: "Mart Management System loaded successfully with ready demo store."
        },
        {
            id: "ACT-002",
            timestamp: "10:30 AM",
            date: today,
            user: "Admin Owner",
            action: "Bill Generated",
            module: "Billing",
            details: "Generated invoice BILL1001 for ₹1,031.60 for Rahul Kumar."
        },
        {
            id: "ACT-003",
            timestamp: "11:15 AM",
            date: today,
            user: "Admin Owner",
            action: "Bill Generated",
            module: "Billing",
            details: "Generated invoice BILL1002 for ₹504.00 for Priya Sharma."
        }
    ];

    return {
        products,
        inventory,
        suppliers,
        customers,
        employees,
        bills,
        purchases,
        expenses,
        attendance,
        notifications,
        activityLogs
    };
}

/* =========================================================
   INITIALIZE DATABASE
   ========================================================= */
function initializeDatabase() {
    const seed = getInitialSeedData();

    // Map each key to its seed data
    const keyDataMap = [
        { key: STORAGE_KEYS.PRODUCTS, data: seed.products },
        { key: STORAGE_KEYS.INVENTORY, data: seed.inventory },
        { key: STORAGE_KEYS.STOCK_ADJUSTMENTS, data: [] },
        { key: STORAGE_KEYS.SUPPLIERS, data: seed.suppliers },
        { key: STORAGE_KEYS.PURCHASES, data: seed.purchases },
        { key: STORAGE_KEYS.BILLS, data: seed.bills },
        { key: STORAGE_KEYS.CUSTOMERS, data: seed.customers },
        { key: STORAGE_KEYS.EMPLOYEES, data: seed.employees },
        { key: STORAGE_KEYS.ATTENDANCE, data: seed.attendance },
        { key: STORAGE_KEYS.LEAVES, data: [] },
        { key: STORAGE_KEYS.PAYROLL, data: [] },
        { key: STORAGE_KEYS.EXPENSES, data: seed.expenses },
        { key: STORAGE_KEYS.NOTIFICATIONS, data: seed.notifications },
        { key: STORAGE_KEYS.ACTIVITY_LOGS, data: seed.activityLogs }
    ];

    keyDataMap.forEach(function (item) {
        // An empty collection is valid user data. Seed only keys that have never
        // been initialized so intentionally empty tables stay empty on refresh.
        if (!Storage.exists(item.key)) {
            Storage.set(item.key, item.data);
        }
    });

    if (!Storage.exists(STORAGE_KEYS.SETTINGS)) {
        Storage.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }

    // Default admin user if not set
    if (!Storage.exists(STORAGE_KEYS.AUTH_USER)) {
        Storage.set(STORAGE_KEYS.AUTH_USER, {
            email: "admin@gmail.com",
            name: "Admin Mart Owner",
            role: "Owner",
            isLoggedIn: true
        });
    }

    console.log("MMS LocalStorage database initialized with complete live data.");
}

initializeDatabase();
