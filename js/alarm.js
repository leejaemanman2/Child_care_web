document.getElementById('setAlarm').addEventListener('click', () => {
    const timeInput = document.getElementById('alarmTime').value;
    if (!timeInput) return alert("시간을 선택하세요.");

    const [hours, minutes] = timeInput.split(':').map(Number);
    const now = new Date();
    const alarmTime = new Date();

    alarmTime.setHours(hours);
    alarmTime.setMinutes(minutes);
    alarmTime.setSeconds(0);

    if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const timeout = alarmTime - now;

    Notification.requestPermission().then(permission => {
        if (permission !== "granted") {
            alert("알림 권한을 허용해주세요.");
            return;
        }

        setTimeout(() => {
            new Notification("알림!", {
                body: `설정한 시간입니다: ${timeInput}`,
            });
        }, timeout);

        alert(`알람이 설정되었습니다: ${timeInput}`);
    });
});