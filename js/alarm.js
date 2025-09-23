const alarmTitleInput = document.getElementById('alarmTitle');
const alarmDateInput = document.getElementById('alarmDate');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmBtn = document.getElementById('setAlarm');
const alarmList = document.getElementById('alarmList');

let alarms = [];

Notification.requestPermission();

setAlarmBtn.addEventListener('click', () => {
    const title = alarmTitleInput.value.trim() || "알림";
    const dateInput = alarmDateInput.value;
    const timeInput = alarmTimeInput.value;
    if (!dateInput || !timeInput) return alert("날짜와 시간을 모두 선택하세요.");

    const [year, month, day] = dateInput.split('-').map(Number);
    const [hours, minutes] = timeInput.split(':').map(Number);

    const now = new Date();
    const alarmTime = new Date(year, month - 1, day, hours, minutes, 0);

    if (alarmTime <= now) return alert("선택한 시간이 현재보다 이전입니다.");

    const timeout = alarmTime - now;

    const alarmObj = { title, date: dateInput, time: timeInput, timeoutId: null };
    alarms.push(alarmObj);

    // 화면에 표시
    const li = document.createElement('li');
    li.textContent = `${dateInput} ${timeInput} - ${title}`;
    alarmList.appendChild(li);

    // 알림 예약
    alarmObj.timeoutId = setTimeout(() => {
        new Notification(title, {
            body: `설정한 시간입니다: ${dateInput} ${timeInput}`,
        });
        li.remove();
        alarms = alarms.filter(a => a !== alarmObj);
    }, timeout);

    // 입력 초기화
    alarmTitleInput.value = '';
    alarmDateInput.value = '';
    alarmTimeInput.value = '';
});
