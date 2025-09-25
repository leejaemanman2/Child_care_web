const alarmTitleInput = document.getElementById('alarmTitle');
const alarmDateInput = document.getElementById('alarmDate');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmBtn = document.getElementById('setAlarm');
const alarmList = document.getElementById('alarmList');

let alarms = [];

Notification.requestPermission();

// 알람 설정 로직을 함수로 분리
const setNewAlarm = (title, dateInput, timeInput) => {
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
    const span = document.createElement('span');
    span.textContent = `${dateInput} ${timeInput} - ${title}`;
    li.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '삭제';
    deleteBtn.classList.add('btn', 'delete');
    li.appendChild(deleteBtn);

    alarmList.appendChild(li);

    // 알림 예약
    alarmObj.timeoutId = setTimeout(() => {
        new Notification(title, {
            body: `설정한 시간입니다: ${dateInput} ${timeInput}`,
        });

        // 알람이 울린 후 다음 날 반복 여부 묻기
        const repeatAlarm = window.confirm(`'${title}' 알람이 완료되었습니다. 내일도 이 알람을 반복하시겠습니까?`);

        if (repeatAlarm) {
            const nextDay = new Date(alarmTime);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayDate = nextDay.toISOString().split('T')[0];
            const nextDayTime = timeInput;

            setNewAlarm(title, nextDayDate, nextDayTime);
        }

        li.remove();
        alarms = alarms.filter(a => a !== alarmObj);
    }, timeout);

    // 삭제 버튼 클릭 이벤트
    deleteBtn.addEventListener('click', () => {
        clearTimeout(alarmObj.timeoutId);
        li.remove();
        alarms = alarms.filter(a => a !== alarmObj);
    });
};

// 알람 추가 버튼 클릭 이벤트
setAlarmBtn.addEventListener('click', () => {
    const title = alarmTitleInput.value.trim() || "알림";
    const dateInput = alarmDateInput.value;
    const timeInput = alarmTimeInput.value;

    // 입력 초기화는 함수 내부에서 처리
    setNewAlarm(title, dateInput, timeInput);

    alarmTitleInput.value = '';
    alarmDateInput.value = '';
    alarmTimeInput.value = '';
});