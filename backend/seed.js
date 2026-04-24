require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL. Starting seed...\n');

    // ── Drop tables in reverse dependency order ──
    await client.query(`
      DROP TABLE IF EXISTS alerts CASCADE;
      DROP TABLE IF EXISTS transfer_templates CASCADE;
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS transfers CASCADE;
      DROP TABLE IF EXISTS beneficiaries CASCADE;
      DROP TABLE IF EXISTS currencies CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('Dropped all existing tables.');

    // ── Create tables ──
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        phone VARCHAR(50),
        address TEXT,
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        account_number VARCHAR(50) UNIQUE,
        account_type VARCHAR(50) DEFAULT 'standard',
        balance DECIMAL(15,2) DEFAULT 0,
        kyc_status VARCHAR(50) DEFAULT 'verified',
        risk_level VARCHAR(50) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE currencies (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(10),
        exchange_rate_to_usd DECIMAL(15,6) NOT NULL,
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE beneficiaries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        bank_name VARCHAR(255),
        account_number VARCHAR(100),
        swift_code VARCHAR(50),
        country VARCHAR(100),
        currency VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE transfers (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        beneficiary_id INTEGER REFERENCES beneficiaries(id),
        amount DECIMAL(15,2) NOT NULL,
        converted_amount DECIMAL(15,2),
        source_currency VARCHAR(10),
        target_currency VARCHAR(10),
        exchange_rate DECIMAL(15,6),
        status VARCHAR(50) DEFAULT 'pending',
        reference_number VARCHAR(100) UNIQUE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10),
        description TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        reference VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE transfer_templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        beneficiary_id INTEGER REFERENCES beneficiaries(id),
        amount DECIMAL(15,2),
        source_currency VARCHAR(10),
        target_currency VARCHAR(10),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        currency_pair VARCHAR(20) NOT NULL,
        target_rate DECIMAL(15,6) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Created all tables.\n');

    // ── Hash password ──
    const hashedPassword = await bcrypt.hash('password123', 10);

    // ── Seed users ──
    const users = [
      ['John Smith', 'demo@aiautomateintl.com', 'admin', '+1-202-555-0100', '123 Main St, Washington DC', 'United States'],
      ['Maria Garcia', 'maria.garcia@example.com', 'customer', '+34-91-555-0101', 'Calle Mayor 10, Madrid', 'Spain'],
      ['Yuki Tanaka', 'yuki.tanaka@example.com', 'customer', '+81-3-5555-0102', '1-2-3 Shibuya, Tokyo', 'Japan'],
      ['Ahmed Hassan', 'ahmed.hassan@example.com', 'customer', '+971-4-555-0103', 'Sheikh Zayed Rd, Dubai', 'United Arab Emirates'],
      ['Priya Sharma', 'priya.sharma@example.com', 'customer', '+91-11-5555-0104', '45 MG Road, Mumbai', 'India'],
      ['Hans Mueller', 'hans.mueller@example.com', 'customer', '+49-30-555-0105', 'Friedrichstr 50, Berlin', 'Germany'],
      ['Fatima Al-Rashid', 'fatima.alrashid@example.com', 'customer', '+966-11-555-0106', 'King Fahd Rd, Riyadh', 'Saudi Arabia'],
      ['Chen Wei', 'chen.wei@example.com', 'customer', '+86-10-5555-0107', '88 Nanjing Rd, Shanghai', 'China'],
      ['Olga Petrova', 'olga.petrova@example.com', 'customer', '+7-495-555-0108', 'Tverskaya 25, Moscow', 'Russia'],
      ['Carlos Silva', 'carlos.silva@example.com', 'customer', '+55-11-5555-0109', 'Av Paulista 1000, Sao Paulo', 'Brazil'],
      ['Emma Wilson', 'emma.wilson@example.com', 'agent', '+44-20-5555-0110', '10 Downing St, London', 'United Kingdom'],
      ['Kim Soo-Jin', 'kim.soojin@example.com', 'customer', '+82-2-5555-0111', 'Gangnam-gu, Seoul', 'South Korea'],
      ['Luca Rossi', 'luca.rossi@example.com', 'customer', '+39-06-555-0112', 'Via Roma 15, Rome', 'Italy'],
      ['Amara Okafor', 'amara.okafor@example.com', 'customer', '+234-1-555-0113', 'Victoria Island, Lagos', 'Nigeria'],
      ['Sophie Dubois', 'sophie.dubois@example.com', 'customer', '+33-1-5555-0114', '5 Rue de Rivoli, Paris', 'France'],
      ['James O\'Brien', 'james.obrien@example.com', 'manager', '+353-1-555-0115', 'Grafton St, Dublin', 'Ireland'],
      ['Mei Lin', 'mei.lin@example.com', 'customer', '+65-6555-0116', 'Orchard Rd, Singapore', 'Singapore'],
      ['Raj Patel', 'raj.patel@example.com', 'customer', '+91-22-5555-0117', 'Andheri West, Mumbai', 'India'],
      ['Anna Svensson', 'anna.svensson@example.com', 'customer', '+46-8-555-0118', 'Drottninggatan 20, Stockholm', 'Sweden'],
      ['Mohammed Ali', 'mohammed.ali@example.com', 'customer', '+20-2-5555-0119', 'Tahrir Square, Cairo', 'Egypt'],
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (name, email, password, role, phone, address, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u[0], u[1], hashedPassword, u[2], u[3], u[4], u[5]]
      );
    }
    console.log(`Seeded ${users.length} users.`);

    // ── Seed customers ──
    const customerData = [
      [1, 'ACC-100001', 'premium',  25000.00, 'verified', 'low'],
      [2, 'ACC-100002', 'standard',  4500.50, 'verified', 'low'],
      [3, 'ACC-100003', 'standard',  8200.00, 'verified', 'low'],
      [4, 'ACC-100004', 'business', 150000.00, 'verified', 'low'],
      [5, 'ACC-100005', 'standard',  3200.75, 'pending',  'medium'],
      [6, 'ACC-100006', 'premium',  42000.00, 'verified', 'low'],
      [7, 'ACC-100007', 'business', 98000.00, 'verified', 'low'],
      [8, 'ACC-100008', 'standard', 12500.00, 'verified', 'low'],
      [9, 'ACC-100009', 'standard',  6700.30, 'review',   'high'],
      [10,'ACC-100010', 'premium',  18000.00, 'verified', 'low'],
      [11,'ACC-100011', 'standard',  9800.00, 'verified', 'low'],
      [12,'ACC-100012', 'standard',  5400.25, 'pending',  'medium'],
      [13,'ACC-100013', 'business', 67000.00, 'verified', 'low'],
      [14,'ACC-100014', 'standard',  2100.00, 'review',   'high'],
      [15,'ACC-100015', 'premium',  31000.50, 'verified', 'low'],
      [16,'ACC-100016', 'standard', 11200.00, 'verified', 'low'],
      [17,'ACC-100017', 'business', 88000.00, 'verified', 'low'],
      [18,'ACC-100018', 'standard',  4300.80, 'pending',  'medium'],
      [19,'ACC-100019', 'premium',  27500.00, 'verified', 'low'],
      [20,'ACC-100020', 'standard',  7600.00, 'verified', 'low'],
    ];

    for (const c of customerData) {
      await client.query(
        `INSERT INTO customers (user_id, account_number, account_type, balance, kyc_status, risk_level)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        c
      );
    }
    console.log(`Seeded ${customerData.length} customers.`);

    // ── Seed currencies ──
    const currencyData = [
      ['USD', 'US Dollar',              '$',   1.000000, 'United States'],
      ['EUR', 'Euro',                   '\u20AC',   0.920000, 'European Union'],
      ['GBP', 'British Pound',          '\u00A3',   0.790000, 'United Kingdom'],
      ['JPY', 'Japanese Yen',           '\u00A5', 149.500000, 'Japan'],
      ['AUD', 'Australian Dollar',      'A$',  1.530000, 'Australia'],
      ['CAD', 'Canadian Dollar',        'C$',  1.360000, 'Canada'],
      ['CHF', 'Swiss Franc',            'CHF', 0.880000, 'Switzerland'],
      ['CNY', 'Chinese Yuan',           '\u00A5',   7.240000, 'China'],
      ['INR', 'Indian Rupee',           '\u20B9',  83.100000, 'India'],
      ['MXN', 'Mexican Peso',           'Mex$',17.150000, 'Mexico'],
      ['BRL', 'Brazilian Real',         'R$',  4.970000, 'Brazil'],
      ['SGD', 'Singapore Dollar',       'S$',  1.340000, 'Singapore'],
      ['HKD', 'Hong Kong Dollar',       'HK$', 7.830000, 'Hong Kong'],
      ['SEK', 'Swedish Krona',          'kr',  10.450000, 'Sweden'],
      ['NOK', 'Norwegian Krone',        'kr',  10.620000, 'Norway'],
      ['NZD', 'New Zealand Dollar',     'NZ$', 1.640000, 'New Zealand'],
      ['ZAR', 'South African Rand',     'R',   18.900000, 'South Africa'],
      ['TRY', 'Turkish Lira',           '\u20BA',  27.200000, 'Turkey'],
      ['KRW', 'South Korean Won',       '\u20A9',1320.000000, 'South Korea'],
      ['AED', 'UAE Dirham',             'AED', 3.673000, 'United Arab Emirates'],
    ];

    for (const c of currencyData) {
      await client.query(
        `INSERT INTO currencies (code, name, symbol, exchange_rate_to_usd, country)
         VALUES ($1, $2, $3, $4, $5)`,
        c
      );
    }
    console.log(`Seeded ${currencyData.length} currencies.`);

    // ── Seed beneficiaries ──
    const beneficiaryData = [
      [1, 'Carlos Mendez',       'carlos.m@example.com',   'BBVA Bancomer',            'MX1234567890', 'BBVAMXMM', 'Mexico',         'MXN'],
      [1, 'Sarah Johnson',       'sarah.j@example.com',    'Bank of America',           'US9876543210', 'BOFAUS3N', 'United States',  'USD'],
      [2, 'Pierre Laurent',      'pierre.l@example.com',   'BNP Paribas',               'FR7612345678', 'BNPAFRPP', 'France',         'EUR'],
      [3, 'Takeshi Yamamoto',    'takeshi.y@example.com',  'Mizuho Bank',               'JP0011223344', 'MHCBJPJT', 'Japan',          'JPY'],
      [4, 'Aisha Khan',          'aisha.k@example.com',    'Emirates NBD',              'AE1234567890', 'EABORAED', 'United Arab Emirates','AED'],
      [5, 'Vikram Joshi',        'vikram.j@example.com',   'State Bank of India',       'IN5566778899', 'SBININBB', 'India',          'INR'],
      [6, 'Klaus Richter',       'klaus.r@example.com',    'Deutsche Bank',             'DE8877665544', 'DEUTDEFF', 'Germany',        'EUR'],
      [7, 'Nora Al-Fayed',       'nora.af@example.com',    'Saudi National Bank',       'SA3344556677', 'NCBKSAJE', 'Saudi Arabia',   'SAR'],
      [8, 'Li Jing',             'li.jing@example.com',    'Bank of China',             'CN1122334455', 'BKCHCNBJ', 'China',          'CNY'],
      [9, 'Dmitri Volkov',       'dmitri.v@example.com',   'Sberbank',                  'RU9988776655', 'SABRRUMM', 'Russia',         'RUB'],
      [10,'Isabela Costa',       'isabela.c@example.com',  'Banco do Brasil',           'BR6655443322', 'BRASBRRJ', 'Brazil',         'BRL'],
      [11,'Oliver Brown',        'oliver.b@example.com',   'HSBC UK',                   'GB1234509876', 'HBUKGB4B', 'United Kingdom', 'GBP'],
      [12,'Park Ji-Hye',         'park.jh@example.com',    'KB Kookmin Bank',           'KR5544332211', 'CZNBKRSE', 'South Korea',    'KRW'],
      [13,'Marco Bianchi',       'marco.b@example.com',    'UniCredit',                 'IT7766554433', 'UNCRITMM', 'Italy',          'EUR'],
      [14,'Chioma Eze',          'chioma.e@example.com',   'Zenith Bank',               'NG1122009988', 'ZEABORLA', 'Nigeria',        'NGN'],
      [15,'Chloe Martin',        'chloe.m@example.com',    'Societe Generale',          'FR8899001122', 'SOGEFRPP', 'France',         'EUR'],
      [16,'Sean Murphy',         'sean.m@example.com',     'Allied Irish Banks',        'IE2233445566', 'AABORIED', 'Ireland',        'EUR'],
      [1, 'Emily Chang',         'emily.c@example.com',    'DBS Bank',                  'SG7788990011', 'DBSSSGSG', 'Singapore',      'SGD'],
      [2, 'Erik Johansson',      'erik.j@example.com',     'Nordea',                    'SE3344556677', 'NDEASESS', 'Sweden',         'SEK'],
      [4, 'Abdullah Nasser',     'abdullah.n@example.com', 'Abu Dhabi Commercial Bank', 'AE9988776655', 'ADCBAEAA', 'United Arab Emirates','AED'],
    ];

    for (const b of beneficiaryData) {
      await client.query(
        `INSERT INTO beneficiaries (user_id, name, email, bank_name, account_number, swift_code, country, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        b
      );
    }
    console.log(`Seeded ${beneficiaryData.length} beneficiaries.`);

    // ── Seed transfers ──
    const transferData = [
      [1, 1,  5000.00,  85750.00, 'USD','MXN', 17.150000,'completed','TRF-2026-00001','Monthly family support'],
      [1, 2,  2500.00,   2500.00, 'USD','USD',  1.000000,'completed','TRF-2026-00002','Rent payment'],
      [2, 3,  1200.00,   1104.00, 'USD','EUR',  0.920000,'completed','TRF-2026-00003','Invoice payment to supplier'],
      [3, 4,  3000.00, 448500.00, 'USD','JPY',149.500000,'processing','TRF-2026-00004','Tuition fee'],
      [4, 5, 10000.00,  36730.00, 'USD','AED',  3.673000,'completed','TRF-2026-00005','Business purchase'],
      [5, 6,   800.00,  66480.00, 'USD','INR', 83.100000,'pending',  'TRF-2026-00006','Gift to family'],
      [6, 7,  4500.00,   4140.00, 'USD','EUR',  0.920000,'completed','TRF-2026-00007','Consulting fee'],
      [7, 8, 15000.00,  15000.00, 'USD','SAR',  3.750000,'failed',   'TRF-2026-00008','Equipment purchase'],
      [8, 9,  2000.00,  14480.00, 'USD','CNY',  7.240000,'completed','TRF-2026-00009','Product samples'],
      [9,10,   600.00,    600.00, 'USD','RUB', 92.500000,'cancelled','TRF-2026-00010','Personal transfer'],
      [10,11, 1500.00,   7455.00, 'USD','BRL',  4.970000,'completed','TRF-2026-00011','Software license'],
      [11,12, 3200.00,   2528.00, 'USD','GBP',  0.790000,'completed','TRF-2026-00012','Property management fee'],
      [12,13, 7500.00,9900000.00, 'USD','KRW',1320.000000,'processing','TRF-2026-00013','Korean supplier payment'],
      [13,14, 2800.00,   2576.00, 'USD','EUR',  0.920000,'pending',  'TRF-2026-00014','Design services'],
      [14,15,  450.00,    450.00, 'USD','NGN',775.000000,'completed','TRF-2026-00015','Donation'],
      [15,16, 6000.00,   5520.00, 'USD','EUR',  0.920000,'completed','TRF-2026-00016','Quarterly retainer'],
      [1, 18, 1800.00,   2412.00, 'USD','SGD',  1.340000,'completed','TRF-2026-00017','Investment transfer'],
      [2, 19, 3500.00,  36575.00, 'USD','SEK', 10.450000,'pending',  'TRF-2026-00018','Freelance payment'],
      [4, 20, 8000.00,  29384.00, 'USD','AED',  3.673000,'completed','TRF-2026-00019','Partnership distribution'],
      [1, 1,  4200.00,  72030.00, 'USD','MXN', 17.150000,'processing','TRF-2026-00020','Recurring support March'],
    ];

    for (const t of transferData) {
      await client.query(
        `INSERT INTO transfers (sender_id, beneficiary_id, amount, converted_amount, source_currency, target_currency, exchange_rate, status, reference_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        t
      );
    }
    console.log(`Seeded ${transferData.length} transfers.`);

    // ── Seed transactions ──
    const transactionData = [
      [1, 'deposit',    10000.00,'USD','Initial account funding',        'completed','TXN-2026-00001'],
      [1, 'transfer',    5000.00,'USD','Transfer to Carlos Mendez',      'completed','TXN-2026-00002'],
      [2, 'deposit',     5000.00,'EUR','Wire deposit from employer',     'completed','TXN-2026-00003'],
      [2, 'transfer',    1200.00,'USD','Payment to Pierre Laurent',      'completed','TXN-2026-00004'],
      [3, 'deposit',     8000.00,'JPY','ATM deposit',                    'completed','TXN-2026-00005'],
      [3, 'exchange',    3000.00,'USD','USD to JPY exchange',            'completed','TXN-2026-00006'],
      [4, 'deposit',   50000.00,'AED','Business capital injection',     'completed','TXN-2026-00007'],
      [4, 'withdrawal', 10000.00,'USD','ATM withdrawal',                 'completed','TXN-2026-00008'],
      [5, 'deposit',     2000.00,'INR','Salary deposit',                 'completed','TXN-2026-00009'],
      [5, 'transfer',     800.00,'USD','Family support transfer',        'pending',  'TXN-2026-00010'],
      [6, 'deposit',    15000.00,'EUR','Contract payment received',      'completed','TXN-2026-00011'],
      [6, 'exchange',    4500.00,'USD','EUR to USD exchange',            'completed','TXN-2026-00012'],
      [7, 'deposit',    30000.00,'SAR','Investment returns',             'completed','TXN-2026-00013'],
      [8, 'deposit',     6000.00,'CNY','Product sales revenue',          'completed','TXN-2026-00014'],
      [8, 'transfer',    2000.00,'USD','Supplier payment',               'completed','TXN-2026-00015'],
      [9, 'withdrawal',  1000.00,'RUB','Cash withdrawal',               'completed','TXN-2026-00016'],
      [10,'deposit',     3000.00,'BRL','Freelance income',               'completed','TXN-2026-00017'],
      [11,'exchange',    3200.00,'USD','USD to GBP exchange',            'completed','TXN-2026-00018'],
      [12,'deposit',     9000.00,'KRW','Salary deposit',                 'completed','TXN-2026-00019'],
      [13,'transfer',    2800.00,'EUR','Design services payment',        'pending',  'TXN-2026-00020'],
    ];

    for (const t of transactionData) {
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, description, status, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        t
      );
    }
    console.log(`Seeded ${transactionData.length} transactions.`);

    // ── Seed chat_messages ──
    const chatData = [
      [1, 'user',      'Hi, I need to send money to Mexico.'],
      [1, 'assistant', 'Sure! I can help you with that. How much would you like to send and to which beneficiary?'],
      [1, 'user',      'I want to send $5,000 USD to Carlos Mendez.'],
      [1, 'assistant', 'The current exchange rate is 1 USD = 17.15 MXN. Carlos would receive approximately 85,750 MXN. Shall I proceed?'],
      [1, 'user',      'Yes, please go ahead.'],
      [1, 'assistant', 'Transfer initiated! Reference number: TRF-2026-00001. The funds should arrive within 1-2 business days.'],
      [2, 'user',      'What is the current EUR to USD rate?'],
      [2, 'assistant', 'The current EUR/USD rate is 0.9200. This means 1 USD = 0.92 EUR, or 1 EUR = approximately 1.087 USD.'],
      [2, 'user',      'Can I set up an alert when EUR/USD reaches 0.90?'],
      [2, 'assistant', 'I have created a rate alert for EUR/USD at 0.90. You will be notified when the rate reaches your target.'],
      [3, 'user',      'How do I add a new beneficiary?'],
      [3, 'assistant', 'You can add a new beneficiary by going to the Beneficiaries section. You will need their name, bank name, account number, SWIFT code, and country.'],
      [4, 'user',      'I want to check the status of my transfer TRF-2026-00005.'],
      [4, 'assistant', 'Transfer TRF-2026-00005 for $10,000 USD to AED has been completed successfully. The recipient received 36,730 AED.'],
      [5, 'user',      'Can you show me my recent transactions?'],
      [5, 'assistant', 'Here are your recent transactions: 1) Deposit of $2,000 INR on March 10. 2) Transfer of $800 USD (pending) on March 12. Would you like more details?'],
      [6, 'user',      'I need to cancel my pending transfer.'],
      [6, 'assistant', 'I can see you have no pending transfers at the moment. All your recent transfers have been completed. Is there anything else I can help with?'],
      [11,'user',      'What currencies do you support?'],
      [11,'assistant', 'We support over 20 currencies including USD, EUR, GBP, JPY, AUD, CAD, CHF, CNY, INR, MXN, BRL, SGD, HKD, SEK, NOK, NZD, ZAR, TRY, KRW, and AED.'],
      [8, 'user',      'How long does a transfer to China take?'],
      [8, 'assistant', 'Transfers to China typically take 1-3 business days depending on the receiving bank. CNY transfers via Bank of China are usually processed within 1 business day.'],
    ];

    for (const m of chatData) {
      await client.query(
        `INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)`,
        m
      );
    }
    console.log(`Seeded ${chatData.length} chat_messages.`);

    // ── Seed transfer_templates ──
    const templateData = [
      [1, 'Monthly family support',       1,  5000.00,'USD','MXN','Monthly support payment to Carlos'],
      [1, 'Rent payment US',              2,  2500.00,'USD','USD','Monthly rent payment'],
      [2, 'Supplier invoice France',      3,  1200.00,'USD','EUR','Regular supplier payment'],
      [3, 'Tuition fee Japan',            4,  3000.00,'USD','JPY','University tuition payment'],
      [4, 'Business purchase UAE',        5, 10000.00,'USD','AED','Regular business purchase'],
      [5, 'Family gift India',            6,   800.00,'USD','INR','Monthly gift to parents'],
      [6, 'Consulting fee Germany',       7,  4500.00,'USD','EUR','Monthly consulting retainer'],
      [7, 'Equipment payment KSA',        8, 15000.00,'USD','SAR','Quarterly equipment purchase'],
      [8, 'Product samples China',        9,  2000.00,'USD','CNY','Monthly sample order'],
      [10,'Software license Brazil',     11,  1500.00,'USD','BRL','Annual software license'],
      [11,'Property management UK',      12,  3200.00,'USD','GBP','Monthly management fee'],
      [12,'Supplier Korea',             13,  7500.00,'USD','KRW','Bi-weekly supplier payment'],
      [13,'Design services Italy',      14,  2800.00,'USD','EUR','Freelance design payment'],
      [14,'Charity donation Nigeria',   15,   450.00,'USD','NGN','Monthly charitable donation'],
      [15,'Quarterly retainer France',  16,  6000.00,'USD','EUR','Quarterly consulting retainer'],
      [1, 'Investment Singapore',       18,  1800.00,'USD','SGD','Monthly investment transfer'],
      [2, 'Freelance Sweden',           19,  3500.00,'USD','SEK','Monthly freelance payment'],
      [4, 'Partnership distribution',   20,  8000.00,'USD','AED','Quarterly partner payout'],
      [1, 'Emergency fund Mexico',       1,  1000.00,'USD','MXN','Emergency fund top-up'],
      [6, 'Tax payment DE',              7,  2200.00,'EUR','EUR','Quarterly tax payment'],
    ];

    for (const t of templateData) {
      await client.query(
        `INSERT INTO transfer_templates (user_id, name, beneficiary_id, amount, source_currency, target_currency, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        t
      );
    }
    console.log(`Seeded ${templateData.length} transfer_templates.`);

    // ── Seed alerts ──
    const alertData = [
      [1, 'USD/MXN', 16.500000,'below', true],
      [1, 'EUR/USD',  0.900000,'below', true],
      [2, 'EUR/USD',  0.950000,'above', true],
      [3, 'USD/JPY',145.000000,'below', true],
      [3, 'USD/JPY',155.000000,'above', true],
      [4, 'USD/AED',  3.650000,'below', true],
      [5, 'USD/INR', 80.000000,'below', true],
      [5, 'USD/INR', 85.000000,'above', false],
      [6, 'EUR/USD',  0.880000,'below', true],
      [8, 'USD/CNY',  7.000000,'below', true],
      [8, 'USD/CNY',  7.500000,'above', true],
      [10,'USD/BRL',  4.800000,'below', true],
      [11,'GBP/USD',  0.750000,'below', true],
      [12,'USD/KRW',1280.000000,'below', true],
      [13,'EUR/USD',  0.900000,'below', true],
      [15,'EUR/USD',  0.950000,'above', false],
      [1, 'GBP/USD',  0.800000,'above', true],
      [4, 'USD/AED',  3.700000,'above', true],
      [9, 'USD/RUB', 88.000000,'below', true],
      [19,'USD/SEK', 10.000000,'below', true],
    ];

    for (const a of alertData) {
      await client.query(
        `INSERT INTO alerts (user_id, currency_pair, target_rate, direction, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        a
      );
    }
    console.log(`Seeded ${alertData.length} alerts.\n`);

    // ── Print record counts ──
    const tables = ['users','customers','currencies','beneficiaries','transfers','transactions','chat_messages','transfer_templates','alerts'];
    console.log('=== Record Counts ===');
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${res.rows[0].count}`);
    }
    console.log('\nSeed completed successfully!');

  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
