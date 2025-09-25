import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise'; // async/await를 위한 promise 모듈

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터베이스 연결 설정
const db = mysql.createPool({
    host: 'localhost',      // MySQL 서버 주소
    user: 'root',           // 사용자명 (일반적으로 'root')
    password: '1234',           // 비밀번호 (설정된 비밀번호로 변경)
    database: 'child_alarm'    // 위에서 만든 데이터베이스 이름
});

// JSON 형식의 요청 본문을 파싱하기 위해 추가
app.use(express.json());

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/html', express.static(path.join(__dirname, 'html')));
app.use('/components', express.static(path.join(__dirname, 'components')));

// 알람 데이터 처리 API
app.get('/api/alarms', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, TIME_FORMAT(time, "%H:%i:%s") AS time FROM alarms ORDER BY date ASC, time ASC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching alarms:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/api/alarms', async (req, res) => {
    const { title, date, time } = req.body;
    try {
        const [result] = await db.query('INSERT INTO alarms (title, date, time) VALUES (?, ?, ?)', [title, date, time]);
        res.status(201).json({ id: result.insertId, title, date, time });
    } catch (err) {
        console.error('Error saving alarm:', err);
        res.status(500).send('Server Error');
    }
});

app.delete('/api/alarms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM alarms WHERE id = ?', [id]);
        res.status(200).send('Alarm deleted');
    } catch (err) {
        console.error('Error deleting alarm:', err);
        res.status(500).send('Server Error');
    }
});

// 회원가입
app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "signup.html"));
});
// 로그인
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "login.html"));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});