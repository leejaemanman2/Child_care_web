const alarmTitleInput = document.getElementById('alarmTitle');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmBtn = document.getElementById('setAlarm');
const alarmList = document.getElementById('alarmList');

let alarms = [];

Notification.requestPermission();

setAlarmBtn.addEventListener('click', () => {
    const title = alarmTitleInput.value.trim() || "알림"; // 제목 없으면 기본 "알림"
    const timeInput = alarmTimeInput.value;
    if (!timeInput) return alert("시간을 선택하세요.");

    const [hours, minutes] = timeInput.split(':').map(Number);
    const now = new Date();
    const alarmTime = new Date();
    alarmTime.setHours(hours);
    alarmTime.setMinutes(minutes);
    alarmTime.setSeconds(0);
    if (alarmTime <= now) alarmTime.setDate(alarmTime.getDate() + 1);

    const timeout = alarmTime - now;

    const alarmObj = { title, time: timeInput, timeoutId: null };
    alarms.push(alarmObj);

    // 화면에 표시
    const li = document.createElement('li');
    li.textContent = `${timeInput} - ${title}`;
    alarmList.appendChild(li);

    // 알림 예약
    alarmObj.timeoutId = setTimeout(() => {
        new Notification(title, {
            body: `설정한 시간입니다: ${timeInput}`,
        });
        // 알람 끝나면 리스트에서 제거
        li.remove();
        alarms = alarms.filter(a => a !== alarmObj);
    }, timeout);

    // 입력 초기화
    alarmTitleInput.value = '';
    alarmTimeInput.value = '';
});
