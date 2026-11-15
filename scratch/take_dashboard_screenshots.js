const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const target = tabs.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise(r => ws.onopen = r);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    // 1. Set Desktop Viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await send('Page.navigate', { url: 'http://localhost:3000' });
    await new Promise(r => setTimeout(r, 1500));

    // Populate actual representative student data structure
    const initScript = `
      (function() {
        appState.user = { regNo: '40110001', name: 'ALEXANDER J', department: 'Computer Science and Engineering', semester: '4' };
        appState.data = {
          studentDetails: {
            name: 'ALEXANDER J',
            regNo: '40110001',
            department: 'Computer Science and Engineering',
            programme: 'B.E. Computer Science and Engineering',
            semester: '4',
            section: 'A',
            batch: '2024-2028',
            school: 'School of Computing',
            currentYear: 'Year 2',
            yearDisplay: 'II Year',
            email: 'alexander.40110001@sathyabama.ac.in',
            mobile: '9876543210',
            dob: '15/08/2005',
            gender: 'Male',
            bloodGroup: 'O+ve'
          },
          attendanceSummary: {
            overallPercentage: 88.5,
            totalDays: 62,
            totalPresent: 55,
            totalAbsent: 7,
            dailyLogs: [
              { date: '2026-03-02', status: 'Present', session: 'Full Day' },
              { date: '2026-03-03', status: 'Present', session: 'Full Day' },
              { date: '2026-03-04', status: 'Present', session: 'Full Day' },
              { date: '2026-03-05', status: 'Absent', session: 'Full Day' }
            ]
          },
          caeResults: {
            cgpa: '8.72',
            currentGpa: '8.90',
            arrearDetails: { totalArrears: 0, clearedArrears: 0, history: [] },
            cae1: [
              { code: 'SMTB1302', name: 'Discrete Mathematics and Numerical Methods', maxMarks: 50, marksObtained: 44, status: 'PASS' },
              { code: 'SCSB1301', name: 'Computer Architecture and Organization', maxMarks: 50, marksObtained: 46, status: 'PASS' },
              { code: 'SCSB1303', name: 'Theory of Computation', maxMarks: 50, marksObtained: 41, status: 'PASS' },
              { code: 'SISB4301', name: 'Universal Human Values', maxMarks: 50, marksObtained: 48, status: 'PASS' }
            ],
            cae2: [
              { code: 'SMTB1302', name: 'Discrete Mathematics and Numerical Methods', maxMarks: 50, marksObtained: 46, status: 'PASS' },
              { code: 'SCSB1301', name: 'Computer Architecture and Organization', maxMarks: 50, marksObtained: 45, status: 'PASS' },
              { code: 'SCSB1303', name: 'Theory of Computation', maxMarks: 50, marksObtained: 43, status: 'PASS' },
              { code: 'SISB4301', name: 'Universal Human Values', maxMarks: 50, marksObtained: 49, status: 'PASS' }
            ]
          },
          timetable: {
            schedule: {
              Monday: [
                { SubjectCode: 'SMTB1302', SubjectName: 'Discrete Mathematics and Numerical Methods', StaffName: 'Dr. M Prem Kumar', TimeFrom: '08:30', TimeTo: '09:20', type: 'Theory', isLab: false },
                { SubjectCode: 'SCSB1301', SubjectName: 'Computer Architecture and Organization', StaffName: 'Ms. Madhushri K', TimeFrom: '09:20', TimeTo: '10:10', type: 'Theory', isLab: false },
                { SubjectCode: 'SCSB1303', SubjectName: 'Theory of Computation', StaffName: 'Dr. Nancy Noella', TimeFrom: '10:30', TimeTo: '11:20', type: 'Theory', isLab: false },
                { SubjectCode: 'S13BLH21', SubjectName: 'Digital Logic Circuits Lab', StaffName: 'Dr. R Bhavani', TimeFrom: '11:20', TimeTo: '13:00', type: 'Practical', isLab: true }
              ],
              Tuesday: [
                { SubjectCode: 'SCSB1303', SubjectName: 'Theory of Computation', StaffName: 'Dr. Nancy Noella', TimeFrom: '08:30', TimeTo: '09:20', type: 'Theory', isLab: false },
                { SubjectCode: 'SMTB1302', SubjectName: 'Discrete Mathematics and Numerical Methods', StaffName: 'Dr. M Prem Kumar', TimeFrom: '09:20', TimeTo: '10:10', type: 'Theory', isLab: false }
              ]
            },
            subjectsDirectory: [
              { subjectCode: 'SMTB1302', subjectName: 'Discrete Mathematics and Numerical Methods', type: 'Theory', isLab: false },
              { subjectCode: 'SCSB1301', subjectName: 'Computer Architecture and Organization', type: 'Theory', isLab: false },
              { subjectCode: 'SCSB1303', subjectName: 'Theory of Computation', type: 'Theory', isLab: false },
              { subjectCode: 'SISB4301', subjectName: 'Universal Human Values', type: 'Theory', isLab: false },
              { subjectCode: 'S13BLH21', subjectName: 'Digital Logic Circuits Lab', type: 'Practical', isLab: true }
            ]
          }
        };

        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.body.classList.add('dashboard-active');
        renderHeader();
        setTab('overview');
      })();
    `;

    await send('Runtime.evaluate', { expression: initScript });
    await new Promise(r => setTimeout(r, 800));

    // Capture 1: Dashboard Overview Desktop (Dark)
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/dashboard-overview-desktop.png', Buffer.from(shot1.data, 'base64'));
    console.log('Saved screenshots/dashboard-overview-desktop.png');

    // Capture 2: Dashboard Overview Desktop (Light Theme)
    await send('Runtime.evaluate', { expression: `toggleTheme();` });
    await new Promise(r => setTimeout(r, 600));
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/dashboard-overview-light.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved screenshots/dashboard-overview-light.png');

    // Revert to dark theme
    await send('Runtime.evaluate', { expression: `toggleTheme();` });
    await new Promise(r => setTimeout(r, 300));

    // Capture 3: Dashboard Attendance View
    await send('Runtime.evaluate', { expression: `setTab('attendance');` });
    await new Promise(r => setTimeout(r, 800));
    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/dashboard-attendance-desktop.png', Buffer.from(shot3.data, 'base64'));
    console.log('Saved screenshots/dashboard-attendance-desktop.png');

    // Capture 4: Dashboard Timetable View
    await send('Runtime.evaluate', { expression: `setTab('timetable');` });
    await new Promise(r => setTimeout(r, 800));
    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/dashboard-timetable-desktop.png', Buffer.from(shot4.data, 'base64'));
    console.log('Saved screenshots/dashboard-timetable-desktop.png');

    // Capture 5: Mobile Dashboard
    await send('Runtime.evaluate', { expression: `setTab('overview');` });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 800));
    const shot5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('screenshots/dashboard-overview-mobile.png', Buffer.from(shot5.data, 'base64'));
    console.log('Saved screenshots/dashboard-overview-mobile.png');

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
