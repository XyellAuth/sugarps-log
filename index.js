const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

// Path penyimpanan data di VPS (dengan path absolut, pastikan folder "players" ada)
const PLAYER_DATA_DIR = path.join('C:', 'Users', 'Administrator', 'Desktop', 'CPP YIDS STORE', 'UNKNOWN CORE', 'players'); // Path Windows

// Pastikan folder penyimpanan sudah ada
if (!fs.existsSync(PLAYER_DATA_DIR)) {
    fs.mkdirSync(PLAYER_DATA_DIR, { recursive: true });
}

// Middleware
app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

// Log IP setiap request
app.use((req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log(`[${new Date().toLocaleString()}] Client IP: ${clientIp}`);
    next();
});

// Endpoint untuk login
app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); 
        const uName = uData[0].split('|'); 
        const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { 
            const d = uData[i].split('|'); 
            tData[d[0]] = d[1]; 
        }
        if (uName[1] && uPass[1]) { 
            res.redirect('/player/growid/login/validate'); 
        }
    } catch (why) { 
        console.log(`Warning: ${why}`); 
    }

    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

// Endpoint untuk validasi login
app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

    res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

// Endpoint untuk memeriksa token
app.all('/player/growid/checktoken', (req, res) => {
    const refreshToken = req.body;
    let data = {
        status: "success",
        message: "Account Validated",
        token: refreshToken,
        url: "",
        accountType: "growtopia"
    };
    res.send(data);
});

// Endpoint untuk registrasi pemain
app.post('/player/growid/register/validate', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log(`[${new Date().toLocaleString()}] Register Request from IP: ${clientIp}`);

    const { growId, password } = req.body;

    if (!growId || !password) {
        return res.status(400).json({ error: 'GrowID dan password harus diisi.' });
    }

    const playerDataPath = path.join(PLAYER_DATA_DIR, `${growId}.json`);

    // Periksa apakah GrowID sudah terdaftar
    if (fs.existsSync(playerDataPath)) {
        return res.status(400).json({ error: 'GrowID sudah terdaftar.' });
    }

    const playerData = {
        growId,
        password,
        registrationDate: new Date().toISOString(),
        registeredIp: clientIp
    };

    fs.writeFile(playerDataPath, JSON.stringify(playerData, null, 2), (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Gagal menyimpan data registrasi.' });
        }

        res.status(200).json({ message: 'Registrasi berhasil.' });
    });
});

// Halaman utama
app.get('/', function (req, res) {
    res.send('Hello World!');
});

// Jalankan server pada IP VPS dan port 17091
app.listen(17091, '206.189.89.205', function () {
    console.log('Listening on IP 206.189.89.205 and port 17091');
});
