const alarmTitleInput = document.getElementById('alarmTitle');
const alarmDateInput = document.getElementById('alarmDate');
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmBtn = document.getElementById('setAlarm');
const alarmList = document.getElementById('alarmList');

Notification.requestPermission();

// 알람 목록을 서버에서 불러와 화면에 표시하는 함수
const loadAlarms = async () => {
    try {
        const response = await fetch('/api/alarms');
        const alarms = await response.json();

        alarmList.innerHTML = ''; // 기존 목록 초기화
        alarms.forEach(alarm => {
            createAlarmListItem(alarm);
        });
    } catch (error) {
        console.error('Failed to load alarms:', error);
    }
};

// 알람 목록 항목(li)을 생성하고 알림을 예약하는 함수
const createAlarmListItem = (alarm) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = `${alarm.date} ${alarm.time} - ${alarm.title}`;
    li.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '삭제';
    deleteBtn.classList.add('btn', 'delete');
    li.appendChild(deleteBtn);

    alarmList.appendChild(li);

    // 알림 예약
    const alarmTime = new Date(`${alarm.date}T${alarm.time}`);
    const now = new Date();
    const timeout = alarmTime.getTime() - now.getTime();

    // 미래의 알람일 경우에만 setTimeout 실행
    if (timeout > 0) {
        alarm.timeoutId = setTimeout(async () => {
            new Notification(alarm.title, {
                body: `설정한 시간입니다: ${alarm.date} ${alarm.time}`,
            });

            // 알람이 울린 후 다음 날 반복 여부 묻기
            const repeatAlarm = window.confirm(`'${alarm.title}' 알람이 완료되었습니다. 내일도 이 알람을 반복하시겠습니까?`);

            if (repeatAlarm) {
                const nextDay = new Date(alarmTime);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayDate = nextDay.toISOString().split('T')[0];
                const nextDayTime = alarm.time;

                addAlarmToDB(alarm.title, nextDayDate, nextDayTime);
            } else {
                // 사용자가 반복을 원하지 않으면 데이터베이스에서도 삭제
                await fetch(`/api/alarms/${alarm.id}`, { method: 'DELETE' });
            }

            // 알람이 울린 후 목록에서 제거
            li.remove();
        }, timeout);
    }

    // 삭제 버튼 클릭 이벤트
    deleteBtn.addEventListener('click', async () => {
        await fetch(`/api/alarms/${alarm.id}`, { method: 'DELETE' });
        li.remove();
    });
};

// 새로운 알람을 데이터베이스에 추가하는 함수
const addAlarmToDB = async (title, dateInput, timeInput) => {
    const response = await fetch('/api/alarms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: dateInput, time: timeInput })
    });

    if (response.ok) {
        // loadAlarms() 대신 새로운 알람만 추가
        const newAlarm = await response.json();
        createAlarmListItem(newAlarm);
    } else {
        alert('알람 추가 실패');
    }
};

// 페이지 로드 시 기존 알람 불러오기
document.addEventListener('DOMContentLoaded', loadAlarms);

// 알람 추가 버튼 클릭 이벤트
setAlarmBtn.addEventListener('click', () => {
    const title = alarmTitleInput.value.trim() || "알림";
    const dateInput = alarmDateInput.value;
    const timeInput = alarmTimeInput.value;

    if (!dateInput || !timeInput) return alert("날짜와 시간을 모두 선택하세요.");

    addAlarmToDB(title, dateInput, timeInput);

    // 입력 초기화
    alarmTitleInput.value = '';
    alarmDateInput.value = '';
    alarmTimeInput.value = '';
});